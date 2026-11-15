import type { Kpi } from "@/lib/types";

const toneClass: Record<NonNullable<Kpi["tone"]>, string> = {
  default: "text-ink",
  warn: "text-warn",
  accent: "text-accent-strong",
};

export function KpiTile({ kpi }: { kpi: Kpi }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-line bg-white p-5">
      <p className="m-0 text-sm text-ink-soft">{kpi.label}</p>
      <p className={`m-0 font-display text-[28px] font-semibold tabular-nums ${toneClass[kpi.tone ?? "default"]}`}>{kpi.value}</p>
      <p className="m-0 text-[13px] text-ink-soft">{kpi.hint}</p>
    </div>
  );
}
