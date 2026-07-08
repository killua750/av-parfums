export const formatDA = (n: number | string): string =>
  new Intl.NumberFormat("fr-DZ").format(typeof n === "string" ? parseFloat(n) : n) + " DA";

/** % change vs a previous window; null (no delta shown) when there is no base. */
export const pctDelta = (current: number, previous: number): number | null =>
  previous ? ((current - previous) / previous) * 100 : null;

/** Compact money for stat tiles and axis ticks: 12 500 → "12,5 k DA". */
export const formatDACompact = (n: number | string): string =>
  new Intl.NumberFormat("fr-DZ", { notation: "compact", maximumFractionDigits: 1 }).format(
    typeof n === "string" ? parseFloat(n) : n,
  ) + " DA";
