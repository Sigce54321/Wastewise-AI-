"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function LocationBarChart({ data }: { data: { locationName: string; totalKg: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0ede4" />
        <XAxis dataKey="locationName" tick={{ fontSize: 11, fill: "#6b7278" }} interval={0} angle={-15} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7278" }} width={44} />
        <Tooltip
          contentStyle={{ borderRadius: 12, border: "1px solid #e0ede4", fontSize: 12 }}
          formatter={((value: number) => [`${value} kg`, "Waste"]) as any}
        />
        <Bar dataKey="totalKg" fill="#46825f" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
