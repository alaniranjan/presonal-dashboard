"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function WeeklyChart({ data }: { data: { week: string; planned: number; completed: number; hours: number }[] }) {
  return (
    <div className="h-64 w-full text-xs" role="img" aria-label="Planned versus completed tasks for the last eight weeks">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} stroke="currentColor" strokeOpacity={0.6} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} stroke="currentColor" strokeOpacity={0.6} />
          <Tooltip
            cursor={{ fill: "currentColor", fillOpacity: 0.05 }}
            contentStyle={{ borderRadius: 8, border: "1px solid #e4e4e7", fontSize: 12, color: "#18181b" }}
            formatter={(v, name) => [v, name === "hours" ? "Study hours" : name === "planned" ? "Planned tasks" : "Completed tasks"]}
            labelFormatter={(l) => `Week of ${l}`}
          />
          <Legend formatter={(v) => (v === "planned" ? "Planned" : v === "completed" ? "Completed" : "Hours")} />
          <Bar dataKey="planned" fill="#a1a1aa" radius={[3, 3, 0, 0]} />
          <Bar dataKey="completed" fill="#4f46e5" radius={[3, 3, 0, 0]} />
          <Bar dataKey="hours" fill="#10b981" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
