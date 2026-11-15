import type { ScheduleItem } from "@/lib/types";
import { dDay } from "@/lib/format";
import { ScheduleDate } from "./ScheduleDate";

type Props = {
  items: ScheduleItem[];
  /** D-day 기준일(회의일) */
  baseDate: string;
  /** 팀원이면 날짜 칸을 눌러 날짜를 정하거나 바꿈 */
  canEdit?: boolean;
};

export function ScheduleList({ items, baseDate, canEdit = false }: Props) {
  if (items.length === 0) {
    return <p className="rounded-lg border border-line bg-white px-6 py-5 text-sm text-ink-soft">이번 회의에서 언급된 일정이 없어요.</p>;
  }
  // 날짜가 정해진 일정을 먼저, 날짜 미정 일정은 뒤로
  const sorted = [...items.filter((s) => s.date), ...items.filter((s) => !s.date)];
  return (
    <ul className="m-0 list-none rounded-lg border border-line bg-white px-5 py-1 md:px-6">
      {sorted.map((s) => {
        return (
          <li key={s.id} className="flex items-center gap-4 border-b border-line py-4 last:border-b-0">
            <ScheduleDate id={s.id} date={s.date} label={s.label} canEdit={canEdit} baseDate={baseDate} />
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[15px] font-semibold">{s.label}</p>
              <p className="mt-1 text-[13px] text-ink-soft">
                담당 {s.ownerLabel}
                {!s.date && s.dueText ? ` | 마감 ${s.dueText}(날짜 미정)` : null}
              </p>
            </div>
            {s.date ? (
              <span className="shrink-0 rounded-full bg-warn-soft px-3 py-1 font-display text-[13px] font-semibold tabular-nums text-warn">
                {dDay(s.date, baseDate)}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
