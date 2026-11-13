import Link from "next/link";
import type { Member, MeetingRound } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";

type Props = {
  rounds: MeetingRound[];
  members: Member[];
  /** 회의 id → 결과 페이지 주소. 결과가 없는 회의는 빠져 있고 링크 없이 표시 */
  hrefs?: Record<string, string>;
};

export function MeetingHistory({ rounds, members, hrefs = {} }: Props) {
  if (rounds.length === 0) {
    return (
      <p className="m-0 rounded-lg border border-line bg-white px-5 py-6 text-center text-[15px] text-ink-soft md:px-6">
        아직 회의가 없어요. 회의 녹음을 올리면 회의마다 누가 결과를 읽었는지 여기에서 볼 수 있어요.
      </p>
    );
  }
  return (
    <div className="rounded-lg border border-line bg-white px-5 py-1 md:px-6">
      <ul className="m-0 list-none p-0">
        {rounds.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-4 border-b border-line py-4">
            <div className="min-w-[150px]">
              {hrefs[r.id] ? (
                <Link
                  href={hrefs[r.id]}
                  className="inline-flex min-h-11 items-center gap-1 text-[15px] font-bold text-accent-strong no-underline transition-colors duration-150 hover:text-accent-deep"
                >
                  {r.title}
                  <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
              ) : (
                <p className="m-0 text-[15px] font-bold">{r.title}</p>
              )}
              <p className="mt-1 text-[13px] tabular-nums text-ink-soft">
                {r.dateLabel} · 참석 {r.attendDone}/{r.attendTotal}
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              {members.map((m) => {
                const read = r.readBy.includes(m.id);
                const absent = r.absent.includes(m.id);
                const label = `${m.name} · ${absent ? "결석 · " : ""}${read ? "읽음" : "아직 안 읽음"}`;
                return (
                  <span key={m.id} aria-label={label}>
                    <Avatar member={m} size={28} dimmed={!read} title={label} />
                  </span>
                );
              })}
            </div>
          </li>
        ))}
      </ul>
      <p className="my-4 text-[13px] text-ink-soft">진한 원은 결과를 읽은 팀원, 흐린 원은 아직 안 읽은 팀원이에요</p>
    </div>
  );
}
