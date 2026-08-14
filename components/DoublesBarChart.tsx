"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function DoublesBarChart({ doublesByValue }: { doublesByValue: Record<number, number> }) {
  const data = [1, 2, 3, 4, 5, 6].map((v) => ({
    value: `${v}-${v}`,
    count: doublesByValue[v] ?? 0,
  }));

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="value" stroke="var(--muted)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--muted)" fontSize={12} allowDecimals={false} tickLine={false} axisLine={false} />
          <Tooltip
            contentStyle={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--foreground)",
            }}
            cursor={{ fill: "var(--surface-elevated)" }}
          />
          <Bar dataKey="count" fill="var(--accent-gold)" radius={[8, 8, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
