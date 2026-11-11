import type { ScheduleItem } from "@/lib/types";
import { dDay, dateParts } from "@/lib/format";

type Props = {
  items: ScheduleItem[];
  /** D-day 기준일(회의일) */
  baseDate: string;
};

export function ScheduleList({ items, baseDate }: Props) {
  if (items.length === 0) {
    return <p className="rounded-lg border border-line bg-white px-6 py-5 text-sm text-ink-soft">이번 회의에서 언급된 일정이 없어요.</p>;
  }
  // 날짜가 정해진 일정을 먼저, 날짜 미정 일정은 뒤로
  const sorted = [...items.filter((s) => s.date), ...items.filter((s) => !s.date)];
  return (
    <ul className="m-0 list-none rounded-lg border border-line bg-white px-5 py-1 md:px-6">
      {sorted.map((s) => {
        const p = s.date ? dateParts(s.date) : null;
        return (
          <li key={s.id} className="flex items-center gap-4 border-b border-line py-4 last:border-b-0">
            <div className="w-14 shrink-0 text-center">
              {p ? (
                <>
                  <p className="m-0 font-display text-xl font-bold leading-none tabular-nums">{p.day}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {p.month} {p.weekday}
                  </p>
                </>
              ) : (
                <>
                  <p className="m-0 font-display text-base font-bold leading-none text-ink-soft">미정</p>
                  <p className="mt-1 text-xs text-ink-soft">날짜</p>
                </>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[15px] font-semibold">{s.label}</p>
              <p className="mt-1 text-[13px] text-ink-soft">
                담당 {s.ownerLabel}
                {!s.date && s.dueText ? ` · 마감 ${s.dueText}(날짜 미정)` : null}
              </p>
            </div>
            {s.date ? (
              <span className="shrink-0 rounded-full bg-warn-soft px-3 py-1 font-display text-[13px] font-bold tabular-nums text-warn">
                {dDay(s.date, baseDate)}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
