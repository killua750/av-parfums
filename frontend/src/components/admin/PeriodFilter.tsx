// Period selector powering the whole dashboard: 8 presets + a custom range.
import { useEffect, useRef, useState } from "react";
import { Calendar, Check, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { PeriodPreset } from "@/lib/types";
import { VIZ } from "@/components/admin/viz";

const PRESETS: PeriodPreset[] = [
  "today",
  "yesterday",
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "this_year",
];

export interface PeriodValue {
  preset: PeriodPreset;
  start?: string;
  end?: string;
}

export function PeriodFilter({
  value,
  onChange,
}: {
  value: PeriodValue;
  onChange: (v: PeriodValue) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value.start ?? "");
  const [customEnd, setCustomEnd] = useState(value.end ?? "");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const label =
    value.preset === "custom" && value.start && value.end
      ? `${value.start} → ${value.end}`
      : t(`period.${value.preset}`);

  const applyCustom = () => {
    if (customStart && customEnd) {
      onChange({ preset: "custom", start: customStart, end: customEnd });
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/30"
      >
        <Calendar size={15} />
        <span className="max-w-[180px] truncate">{label}</span>
        <ChevronDown size={15} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-white/10 p-1.5 shadow-2xl"
          style={{ backgroundColor: "#232322" }}
        >
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => {
                onChange({ preset: p });
                setOpen(false);
              }}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-white/75 transition hover:bg-white/10"
            >
              {t(`period.${p}`)}
              {value.preset === p && <Check size={14} />}
            </button>
          ))}
          <div className="my-1.5 h-px bg-white/10" />
          <div className="px-3 py-1">
            <p className="mb-2 text-xs font-medium" style={{ color: VIZ.muted }}>
              {t("period.custom")}
            </p>
            <div className="space-y-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs text-white [color-scheme:dark]"
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/[0.06] px-2.5 py-1.5 text-xs text-white [color-scheme:dark]"
              />
              <button
                onClick={applyCustom}
                disabled={!customStart || !customEnd}
                className="w-full rounded-lg bg-white py-1.5 text-xs font-semibold text-black transition hover:bg-white/90 disabled:opacity-40"
              >
                {t("period.apply")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
