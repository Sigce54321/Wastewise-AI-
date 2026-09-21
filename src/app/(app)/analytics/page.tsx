"use client";

import { useEffect, useState } from "react";
import { Card, LoadingBlock, EmptyState, Badge } from "@/components/ui/Primitives";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { CategoryPieChart } from "@/components/charts/CategoryPieChart";
import { LocationBarChart } from "@/components/charts/LocationBarChart";
import { api } from "@/lib/api-client";
import { formatKg } from "@/lib/utils";

export default function AnalyticsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [locationFilter, setLocationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [summary, setSummary] = useState<any>(null);
  const [trend, setTrend] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locationBreakdown, setLocationBreakdown] = useState<any[]>([]);
  const [intensity, setIntensity] = useState<any>(null);
  const [hotspots, setHotspots] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<any[]>("/api/v1/organizations/locations").then(setLocations).catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams();
    if (locationFilter) qs.set("locationId", locationFilter);
    if (categoryFilter) qs.set("category", categoryFilter);

    Promise.all([
      api.get<any>(`/api/v1/analytics/summary?${qs}`),
      api.get<any>(`/api/v1/analytics/trends?granularity=${granularity}&${qs}`),
      api.get<any[]>(`/api/v1/analytics/categories?${qs}`),
      api.get<any[]>(`/api/v1/analytics/locations?${qs}`),
      api.get<any>(`/api/v1/analytics/intensity?${qs}`),
      api.get<any>("/api/v1/analytics/hotspots"),
    ])
      .then(([s, t, c, l, i, h]) => {
        if (cancelled) return;
        setSummary(s);
        setTrend(t.points);
        setCategories(c);
        setLocationBreakdown(l);
        setIntensity(i);
        setHotspots(h);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [granularity, locationFilter, categoryFilter]);

  const categoryOptions = ["Food", "Paper", "Plastic", "Glass", "Metal", "E-Waste", "Other"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal-900">Analytics</h1>
          <p className="text-sm text-charcoal-500">Category, location, and intensity analytics from your data.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="rounded-lg border border-forest-200 bg-white px-3 py-1.5 text-sm">
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-forest-200 bg-white px-3 py-1.5 text-sm">
            <option value="">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="flex rounded-lg border border-forest-200 bg-white p-0.5 text-sm">
            {(["daily", "weekly", "monthly"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGranularity(g)}
                className={`rounded-md px-2.5 py-1 capitalize ${granularity === g ? "bg-forest-700 text-white" : "text-charcoal-600"}`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && <LoadingBlock label="Analyzing waste data..." />}
      {error && <EmptyState title="Could not load analytics" description={error} />}

      {!loading && !error && summary && !summary.hasData && (
        <EmptyState title="No data available." description="Upload waste data to see analytics for this scope." />
      )}

      {!loading && !error && summary?.hasData && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card>
              <p className="text-xs font-medium text-charcoal-400">Total Waste</p>
              <p className="mt-1 text-xl font-semibold text-charcoal-900">{formatKg(summary.totalWaste)}</p>
            </Card>
            <Card>
              <p className="text-xs font-medium text-charcoal-400">Waste / Person</p>
              <p className="mt-1 text-xl font-semibold text-charcoal-900">{intensity?.wastePerPerson ?? "—"} {intensity?.wastePerPerson ? "kg" : ""}</p>
            </Card>
            <Card>
              <p className="text-xs font-medium text-charcoal-400">Waste / Meal</p>
              <p className="mt-1 text-xl font-semibold text-charcoal-900">{intensity?.wastePerMeal ?? "—"} {intensity?.wastePerMeal ? "kg" : ""}</p>
            </Card>
            <Card>
              <p className="text-xs font-medium text-charcoal-400">Waste / Operating Day</p>
              <p className="mt-1 text-xl font-semibold text-charcoal-900">{formatKg(intensity?.wastePerOperatingDay)}</p>
            </Card>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Waste Trend ({granularity})</h3>
              {trend.length > 0 ? <TrendLineChart points={trend} /> : <EmptyState title="No trend data" description="Not enough data points." />}
            </Card>
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Category Analysis</h3>
              {categories.length > 0 ? <CategoryPieChart data={categories} /> : <EmptyState title="No category data" description="Upload data to see categories." />}
            </Card>
            <Card className="lg:col-span-2">
              <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Location Analysis</h3>
              {locationBreakdown.length > 0 ? (
                <LocationBarChart data={locationBreakdown} />
              ) : (
                <EmptyState title="No location data" description="Upload data to compare locations." />
              )}
            </Card>
          </div>

          {hotspots?.hasData && (
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Hotspot Analysis</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <HotspotList title="Overall" items={hotspots.overall} />
                <HotspotList title="Food" items={hotspots.food} />
                <HotspotList title="Plastic" items={hotspots.plastic} />
                <HotspotList title="E-Waste" items={hotspots.eWaste} />
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function HotspotList({ title, items }: { title: string; items: { locationName: string; totalKg: number }[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal-400">{title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-charcoal-400">No data</p>
      ) : (
        <ol className="space-y-1.5">
          {items.map((i, idx) => (
            <li key={i.locationName} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-charcoal-700">
                <Badge tone={idx === 0 ? "danger" : "neutral"}>{idx + 1}</Badge> {i.locationName}
              </span>
              <span className="font-medium text-charcoal-900">{i.totalKg} kg</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
