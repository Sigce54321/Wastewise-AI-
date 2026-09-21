"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, Utensils, Recycle, TrendingDown, ShieldAlert, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api-client";
import { Card, StatCard, LoadingBlock, EmptyState, Badge } from "@/components/ui/Primitives";
import { TrendLineChart } from "@/components/charts/TrendLineChart";
import { CategoryPieChart } from "@/components/charts/CategoryPieChart";
import { LocationBarChart } from "@/components/charts/LocationBarChart";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { formatKg } from "@/lib/utils";

interface DashboardData {
  summary: any;
  trend: { period: string; totalKg: number }[];
  categories: any[];
  locations: any[];
  forecast: any;
  anomalies: { anomalies: any[]; count: number };
  risk: any;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [summary, trendRes, categories, locations, forecast, anomalies, risk] = await Promise.all([
          api.get<any>("/api/v1/analytics/summary"),
          api.get<any>("/api/v1/analytics/trends?granularity=daily"),
          api.get<any[]>("/api/v1/analytics/categories"),
          api.get<any[]>("/api/v1/analytics/locations"),
          api.get<any>("/api/v1/forecast"),
          api.get<any>("/api/v1/anomalies"),
          api.get<any>("/api/v1/analytics/risk-score"),
        ]);
        if (!cancelled) {
          setData({ summary, trend: trendRes.points, categories, locations, forecast, anomalies, risk });
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load dashboard.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <EmptyState title="Could not load dashboard" description={error} />;
  }

  if (!data) {
    return <LoadingBlock label="Analyzing waste data..." />;
  }

  const { summary, trend, categories, locations, forecast, anomalies, risk } = data;

  if (!summary.hasData) {
    return (
      <div className="space-y-6">
        <Header />
        <EmptyState
          title="No waste data yet."
          description="Upload your first dataset or load the demo dataset to see live analytics, forecasts, and AI-generated recommendations."
          action={
            <Link href="/upload" className="rounded-xl bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800">
              Upload your first dataset
            </Link>
          }
        />
      </div>
    );
  }

  const riskTone = risk.status === "ok" ? (risk.level === "Low" ? "success" : risk.level === "Moderate" ? "warning" : "danger") : "neutral";

  return (
    <div className="space-y-6">
      <Header isDemo={summary.isDemo} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Total Waste" value={formatKg(summary.totalWaste)} hint={`${summary.daySpan} days recorded`} />
        <StatCard label="Food Waste" value={formatKg(summary.foodWaste)} tone="warning" />
        <StatCard label="Recyclable" value={formatKg(summary.recyclableWaste)} tone="success" />
        <StatCard
          label="Trend"
          value={`${summary.trendPercent > 0 ? "+" : ""}${summary.trendPercent}%`}
          tone={summary.trendPercent > 5 ? "danger" : "success"}
          hint="1st half vs 2nd half"
        />
        <StatCard
          label="Waste Risk"
          value={risk.status === "ok" ? `${risk.score} · ${risk.level}` : "N/A"}
          tone={riskTone as any}
          hint={risk.status === "ok" ? undefined : "Insufficient data"}
        />
        <StatCard label="Anomalies" value={anomalies.count} tone={anomalies.count > 0 ? "warning" : "success"} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Waste Trend" subtitle="Daily total waste across your organization" />
          {trend.length > 0 ? <TrendLineChart points={trend} /> : <EmptyState title="No trend data" description="Not enough dated records yet." />}
        </Card>
        <Card>
          <SectionTitle title="Category Distribution" subtitle="Share of total waste by category" />
          {categories.length > 0 ? <CategoryPieChart data={categories} /> : <EmptyState title="No category data" description="Upload data to see category breakdown." />}
        </Card>
        <Card>
          <SectionTitle title="Location Comparison" subtitle="Top waste-generating locations" />
          {locations.length > 0 ? <LocationBarChart data={locations.slice(0, 8)} /> : <EmptyState title="No location data" description="Upload data to compare locations." />}
        </Card>
        <Card>
          <SectionTitle title="Forecast (Next 7 Days)" subtitle={forecast.status === "ok" ? `Model: ${forecast.chosenModel.replace(/_/g, " ")}` : undefined} />
          {forecast.status === "ok" ? (
            <ForecastChart historical={forecast.historical} forecast={forecast.forecast} />
          ) : (
            <EmptyState title="Insufficient data for forecasting" description={forecast.message} />
          )}
        </Card>
      </div>

      {risk.status === "ok" && (
        <Card>
          <SectionTitle title="Risk Factors" subtitle="Contributing factors to the current WasteWise Risk Score" />
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {risk.factors.map((f: any) => (
              <div key={f.label} className="rounded-xl border border-forest-100 bg-forest-50/40 p-3">
                <p className="text-xs font-medium text-charcoal-500">{f.label}</p>
                <p className="mt-1 text-lg font-semibold text-forest-800">{f.contribution}</p>
                <p className="mt-1 text-xs text-charcoal-500">{f.detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-charcoal-400">{risk.disclaimer}</p>
        </Card>
      )}
    </div>
  );
}

function Header({ isDemo }: { isDemo?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-charcoal-900">Dashboard</h1>
        <p className="text-sm text-charcoal-500">Live waste intelligence for your organization.</p>
      </div>
      {isDemo && <Badge tone="warning">DEMO DATA</Badge>}
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-charcoal-900">{title}</h3>
      {subtitle && <p className="text-xs text-charcoal-400">{subtitle}</p>}
    </div>
  );
}
