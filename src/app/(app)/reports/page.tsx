"use client";

import { useEffect, useState } from "react";
import { FileText, Download } from "lucide-react";
import { Card, LoadingBlock, EmptyState, Badge } from "@/components/ui/Primitives";
import { api } from "@/lib/api-client";
import { formatKg, formatDate } from "@/lib/utils";

export default function ReportsPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<any>("/api/v1/reports/summary")
      .then(setReport)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingBlock label="Generating report..." />;
  if (error) return <EmptyState title="Could not load report" description={error} />;

  const { summary } = report;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-charcoal-900">
            <FileText size={22} className="text-forest-600" /> Reports
          </h1>
          <p className="text-sm text-charcoal-500">Generated {new Date(report.generatedAt).toLocaleString()}</p>
        </div>
        <a
          href="/api/v1/reports/export"
          className="inline-flex items-center gap-2 rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800"
        >
          <Download size={15} /> Export CSV
        </a>
      </div>

      {!summary.hasData ? (
        <EmptyState title="No data available." description="Upload waste data to generate a report." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <p className="text-xs text-charcoal-400">Total Waste</p>
              <p className="mt-1 text-xl font-semibold">{formatKg(summary.totalWaste)}</p>
            </Card>
            <Card>
              <p className="text-xs text-charcoal-400">Food Waste</p>
              <p className="mt-1 text-xl font-semibold">{formatKg(summary.foodWaste)}</p>
            </Card>
            <Card>
              <p className="text-xs text-charcoal-400">Recyclable Waste</p>
              <p className="mt-1 text-xl font-semibold">{formatKg(summary.recyclableWaste)}</p>
            </Card>
            <Card>
              <p className="text-xs text-charcoal-400">Anomalies Detected</p>
              <p className="mt-1 text-xl font-semibold">{report.anomalyCount}</p>
            </Card>
          </div>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Category Breakdown</h3>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-forest-100 text-xs uppercase text-charcoal-400">
                <tr>
                  <th className="py-2">Category</th>
                  <th className="py-2">Total (kg)</th>
                  <th className="py-2">Share</th>
                </tr>
              </thead>
              <tbody>
                {report.categories.map((c: any) => (
                  <tr key={c.category} className="border-b border-forest-50">
                    <td className="py-2">{c.category}</td>
                    <td className="py-2">{c.totalKg}</td>
                    <td className="py-2">{c.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Location Breakdown</h3>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-forest-100 text-xs uppercase text-charcoal-400">
                <tr>
                  <th className="py-2">Location</th>
                  <th className="py-2">Total (kg)</th>
                </tr>
              </thead>
              <tbody>
                {report.locations.map((l: any) => (
                  <tr key={l.locationId} className="border-b border-forest-50">
                    <td className="py-2">{l.locationName}</td>
                    <td className="py-2">{l.totalKg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Forecast Summary</h3>
            {report.forecast.status === "ok" ? (
              <p className="text-sm text-charcoal-600">
                Model: {report.forecast.chosenModel.replace(/_/g, " ")}. Next 7 days projected total:{" "}
                {report.forecast.forecast.reduce((a: number, b: any) => a + b.predictedKg, 0).toFixed(1)} kg.
              </p>
            ) : (
              <p className="text-sm text-charcoal-500">{report.forecast.message}</p>
            )}
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Recent Anomalies</h3>
            {report.anomalies.length === 0 ? (
              <p className="text-sm text-charcoal-500">No anomalies available.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {report.anomalies.map((a: any, i: number) => (
                  <li key={i} className="flex items-center justify-between border-b border-forest-50 pb-2">
                    <span>
                      {formatDate(a.date)} · {a.locationName} · {a.category}
                    </span>
                    <Badge tone="warning">{a.severity}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Recommendations</h3>
            {report.recommendations.length === 0 ? (
              <p className="text-sm text-charcoal-500">No recommendations yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {report.recommendations.map((r: any) => (
                  <li key={r.id} className="border-b border-forest-50 pb-2">
                    <span className="font-medium text-forest-800">{r.recommendationText}</span>{" "}
                    <Badge tone="neutral">{r.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
