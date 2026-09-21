import { db } from "@/db";
import { wasteRecords, locations } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { mean, stddev, quantile, round } from "./stats";

export interface AnomalyRecord {
  locationId: string;
  locationName: string;
  category: string;
  date: string;
  observedKg: number;
  expectedLow: number;
  expectedHigh: number;
  deviation: number;
  methods: string[];
  severity: "Low" | "Moderate" | "High" | "Critical";
}

// A lightweight from-scratch Isolation Forest: builds random partition
// trees and derives an anomaly score from the average isolation depth.
function isolationForestScores(values: number[], numTrees = 60): number[] {
  if (values.length < 4) return values.map(() => 0);

  function pathLength(value: number, sample: number[], depth: number, maxDepth: number): number {
    if (depth >= maxDepth || sample.length <= 1) return depth;
    const min = Math.min(...sample);
    const max = Math.max(...sample);
    if (min === max) return depth;
    const splitPoint = min + Math.random() * (max - min);
    const left = sample.filter((v) => v < splitPoint);
    const right = sample.filter((v) => v >= splitPoint);
    if (value < splitPoint) return pathLength(value, left.length ? left : sample, depth + 1, maxDepth);
    return pathLength(value, right.length ? right : sample, depth + 1, maxDepth);
  }

  const maxDepth = Math.ceil(Math.log2(Math.max(values.length, 2)));
  const avgPathLengths = values.map((v) => {
    let total = 0;
    for (let t = 0; t < numTrees; t++) {
      const sampleSize = Math.min(values.length, 32);
      const sample: number[] = [];
      for (let i = 0; i < sampleSize; i++) sample.push(values[Math.floor(Math.random() * values.length)]);
      total += pathLength(v, sample, 0, maxDepth * 2);
    }
    return total / numTrees;
  });

  const c = 2 * (Math.log(values.length - 1) + 0.5772) - (2 * (values.length - 1)) / values.length;
  return avgPathLengths.map((h) => Math.pow(2, -h / (c || 1)));
}

function severityFromDeviation(deviationRatio: number): AnomalyRecord["severity"] {
  if (deviationRatio >= 2) return "Critical";
  if (deviationRatio >= 1.25) return "High";
  if (deviationRatio >= 0.6) return "Moderate";
  return "Low";
}

export async function detectAnomalies(organizationId: string): Promise<AnomalyRecord[]> {
  const rows = await db
    .select({
      id: wasteRecords.id,
      locationId: wasteRecords.locationId,
      locationName: locations.name,
      category: wasteRecords.wasteCategory,
      date: wasteRecords.date,
      quantityKg: wasteRecords.quantityKg,
    })
    .from(wasteRecords)
    .innerJoin(locations, eq(wasteRecords.locationId, locations.id))
    .where(eq(wasteRecords.organizationId, organizationId));

  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = `${r.locationId}::${r.category}`;
    const arr = groups.get(key) ?? [];
    arr.push(r);
    groups.set(key, arr);
  }

  const results: AnomalyRecord[] = [];

  for (const [, groupRows] of groups) {
    if (groupRows.length < 8) continue; // not enough history for a reliable baseline

    const values = groupRows.map((r) => r.quantityKg);
    const sorted = [...values].sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const iqrLow = q1 - 1.5 * iqr;
    const iqrHigh = q3 + 1.5 * iqr;

    const m = mean(values);
    const sd = stddev(values) || 1;

    const isoScores = isolationForestScores(values);

    groupRows.forEach((r, idx) => {
      const flaggedMethods: string[] = [];
      if (r.quantityKg < iqrLow || r.quantityKg > iqrHigh) flaggedMethods.push("IQR");

      const z = (r.quantityKg - m) / sd;
      if (Math.abs(z) > 2.5) flaggedMethods.push("Z-score");

      if (isoScores[idx] > 0.68) flaggedMethods.push("Isolation Forest");

      // Require corroboration across at least two independent methods, or a
      // single very strong statistical signal, to avoid over-flagging normal
      // day-to-day variation (isolation forest alone is noisy on small samples).
      const isAnomaly = flaggedMethods.length >= 2 || Math.abs(z) > 3.5;

      if (isAnomaly) {
        const deviationRatio = sd > 0 ? Math.abs(r.quantityKg - m) / sd : 0;
        results.push({
          locationId: r.locationId,
          locationName: r.locationName,
          category: r.category,
          date: r.date,
          observedKg: round(r.quantityKg, 2),
          expectedLow: round(Math.max(0, m - sd), 2),
          expectedHigh: round(m + sd, 2),
          deviation: round(r.quantityKg - m, 2),
          methods: flaggedMethods,
          severity: severityFromDeviation(deviationRatio),
        });
      }
    });
  }

  return results.sort((a, b) => (a.date < b.date ? 1 : -1));
}
