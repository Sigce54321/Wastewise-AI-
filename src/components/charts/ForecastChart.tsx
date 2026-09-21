"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatDate } from "@/lib/utils";

export function ForecastChart({
  historical,
  forecast,
}: {
  historical: { date: string; quantityKg: number }[];
  forecast: { date: string; predictedKg: number }[];
}) {
  const recentHistory = historical.slice(-21);
  const combined = [
    ...recentHistory.map((h) => ({ date: h.date, historical: h.quantityKg, forecast: null as number | null })),
    ...forecast.map((f) => ({ date: f.date, historical: null as number | null, forecast: f.predictedKg })),
  ];

  // bridge the gap so the forecast line connects visually to the last historical point
  if (recentHistory.length && forecast.length) {
    combined[recentHistory.length - 1] = {
      ...combined[recentHistory.length - 1],
      forecast: recentHistory[recentHistory.length - 1].quantityKg,
    };
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={combined} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0ede4" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b7278" }} tickFormatter={formatDate} minTickGap={20} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7278" }} width={44} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e0ede4", fontSize: 12 }}
          labelFormatter={formatDate as any}
          formatter={((value: number, name: string) => [value ? `${value.toFixed(1)} kg` : "—", name === "historical" ? "Historical" : "Forecast"]) as any}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} formatter={(v) => (v === "historical" ? "Historical" : "Forecast")} />
        <Line type="monotone" dataKey="historical" stroke="#29523c" strokeWidth={2} dot={false} connectNulls={false} />
        <Line
          type="monotone"
          dataKey="forecast"
          stroke="#c9a24b"
          strokeWidth={2}
          strokeDasharray="5 4"
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
