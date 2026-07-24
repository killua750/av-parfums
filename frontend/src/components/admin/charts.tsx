// Recharts-based dashboard charts, themed to the admin brand accent.
import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { BRAND, PRODUCT_HUES, VIZ } from "@/components/admin/viz";
import type { Granularity } from "@/lib/types";

interface TipEntry {
  value: number;
  name?: string;
  payload: Record<string, unknown>;
}
interface TipProps {
  active?: boolean;
  payload?: TipEntry[];
  label?: string | number;
}

function TipShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-lg border border-white/10 px-3 py-2 text-xs shadow-xl"
      style={{ backgroundColor: "#232322" }}
    >
      {children}
    </div>
  );
}

/* ------------------------------- Revenue area ------------------------------ */

export function RevenueArea({
  data,
  granularity,
  locale,
  formatValue,
}: {
  data: { bucket: string; revenue: number; orders: number }[];
  granularity: Granularity;
  locale: string;
  formatValue: (v: number) => string;
}) {
  const fmtTick = (iso: string) => {
    const d = new Date(iso);
    if (granularity === "hour") return `${d.getHours()}h`;
    if (granularity === "month")
      return new Intl.DateTimeFormat(locale, { month: "short" }).format(d);
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(d);
  };
  const fmtFull = (iso: string) => {
    const d = new Date(iso);
    if (granularity === "hour")
      return new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        day: "numeric",
        month: "short",
      }).format(d);
    if (granularity === "month")
      return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(d);
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(d);
  };

  const Tip = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <TipShell>
        <p style={{ color: VIZ.muted }}>{fmtFull(String(p.bucket))}</p>
        <p className="mt-0.5 font-semibold text-white">{formatValue(Number(p.revenue))}</p>
        <p style={{ color: VIZ.secondary }}>{Number(p.orders)} cmd</p>
      </TipShell>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -6, bottom: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BRAND.accent} stopOpacity={0.35} />
            <stop offset="100%" stopColor={BRAND.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="bucket"
          tickFormatter={fmtTick}
          tick={{ fill: VIZ.muted, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: VIZ.baseline }}
          minTickGap={28}
        />
        <YAxis
          tickFormatter={(v: number) =>
            new Intl.NumberFormat(locale, { notation: "compact" }).format(v)
          }
          tick={{ fill: VIZ.muted, fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={46}
        />
        <Tooltip content={<Tip />} cursor={{ stroke: VIZ.muted, strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke={BRAND.accent}
          strokeWidth={2}
          fill="url(#revGrad)"
          activeDot={{ r: 4, fill: BRAND.accent, stroke: VIZ.surface, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* -------------------------------- Status donut ----------------------------- */

export function StatusDonut({
  data,
  total,
  centerLabel,
}: {
  data: { key: string; label: string; value: number; color: string }[];
  total: number;
  centerLabel: string;
}) {
  const Tip = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const pct = total ? Math.round((Number(p.value) / total) * 100) : 0;
    return (
      <TipShell>
        <p className="font-medium text-white">{String(p.label)}</p>
        <p style={{ color: VIZ.secondary }}>
          {Number(p.value)} · {pct}%
        </p>
      </TipShell>
    );
  };
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={54}
              outerRadius={78}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<Tip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold text-white">{total}</span>
          <span className="text-[11px]" style={{ color: VIZ.muted }}>
            {centerLabel}
          </span>
        </div>
      </div>
      <ul className="grid flex-1 grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2">
        {data.map((d) => (
          <li key={d.key} className="flex items-center justify-between gap-2 text-sm">
            <span className="inline-flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="truncate" style={{ color: VIZ.secondary }}>
                {d.label}
              </span>
            </span>
            <span className="font-medium text-white">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* -------------------------------- Ranked bars ------------------------------ */

export function RankBars({
  items,
  formatValue,
  palette = "brand",
}: {
  items: { name: string; value: number; sub: string }[];
  formatValue: (v: number) => string;
  palette?: "brand" | "product";
}) {
  if (!items.length) return null;
  const Tip = ({ active, payload }: TipProps) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
      <TipShell>
        <p className="font-medium text-white">{String(p.name)}</p>
        <p style={{ color: VIZ.secondary }}>{formatValue(Number(p.value))}</p>
        <p style={{ color: VIZ.muted }}>{String(p.sub)}</p>
      </TipShell>
    );
  };
  return (
    <ResponsiveContainer width="100%" height={Math.max(items.length * 42, 120)}>
      <BarChart data={items} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={110}
          tick={{ fill: VIZ.secondary, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<Tip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
        <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={16}>
          {items.map((_, i) => (
            <Cell
              key={i}
              fill={palette === "product" ? PRODUCT_HUES[i % PRODUCT_HUES.length] : BRAND.accent}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* --------------------------------- Heatmap --------------------------------- */

export function OrdersHeatmap({
  cells,
  dowLabels,
}: {
  cells: { dow: number; hour: number; count: number }[];
  dowLabels: string[];
}) {
  const max = Math.max(...cells.map((c) => c.count), 1);
  const grid = new Map(cells.map((c) => [`${c.dow}-${c.hour}`, c.count]));
  const hours = Array.from({ length: 24 }, (_, h) => h);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="flex">
          <div className="w-9 shrink-0" />
          {hours.map((h) => (
            <div key={h} className="flex-1 text-center text-[9px]" style={{ color: VIZ.muted }}>
              {h % 3 === 0 ? `${h}h` : ""}
            </div>
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 7].map((dow) => (
          <div key={dow} className="flex items-center">
            <div className="w-9 shrink-0 text-[10px]" style={{ color: VIZ.muted }}>
              {dowLabels[dow - 1]}
            </div>
            {hours.map((h) => {
              const c = grid.get(`${dow}-${h}`) ?? 0;
              const intensity = c === 0 ? 0 : 0.15 + (c / max) * 0.85;
              return (
                <div key={h} className="flex-1 p-[1.5px]" title={c ? `${c}` : ""}>
                  <div
                    className="aspect-square w-full rounded-[3px]"
                    style={{
                      backgroundColor: c === 0 ? "rgba(255,255,255,0.04)" : BRAND.accent,
                      opacity: c === 0 ? 1 : intensity,
                    }}
                  />
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
