"use client";

import { CartesianGrid, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";

export type ScatterPoint = {
  id: string;
  name: string;
  color: string;
  luckIndex: number;
  rating: number;
  highlighted: boolean;
};

export function ChanceSkillScatter({ points }: { points: ScatterPoint[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            type="number"
            dataKey="luckIndex"
            name="Chance"
            unit="%"
            stroke="var(--muted)"
            fontSize={12}
            tickLine={false}
          />
          <YAxis type="number" dataKey="rating" name="Niveau" stroke="var(--muted)" fontSize={12} tickLine={false} />
          <ZAxis range={[80, 260]} />
          <Tooltip
            cursor={{ strokeDasharray: "3 3", stroke: "var(--border)" }}
            contentStyle={{
              background: "var(--surface-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--foreground)",
            }}
            formatter={(value, key) => {
              const n = typeof value === "number" ? value : Number(value);
              return key === "luckIndex" ? [`${Math.round(n)}%`, "Chance"] : [Math.round(n), "Niveau"];
            }}
            labelFormatter={() => ""}
          />
          <Scatter
            data={points}
            shape={(props: unknown) => {
              const { cx, cy, payload } = props as { cx: number; cy: number; payload: ScatterPoint };
              return (
                <g>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={payload.highlighted ? 10 : 6}
                    fill={payload.color}
                    stroke={payload.highlighted ? "var(--foreground)" : "none"}
                    strokeWidth={2}
                  />
                </g>
              );
            }}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
