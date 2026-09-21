"use client";

import { useEffect, useState } from "react";
import { Card, LoadingBlock, EmptyState, Badge } from "@/components/ui/Primitives";
import { AnomalyTimelineChart } from "@/components/charts/AnomalyTimelineChart";
import { api } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";

const SEVERITY_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
  Low: "info",
  Moderate: "warning",
  High: "danger",
  Critical: "danger",
};

export default function AnomaliesPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState("");

  useEffect(() => {
    api
      .get<any>("/api/v1/anomalies")
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const anomalies = (data?.anomalies ?? []).filter((a: any) => !severityFilter || a.severity === severityFilter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal-900">Anomaly Detection</h1>
          <p className="text-sm text-charcoal-500">
            Detected using IQR, Z-score, and Isolation Forest methods against your organization's historical waste
            patterns.
          </p>
        </div>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} className="rounded-lg border border-forest-200 bg-white px-3 py-1.5 text-sm">
          <option value="">All severities</option>
          {["Low", "Moderate", "High", "Critical"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {loading && <LoadingBlock label="Detecting anomalies..." />}
      {error && <EmptyState title="Could not load anomalies" description={error} />}

      {!loading && !error && anomalies.length === 0 && (
        <EmptyState
          title="No anomalies available."
          description="Either no anomalies have been detected yet, or there isn't enough historical data per location/category (at least 8 records needed) to establish a reliable baseline."
        />
      )}

      {!loading && !error && anomalies.length > 0 && (
        <>
          <Card>
            <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Anomaly Timeline</h3>
            <AnomalyTimelineChart anomalies={anomalies} />
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-forest-100 text-xs uppercase tracking-wide text-charcoal-400">
                  <tr>
                    <th className="py-2">Date</th>
                    <th className="py-2">Location</th>
                    <th className="py-2">Category</th>
                    <th className="py-2">Observed</th>
                    <th className="py-2">Expected Range</th>
                    <th className="py-2">Deviation</th>
                    <th className="py-2">Methods</th>
                    <th className="py-2">Severity</th>
                  </tr>
                </thead>
                <tbody>
                  {anomalies.map((a: any, i: number) => (
                    <tr key={i} className="border-b border-forest-50">
                      <td className="py-2.5">{formatDate(a.date)}</td>
                      <td className="py-2.5">{a.locationName}</td>
                      <td className="py-2.5">{a.category}</td>
                      <td className="py-2.5 font-medium text-charcoal-900">{a.observedKg} kg</td>
                      <td className="py-2.5 text-charcoal-500">
                        {a.expectedLow} – {a.expectedHigh} kg
                      </td>
                      <td className="py-2.5">
                        {a.deviation > 0 ? "+" : ""}
                        {a.deviation} kg
                      </td>
                      <td className="py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {a.methods.map((m: string) => (
                            <Badge key={m} tone="neutral">
                              {m}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5">
                        <Badge tone={SEVERITY_TONE[a.severity] ?? "neutral"}>{a.severity}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
