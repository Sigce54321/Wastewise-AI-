"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatDate } from "@/lib/utils";

export function TrendLineChart({ points }: { points: { period: string; totalKg: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={points} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#33684a" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#33684a" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0ede4" />
        <XAxis
          dataKey="period"
          tick={{ fontSize: 11, fill: "#6b7278" }}
          tickFormatter={(v: string) => (v.length === 10 ? formatDate(v) : v)}
          minTickGap={30}
        />
        <YAxis tick={{ fontSize: 11, fill: "#6b7278" }} width={44} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e0ede4", fontSize: 12 }}
          formatter={((value: number) => [`${value} kg`, "Waste"]) as any}
          labelFormatter={((v: string) => (v.length === 10 ? formatDate(v) : v)) as any}
        />
        <Area type="monotone" dataKey="totalKg" stroke="#33684a" strokeWidth={2} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
