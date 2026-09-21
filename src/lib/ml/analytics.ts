import { db } from "@/db";
import { wasteRecords, locations } from "@/db/schema";
import { and, eq, gte, lte } from "drizzle-orm";
import { round } from "./stats";

export interface WasteFilters {
  organizationId: string;
  startDate?: string;
  endDate?: string;
  locationId?: string;
  category?: string;
}

// people_count / meals_served are recorded once per (date, location) but the
// underlying rows repeat that same figure once per waste category. Summing
// them naively would inflate headcount by the number of categories, so we
// dedupe by (date, locationId) before aggregating footfall-based metrics.
function sumUniqueHeadcount<T extends { date: string; locationId: string; peopleCount: number | null; mealsServed: number | null }>(
  rows: T[],
): { totalPeople: number; totalMeals: number } {
  const seen = new Map<string, { peopleCount: number; mealsServed: number }>();
  for (const r of rows) {
    const key = `${r.date}::${r.locationId}`;
    if (!seen.has(key)) {
      seen.set(key, { peopleCount: r.peopleCount ?? 0, mealsServed: r.mealsServed ?? 0 });
    }
  }
  let totalPeople = 0;
  let totalMeals = 0;
  for (const v of seen.values()) {
    totalPeople += v.peopleCount;
    totalMeals += v.mealsServed;
  }
  return { totalPeople, totalMeals };
}

async function fetchRecords(filters: WasteFilters) {
  const conditions = [eq(wasteRecords.organizationId, filters.organizationId)];
  if (filters.startDate) conditions.push(gte(wasteRecords.date, filters.startDate));
  if (filters.endDate) conditions.push(lte(wasteRecords.date, filters.endDate));
  if (filters.locationId) conditions.push(eq(wasteRecords.locationId, filters.locationId));
  if (filters.category) conditions.push(eq(wasteRecords.wasteCategory, filters.category));

  return db
    .select({
      id: wasteRecords.id,
      date: wasteRecords.date,
      locationId: wasteRecords.locationId,
      locationName: locations.name,
      category: wasteRecords.wasteCategory,
      quantityKg: wasteRecords.quantityKg,
      peopleCount: wasteRecords.peopleCount,
      mealsServed: wasteRecords.mealsServed,
      eventFlag: wasteRecords.eventFlag,
      isDemo: wasteRecords.isDemo,
    })
    .from(wasteRecords)
    .innerJoin(locations, eq(wasteRecords.locationId, locations.id))
    .where(and(...conditions));
}

export async function getAnalyticsSummary(filters: WasteFilters) {
  const rows = await fetchRecords(filters);
  if (rows.length === 0) {
    return { hasData: false as const };
  }

  const totalWaste = rows.reduce((a, b) => a + b.quantityKg, 0);
  const foodWaste = rows.filter((r) => r.category === "Food").reduce((a, b) => a + b.quantityKg, 0);
  const recyclableCategories = ["Paper", "Plastic", "Glass", "Metal"];
  const recyclableWaste = rows
    .filter((r) => recyclableCategories.includes(r.category))
    .reduce((a, b) => a + b.quantityKg, 0);

  const dates = Array.from(new Set(rows.map((r) => r.date))).sort();
  const midpoint = Math.floor(dates.length / 2) || 1;
  const firstHalfDates = new Set(dates.slice(0, midpoint));
  const secondHalfDates = new Set(dates.slice(midpoint));

  const firstHalfTotal = rows
    .filter((r) => firstHalfDates.has(r.date))
    .reduce((a, b) => a + b.quantityKg, 0);
  const secondHalfTotal = rows
    .filter((r) => secondHalfDates.has(r.date))
    .reduce((a, b) => a + b.quantityKg, 0);

  const trendPercent =
    firstHalfTotal > 0 ? round(((secondHalfTotal - firstHalfTotal) / firstHalfTotal) * 100, 1) : 0;

  const { totalPeople } = sumUniqueHeadcount(rows);
  const wastePerPerson = totalPeople > 0 ? round(totalWaste / totalPeople, 3) : null;

  const isDemo = rows.some((r) => r.isDemo);

  return {
    hasData: true as const,
    isDemo,
    totalWaste: round(totalWaste, 2),
    foodWaste: round(foodWaste, 2),
    recyclableWaste: round(recyclableWaste, 2),
    otherWaste: round(totalWaste - foodWaste - recyclableWaste, 2),
    trendPercent,
    wastePerPerson,
    recordCount: rows.length,
    daySpan: dates.length,
    dateRange: dates.length ? { start: dates[0], end: dates[dates.length - 1] } : null,
  };
}

export async function getTrend(filters: WasteFilters, granularity: "daily" | "weekly" | "monthly") {
  const rows = await fetchRecords(filters);
  const buckets = new Map<string, number>();

  for (const r of rows) {
    let key = r.date;
    if (granularity === "weekly") {
      const d = new Date(r.date + "T00:00:00Z");
      const day = d.getUTCDay();
      const monday = new Date(d);
      monday.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
      key = monday.toISOString().slice(0, 10);
    } else if (granularity === "monthly") {
      key = r.date.slice(0, 7);
    }
    buckets.set(key, (buckets.get(key) ?? 0) + r.quantityKg);
  }

  return Array.from(buckets.entries())
    .map(([period, total]) => ({ period, totalKg: round(total, 2) }))
    .sort((a, b) => (a.period < b.period ? -1 : 1));
}

export async function getCategoryBreakdown(filters: WasteFilters) {
  const rows = await fetchRecords(filters);
  const buckets = new Map<string, number>();
  for (const r of rows) buckets.set(r.category, (buckets.get(r.category) ?? 0) + r.quantityKg);
  const total = rows.reduce((a, b) => a + b.quantityKg, 0);

  return Array.from(buckets.entries())
    .map(([category, totalKg]) => ({
      category,
      totalKg: round(totalKg, 2),
      percentage: total > 0 ? round((totalKg / total) * 100, 1) : 0,
    }))
    .sort((a, b) => b.totalKg - a.totalKg);
}

export async function getLocationBreakdown(filters: WasteFilters) {
  const rows = await fetchRecords(filters);
  const buckets = new Map<string, { name: string; total: number; rows: typeof rows }>();
  for (const r of rows) {
    const entry = buckets.get(r.locationId) ?? { name: r.locationName, total: 0, rows: [] as typeof rows };
    entry.total += r.quantityKg;
    entry.rows.push(r);
    buckets.set(r.locationId, entry);
  }

  return Array.from(buckets.entries())
    .map(([locationId, v]) => {
      const { totalPeople } = sumUniqueHeadcount(v.rows);
      return {
        locationId,
        locationName: v.name,
        totalKg: round(v.total, 2),
        wastePerPerson: totalPeople > 0 ? round(v.total / totalPeople, 3) : null,
      };
    })
    .sort((a, b) => b.totalKg - a.totalKg);
}

export async function getIntensity(filters: WasteFilters) {
  const rows = await fetchRecords(filters);
  const { totalPeople, totalMeals } = sumUniqueHeadcount(rows);

  const days = new Set(rows.map((r) => r.date)).size;
  const totalWaste = rows.reduce((a, b) => a + b.quantityKg, 0);

  return {
    hasData: rows.length > 0,
    wastePerPerson: totalPeople > 0 ? round(totalWaste / totalPeople, 3) : null,
    wastePerMeal: totalMeals > 0 ? round(totalWaste / totalMeals, 3) : null,
    wastePerOperatingDay: days > 0 ? round(totalWaste / days, 2) : null,
  };
}

export async function getHotspots(filters: WasteFilters) {
  const rows = await fetchRecords(filters);
  if (rows.length === 0) return { hasData: false as const };

  function topBy(category?: string) {
    const filtered = category ? rows.filter((r) => r.category === category) : rows;
    const buckets = new Map<string, { name: string; total: number }>();
    for (const r of filtered) {
      const entry = buckets.get(r.locationId) ?? { name: r.locationName, total: 0 };
      entry.total += r.quantityKg;
      buckets.set(r.locationId, entry);
    }
    return Array.from(buckets.entries())
      .map(([locationId, v]) => ({ locationId, locationName: v.name, totalKg: round(v.total, 2) }))
      .sort((a, b) => b.totalKg - a.totalKg)
      .slice(0, 5);
  }

  return {
    hasData: true as const,
    overall: topBy(),
    food: topBy("Food"),
    plastic: topBy("Plastic"),
    paper: topBy("Paper"),
    eWaste: topBy("E-Waste"),
  };
}
