"use client";

import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ZAxis } from "recharts";
import { formatDate } from "@/lib/utils";

const SEVERITY_COLOR: Record<string, string> = {
  Low: "#96c1a5",
  Moderate: "#c9a24b",
  High: "#c76b4a",
  Critical: "#b0271e",
};

export function AnomalyTimelineChart({
  anomalies,
}: {
  anomalies: { date: string; observedKg: number; severity: string; locationName: string; category: string }[];
}) {
  const data = anomalies.map((a) => ({ ...a, x: a.date, y: a.observedKg }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ScatterChart margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0ede4" />
        <XAxis dataKey="x" tick={{ fontSize: 11, fill: "#6b7278" }} tickFormatter={formatDate} type="category" />
        <YAxis dataKey="y" tick={{ fontSize: 11, fill: "#6b7278" }} width={44} name="kg" />
        <ZAxis range={[80, 80]} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e0ede4", fontSize: 12 }}
          formatter={((value: number) => [`${value} kg`, "Observed"]) as any}
          labelFormatter={((v: string) => formatDate(v)) as any}
        />
        <Scatter
          data={data}
          fill="#c76b4a"
          shape={(props: any) => {
            const { cx, cy, payload } = props;
            return <circle cx={cx} cy={cy} r={6} fill={SEVERITY_COLOR[payload.severity] ?? "#c76b4a"} stroke="#fff" strokeWidth={1.5} />;
          }}
        />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
