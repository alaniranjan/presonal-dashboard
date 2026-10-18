"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const CHART_COLORS = ["#4f46e5", "#10b981", "#a1a1aa", "#f59e0b", "#ef4444"];

export function SimpleBarChart({ data, xKey, bars, label, height = 240 }: {
  data: Record<string, string | number>[];
  xKey: string;
  bars: { key: string; label: string; color?: string }[];
  label: string;
  height?: number;
}) {
  return (
    <div className="w-full text-xs" style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey={xKey} tickLine={false} axisLine={false} stroke="currentColor" strokeOpacity={0.6} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke="currentColor" strokeOpacity={0.6} />
          <Tooltip cursor={{ fill: "currentColor", fillOpacity: 0.05 }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12, color: "#18181b" }}
            formatter={(v, name) => [v, bars.find((b) => b.key === name)?.label ?? name]} />
          {bars.length > 1 && <Legend formatter={(v) => bars.find((b) => b.key === v)?.label ?? v} />}
          {bars.map((b, i) => <Bar key={b.key} dataKey={b.key} fill={b.color ?? CHART_COLORS[i]} radius={[3, 3, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
