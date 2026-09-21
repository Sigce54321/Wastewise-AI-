"use client";

import { useEffect, useState } from "react";
import { Card, LoadingBlock, EmptyState, Badge } from "@/components/ui/Primitives";
import { ForecastChart } from "@/components/charts/ForecastChart";
import { api } from "@/lib/api-client";

const MODEL_LABELS: Record<string, string> = {
  moving_average: "Moving Average",
  linear_regression: "Linear Regression",
  random_forest: "Random Forest",
  xgboost_style_gradient_boosting: "Gradient Boosting (XGBoost-style)",
};

export default function PredictionsPage() {
  const [locations, setLocations] = useState<any[]>([]);
  const [locationId, setLocationId] = useState("");
  const [category, setCategory] = useState("");
  const [forecast, setForecast] = useState<any>(null);
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
    if (locationId) qs.set("locationId", locationId);
    if (category) qs.set("category", category);

    api
      .get<any>(`/api/v1/forecast?${qs}`)
      .then((data) => !cancelled && setForecast(data))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [locationId, category]);

  const categoryOptions = ["Food", "Paper", "Plastic", "Glass", "Metal", "E-Waste", "Other"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-charcoal-900">Predictions</h1>
          <p className="text-sm text-charcoal-500">
            Forecasts trained per organization using Moving Average, Linear Regression, Random Forest, and Gradient
            Boosting (XGBoost-style) models.
          </p>
        </div>
        <div className="flex gap-2">
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)} className="rounded-lg border border-forest-200 bg-white px-3 py-1.5 text-sm">
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg border border-forest-200 bg-white px-3 py-1.5 text-sm">
            <option value="">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <LoadingBlock label="Calculating forecast..." />}
      {error && <EmptyState title="Could not calculate forecast" description={error} />}

      {!loading && !error && forecast?.status === "insufficient_data" && (
        <EmptyState
          title="Insufficient data for forecasting"
          description={`${forecast.message} (${forecast.daysAvailable}/${forecast.daysRequired} days available for this scope)`}
        />
      )}

      {!loading && !error && forecast?.status === "ok" && (
        <>
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-charcoal-900">7-Day Forecast</h3>
              <Badge tone="info">Model: {MODEL_LABELS[forecast.chosenModel] ?? forecast.chosenModel}</Badge>
            </div>
            <ForecastChart historical={forecast.historical} forecast={forecast.forecast} />
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Model Evaluation</h3>
            <p className="mb-3 text-xs text-charcoal-400">
              Chronological split — Train: {forecast.trainSize} · Validation: {forecast.validationSize} · Test:{" "}
              {forecast.testSize} samples. Metrics computed on the held-out test set.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="border-b border-forest-100 text-xs uppercase tracking-wide text-charcoal-400">
                  <tr>
                    <th className="py-2">Model</th>
                    <th className="py-2">MAE</th>
                    <th className="py-2">RMSE</th>
                    <th className="py-2">MAPE (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.evaluations.map((e: any) => (
                    <tr key={e.model} className={`border-b border-forest-50 ${e.model === forecast.chosenModel ? "bg-forest-50/60" : ""}`}>
                      <td className="py-2 font-medium text-charcoal-800">
                        {MODEL_LABELS[e.model] ?? e.model}
                        {e.model === forecast.chosenModel && <Badge tone="success">Selected</Badge>}
                      </td>
                      <td className="py-2">{e.mae}</td>
                      <td className="py-2">{e.rmse}</td>
                      <td className="py-2">{e.mape}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card>
            <h3 className="mb-3 text-sm font-semibold text-charcoal-900">Forecasted Values</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {forecast.forecast.map((f: any) => (
                <div key={f.date} className="rounded-xl border border-forest-100 bg-forest-50/40 p-3 text-center">
                  <p className="text-[11px] text-charcoal-400">{f.date}</p>
                  <p className="mt-1 text-base font-semibold text-forest-800">{f.predictedKg} kg</p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
