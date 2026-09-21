"use client";

import { useState } from "react";
import { Calculator, Loader2 } from "lucide-react";
import { Card, Button, EmptyState } from "@/components/ui/Primitives";
import { api, ApiError } from "@/lib/api-client";
import { formatKg } from "@/lib/utils";

export default function SimulatorPage() {
  const [reductionPercent, setReductionPercent] = useState(15);
  const [periodDays, setPeriodDays] = useState(30);
  const [category, setCategory] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = ["Food", "Paper", "Plastic", "Glass", "Metal", "E-Waste", "Other"];

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<any>("/api/v1/impact/simulate", {
        reductionPercent,
        periodDays,
        category: category || undefined,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not run simulation.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-charcoal-900">
          <Calculator size={22} className="text-forest-600" /> Impact Simulator
        </h1>
        <p className="text-sm text-charcoal-500">
          Model potential waste reduction, cost avoidance, and CO2e avoidance scenarios using your organization's
          historical average.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-charcoal-700">Category (optional)</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1 w-full rounded-xl border border-forest-200 px-3.5 py-2.5 text-sm"
              >
                <option value="">All categories</option>
                {categoryOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-charcoal-700">Reduction Target: {reductionPercent}%</label>
              <input
                type="range"
                min={1}
                max={90}
                value={reductionPercent}
                onChange={(e) => setReductionPercent(Number(e.target.value))}
                className="mt-2 w-full accent-forest-600"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-charcoal-700">Time Period (days)</label>
              <input
                type="number"
                min={1}
                max={365}
                value={periodDays}
                onChange={(e) => setPeriodDays(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-forest-200 px-3.5 py-2.5 text-sm"
              />
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 size={15} className="animate-spin" />} Run Simulation
            </Button>
          </form>
        </Card>

        <Card>
          <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Scenario Result</h3>
          {!result ? (
            <EmptyState title="No scenario run yet" description="Configure a scenario and click Run Simulation." />
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-forest-100 bg-forest-50/40 p-4">
                <p className="text-xs text-charcoal-500">Projected waste over {result.periodDays} days</p>
                <p className="mt-1 text-xl font-semibold text-charcoal-900">{formatKg(result.currentProjectedWasteKg)}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-forest-200 bg-forest-50 p-4">
                  <p className="text-xs text-forest-700">Potential Waste Reduction</p>
                  <p className="mt-1 text-lg font-semibold text-forest-800">{formatKg(result.reducedWasteKg)}</p>
                </div>
                <div className="rounded-xl border border-forest-100 bg-white p-4">
                  <p className="text-xs text-charcoal-500">Remaining Waste</p>
                  <p className="mt-1 text-lg font-semibold text-charcoal-900">{formatKg(result.remainingWasteKg)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-forest-100 p-4">
                  <p className="text-xs text-charcoal-500">CO2e Avoided</p>
                  <p className="mt-1 text-lg font-semibold text-charcoal-900">
                    {result.co2eAvoided ? `${result.co2eAvoided.value} ${result.co2eAvoided.unit}` : "Unavailable"}
                  </p>
                  {!result.co2eAvoided && <p className="mt-1 text-[11px] text-charcoal-400">No verified CO2e factor configured.</p>}
                </div>
                <div className="rounded-xl border border-forest-100 p-4">
                  <p className="text-xs text-charcoal-500">Cost Avoided</p>
                  <p className="mt-1 text-lg font-semibold text-charcoal-900">
                    {result.costAvoided ? `${result.costAvoided.value} ${result.costAvoided.unit}` : "Unavailable"}
                  </p>
                  {!result.costAvoided && <p className="mt-1 text-[11px] text-charcoal-400">No verified cost factor configured.</p>}
                </div>
              </div>

              <p className="text-xs italic text-charcoal-400">{result.disclaimer}</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
