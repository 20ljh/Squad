import type { AgendaItem, Member } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";

type Props = {
  item: AgendaItem;
  members: Record<string, Member>;
};

export function AgendaCard({ item, members }: Props) {
  return (
    <article className="flex flex-col gap-4 rounded-lg border border-line bg-white p-5 md:p-6">
      <div className="flex items-center gap-3">
        <span className="w-5 shrink-0 text-base font-semibold tabular-nums text-accent-strong">{item.order}</span>
        <h3 className="m-0 text-lg font-bold">{item.title}</h3>
      </div>

      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {item.opinions.map((op, i) => {
          const m = members[op.memberId];
          if (!m) return null;
          return (
            <li key={i} className="flex min-w-[240px] flex-[1_1_260px] gap-2.5 rounded-sm bg-surface-alt p-3">
              <Avatar member={m} size={28} />
              <div>
                <p className="m-0 mb-0.5 text-[13px] font-bold">
                  {m.name} <span className="font-medium text-ink-soft">· {m.role}</span>
                </p>
                <p className="m-0 text-sm leading-normal text-ink-soft">“{op.quote}”</p>
              </div>
            </li>
          );
        })}
      </ul>

      {item.decision ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
          <div className="flex min-w-0 flex-[1_1_240px] items-start gap-2.5">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-0.5 shrink-0 text-accent-strong">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            <p className="m-0 text-[15px] font-semibold">결정 · {item.decision.text}</p>
          </div>
          <span className="rounded-full bg-surface-alt px-2.5 py-1 text-[13px] font-semibold text-ink-soft">
            담당 {item.decision.ownerLabel}
          </span>
          <span className="rounded-full bg-warn-soft px-2.5 py-1 text-[13px] font-bold tabular-nums text-warn">마감 {item.decision.dueLabel}</span>
        </div>
      ) : (
        <p className="m-0 border-t border-line pt-4 text-sm text-ink-soft">이 안건은 결정 없이 다음 회의로 넘어갔어요.</p>
      )}
    </article>
  );
}
