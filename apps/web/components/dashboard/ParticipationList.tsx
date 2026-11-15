import type { Member, Participation } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";

type Row = { member: Member; data: Participation };

// 팀원별 참여 현황: 똑같은 카드 4장 대신 한 장의 목록. 액션아이템 완료율만 얇은 막대로 보여줌
export function ParticipationList({ rows }: { rows: Row[] }) {
  return (
    <div className="rounded-lg border border-line bg-white">
      <div className="hidden grid-cols-[1fr_1.4fr_72px] gap-4 border-b border-line px-6 py-3 text-xs text-ink-soft md:grid">
        <span>팀원</span>
        <span>업무 완료</span>
        <span className="text-right">참여</span>
      </div>
      <ul className="m-0 list-none p-0">
        {rows.map(({ member, data }) => {
          const pct = data.actionTotal ? Math.round((data.actionDone / data.actionTotal) * 100) : 0;
          return (
            <li
              key={member.id}
              className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 border-b border-line px-5 py-4 last:border-b-0 md:grid-cols-[1fr_1.4fr_72px] md:px-6"
            >
              <span className="flex items-center gap-3">
                <Avatar member={member} size={32} />
                <span className="flex flex-col">
                  <span className="text-[15px] font-medium">{member.name}</span>
                  <span className="text-[13px] text-ink-soft">{member.role}</span>
                </span>
              </span>
              <span className="col-span-2 row-start-2 flex items-center gap-3 md:col-span-1 md:row-start-auto">
                <span
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-alt"
                  role="meter"
                  aria-label={`${member.name} 업무 완료`}
                  aria-valuemin={0}
                  aria-valuemax={data.actionTotal}
                  aria-valuenow={data.actionDone}
                >
                  <span className="block h-full rounded-full bg-ink-soft" style={{ width: `${pct}%` }} />
                </span>
                <span className="w-10 text-right text-[13px] tabular-nums text-ink-soft">
                  {data.actionDone}/{data.actionTotal}
                </span>
              </span>
              <span className="col-start-2 row-start-1 text-right text-[13px] tabular-nums text-ink-soft md:col-start-auto md:row-start-auto">
                <span className="md:hidden">참여 </span>
                {data.attendDone}/{data.attendTotal}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
