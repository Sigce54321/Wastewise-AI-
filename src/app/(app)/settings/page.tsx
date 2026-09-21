"use client";

import { useEffect, useState } from "react";
import { Settings, Plus, Loader2, Trash2 } from "lucide-react";
import { Card, Button, Badge, LoadingBlock, EmptyState } from "@/components/ui/Primitives";
import { api, ApiError } from "@/lib/api-client";

const CATEGORY_OPTIONS = ["Food", "Paper", "Plastic", "Glass", "Metal", "E-Waste", "Other"];

export default function SettingsPage() {
  const [factors, setFactors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ category: "Food", metric: "co2e", factorValue: 2.5, unit: "kg CO2e / kg waste", source: "" });
  const [saving, setSaving] = useState(false);
  const [demoClearing, setDemoClearing] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<any[]>("/api/v1/impact/factors")
      .then(setFactors)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function addFactor(e: React.FormEvent) {
    e.preventDefault();
    if (!form.source.trim()) {
      setError("Please provide a source for this factor.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<any>("/api/v1/impact/factors", form);
      setFactors((prev) => [...prev, created]);
      setForm({ ...form, source: "" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save factor.");
    } finally {
      setSaving(false);
    }
  }

  async function clearDemoData() {
    setDemoClearing(true);
    try {
      await api.delete("/api/v1/datasets/demo");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not clear demo data.");
    } finally {
      setDemoClearing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-charcoal-900">
          <Settings size={22} className="text-forest-600" /> Settings
        </h1>
        <p className="text-sm text-charcoal-500">
          Manage impact factors (CO2e / cost) used by the Impact Simulator, and workspace data controls.
        </p>
      </div>

      {error && <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Impact Factors</h3>
        <p className="mb-4 text-xs text-charcoal-400">
          Factors with no organization override fall back to global defaults. Only verified factors are used by the
          simulator — unknown categories will show "Unavailable" rather than a fabricated estimate.
        </p>

        {loading ? (
          <LoadingBlock label="Loading impact factors..." />
        ) : factors.length === 0 ? (
          <EmptyState title="No impact factors configured." description="Add a factor below to enable cost/CO2e estimates in the simulator." />
        ) : (
          <div className="mb-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-forest-100 text-xs uppercase text-charcoal-400">
                <tr>
                  <th className="py-2">Category</th>
                  <th className="py-2">Metric</th>
                  <th className="py-2">Value</th>
                  <th className="py-2">Unit</th>
                  <th className="py-2">Source</th>
                  <th className="py-2">Scope</th>
                </tr>
              </thead>
              <tbody>
                {factors.map((f) => (
                  <tr key={f.id} className="border-b border-forest-50">
                    <td className="py-2">{f.category}</td>
                    <td className="py-2 uppercase">{f.metric}</td>
                    <td className="py-2">{f.factorValue}</td>
                    <td className="py-2">{f.unit}</td>
                    <td className="py-2">{f.source}</td>
                    <td className="py-2">
                      <Badge tone={f.organizationId ? "info" : "neutral"}>{f.organizationId ? "Organization" : "Global"}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form onSubmit={addFactor} className="grid grid-cols-2 gap-3 border-t border-forest-100 pt-4 sm:grid-cols-3 lg:grid-cols-6">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-forest-200 px-2.5 py-2 text-sm">
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select value={form.metric} onChange={(e) => setForm({ ...form, metric: e.target.value })} className="rounded-lg border border-forest-200 px-2.5 py-2 text-sm">
            <option value="co2e">CO2e</option>
            <option value="cost">Cost</option>
          </select>
          <input
            type="number"
            step="0.01"
            value={form.factorValue}
            onChange={(e) => setForm({ ...form, factorValue: Number(e.target.value) })}
            className="rounded-lg border border-forest-200 px-2.5 py-2 text-sm"
            placeholder="Value"
          />
          <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="rounded-lg border border-forest-200 px-2.5 py-2 text-sm" placeholder="Unit" />
          <input
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            className="rounded-lg border border-forest-200 px-2.5 py-2 text-sm"
            placeholder="Source (required)"
          />
          <Button type="submit" disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Add
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="mb-2 text-sm font-semibold text-charcoal-900">Demo Data</h3>
        <p className="mb-3 text-xs text-charcoal-400">
          Remove all records marked as DEMO DATA from this workspace without affecting real uploaded data.
        </p>
        <Button variant="danger" onClick={clearDemoData} disabled={demoClearing}>
          {demoClearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Clear Demo Data
        </Button>
      </Card>
    </div>
  );
}
