// Dashboard visualization primitives. Dark-surface palette follows the
// validated reference instance (series hues stepped for #1a1a19): marks carry
// the series color, all text stays in ink tokens.
import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";

export const VIZ = {
  surface: "#1a1a19",
  page: "#0d0d0d",
  grid: "#2c2c2a",
  baseline: "#383835",
  ink: "#ffffff",
  secondary: "#c3c2b7",
  muted: "#898781",
  blue: "#3987e5",
  aqua: "#199e70",
  good: "#0ca30c",
  bad: "#e66767",
  warning: "#fab219",
  critical: "#d03b3b",
} as const;

// The admin panel's own brand accent (violet-rose) — deliberately NOT one of
// the product-line colors, so the dashboard reads as the store's control
// center rather than a single fragrance. Used for primary charts & actions.
export const BRAND = {
  accent: "#a855f7",
  accentSoft: "#c084fc",
  gradFrom: "#a855f7",
  gradTo: "#db2777",
} as const;

// Category/product series echo the five product lines (Sweet Dreams rose,
// Honey Touch amber, Dziria gold, Afro Passion turquoise, Eau de Cologne
// lavender) so each is recognisable and consistent with the public site.
export const PRODUCT_HUES = ["#E88BB0", "#D9A25A", "#C9873E", "#2FA69A", "#8B7EC8"] as const;

/* ---------------------------------- Stat tile --------------------------------- */

export function StatTile({
  label,
  value,
  delta,
  deltaLabel,
  icon,
  spark,
  accent = VIZ.blue,
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  icon?: ReactNode;
  /** Optional mini trend drawn along the tile's base. */
  spark?: number[];
  accent?: string;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-2xl border border-white/10 px-5 py-4"
      style={{ backgroundColor: VIZ.surface }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs" style={{ color: VIZ.secondary }}>
          {label}
        </p>
        {icon && <span style={{ color: VIZ.muted }}>{icon}</span>}
      </div>
      <p className="mt-1.5 text-[26px] font-semibold leading-8 text-white">{value}</p>
      {delta != null && Number.isFinite(delta) && (
        <p className="mt-1.5 flex items-center gap-1 text-xs">
          <span
            className="inline-flex items-center gap-0.5 font-semibold"
            style={{ color: up ? VIZ.good : VIZ.bad }}
          >
            {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {up ? "+" : ""}
            {delta.toLocaleString("fr-DZ", { maximumFractionDigits: 1 })}%
          </span>
          {deltaLabel && <span style={{ color: VIZ.muted }}>{deltaLabel}</span>}
        </p>
      )}
      {spark && spark.length > 1 && <Sparkline values={spark} color={accent} />}
    </div>
  );
}

/** Tiny axis-less area trend for stat tiles. */
function Sparkline({ values, color }: { values: number[]; color: string }) {
  const w = 100;
  const h = 28;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / max) * (h - 3) - 1.5;
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${w},${h} L0,${h} Z`;
  return (
    <svg
      className="mt-3 w-full"
      viewBox={`0 0 ${w} ${h}`}
      height={28}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={area} fill={color} fillOpacity={0.12} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ------------------------------- Area/line chart ------------------------------ */

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Smallest "clean" ceiling ≥ v (1/2/2.5/5 × 10^k) so axis ticks stay round. */
function niceCeil(v: number): number {
  if (v <= 0) return 4;
  const exp = Math.floor(Math.log10(v));
  const f = v / 10 ** exp;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * 10 ** exp;
}

export interface TimePoint {
  date: string;
  value: number;
  /** Extra tooltip lines, already formatted. */
  detail?: string;
}

export function AreaChart({
  points,
  height = 240,
  color = VIZ.blue,
  formatValue,
  locale = "fr",
}: {
  points: TimePoint[];
  height?: number;
  color?: string;
  formatValue: (v: number) => string;
  locale?: string;
}) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const pad = { top: 12, right: 14, bottom: 26, left: 8 };
  const yTickW = 52;
  const plotW = Math.max(0, width - pad.left - pad.right - yTickW);
  const plotH = height - pad.top - pad.bottom;

  const { max, ticks } = useMemo(() => {
    const m = niceCeil(Math.max(...points.map((p) => p.value), 1));
    return { max: m, ticks: [0, 0.25, 0.5, 0.75, 1].map((f) => f * m) };
  }, [points]);

  const x = (i: number) =>
    pad.left + yTickW + (points.length < 2 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => pad.top + plotH - (v / max) * plotH;

  const linePath = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.value)}`).join(" ");
  const areaPath = `${linePath} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  const dateFmt = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" });
  const xLabelIdx = [0, Math.floor((points.length - 1) / 2), points.length - 1];

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const i = Math.round((px / Math.max(rect.width, 1)) * (points.length - 1));
    setHover(Math.min(points.length - 1, Math.max(0, i)));
  };

  if (width === 0 || points.length === 0) {
    return <div ref={wrapRef} style={{ height }} />;
  }

  const h = hover != null ? points[hover] : null;
  const tooltipLeft = h ? Math.min(Math.max(x(hover!) - 70, 4), width - 148) : 0;

  return (
    <div ref={wrapRef} className="relative select-none">
      <svg width={width} height={height} role="img">
        {/* recessive hairline grid + right-aligned tick labels */}
        {ticks.map((tk) => (
          <g key={tk}>
            <line
              x1={pad.left + yTickW}
              x2={width - pad.right}
              y1={y(tk)}
              y2={y(tk)}
              stroke={tk === 0 ? VIZ.baseline : VIZ.grid}
              strokeWidth={1}
            />
            <text
              x={pad.left + yTickW - 8}
              y={y(tk) + 3.5}
              textAnchor="end"
              fontSize={10}
              fill={VIZ.muted}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {new Intl.NumberFormat(locale, { notation: "compact" }).format(tk)}
            </text>
          </g>
        ))}
        {xLabelIdx.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={height - 8}
            textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            fontSize={10}
            fill={VIZ.muted}
          >
            {dateFmt.format(new Date(points[i].date))}
          </text>
        ))}

        <path d={areaPath} fill={color} fillOpacity={0.1} />
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {h && (
          <g>
            <line
              x1={x(hover!)}
              x2={x(hover!)}
              y1={pad.top}
              y2={pad.top + plotH}
              stroke={VIZ.muted}
              strokeWidth={1}
            />
            {/* marker with a 2px surface ring so it reads over the line */}
            <circle cx={x(hover!)} cy={y(h.value)} r={6.5} fill={VIZ.surface} />
            <circle cx={x(hover!)} cy={y(h.value)} r={4.5} fill={color} />
          </g>
        )}

        <rect
          x={pad.left + yTickW}
          y={pad.top}
          width={plotW}
          height={plotH}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>

      {h && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-white/10 px-3 py-2 text-xs shadow-xl"
          style={{ left: tooltipLeft, top: 0, backgroundColor: "#232322", minWidth: 132 }}
        >
          <p style={{ color: VIZ.muted }}>{dateFmt.format(new Date(h.date))}</p>
          <p className="font-semibold text-white mt-0.5">{formatValue(h.value)}</p>
          {h.detail && <p style={{ color: VIZ.secondary }}>{h.detail}</p>}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- Bar list ---------------------------------- */

export interface BarItem {
  key: string;
  label: ReactNode;
  value: number;
  display: string;
}

/** Horizontal single-hue bar list: identity lives in the row label, magnitude
 * in the bar; 4px rounded data-end, square at the (left) baseline. */
export function BarList({
  items,
  color = VIZ.blue,
  emptyText,
}: {
  items: BarItem[];
  color?: string;
  emptyText: string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm" style={{ color: VIZ.muted }}>
        {emptyText}
      </p>
    );
  }
  return (
    <ul className="space-y-3.5">
      {items.map((item) => (
        <li key={item.key}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate" style={{ color: VIZ.secondary }}>
              {item.label}
            </span>
            <span
              className="shrink-0 font-medium text-white"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {item.display}
            </span>
          </div>
          <div className="h-[9px]" title={item.display}>
            <div
              className="h-full"
              style={{
                width: `${Math.max((item.value / max) * 100, 1.5)}%`,
                backgroundColor: color,
                borderRadius: "0 4px 4px 0",
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------------------------- Card shell -------------------------------- */

export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-white/10 p-5 ${className}`}
      style={{ backgroundColor: VIZ.surface }}
    >
      <header className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-white">{title}</h3>
        {action}
      </header>
      {children}
    </section>
  );
}
