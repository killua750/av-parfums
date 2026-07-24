// Client-side mirror of the backend period presets, so list pages (orders)
// can filter locally with the same semantics as the dashboard endpoint.
import type { PeriodPreset } from "@/lib/types";

export interface ResolvedRange {
  start: Date;
  end: Date; // exclusive
}

function midnight(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function resolvePeriod(preset: PeriodPreset, start?: string, end?: string): ResolvedRange {
  const now = new Date();
  const m = midnight(now);
  const day = 86400000;
  // JS getDay(): 0=Sun..6=Sat → convert to Mon=0.
  const weekday = (now.getDay() + 6) % 7;

  switch (preset) {
    case "today":
      return { start: m, end: now };
    case "yesterday":
      return { start: new Date(+m - day), end: m };
    case "this_week":
      return { start: new Date(+m - weekday * day), end: now };
    case "last_week": {
      const thisWeek = new Date(+m - weekday * day);
      return { start: new Date(+thisWeek - 7 * day), end: thisWeek };
    }
    case "this_month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case "last_month":
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 1),
      };
    case "this_year":
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
    case "custom":
      if (start && end) {
        const s = new Date(start);
        const e = new Date(end);
        e.setDate(e.getDate() + 1);
        return { start: midnight(s), end: midnight(e) };
      }
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    default:
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
  }
}

export function inRange(iso: string, r: ResolvedRange): boolean {
  const t = new Date(iso).getTime();
  return t >= r.start.getTime() && t < r.end.getTime();
}
