import type { Member, MeetingRound } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";

type Props = {
  rounds: MeetingRound[];
  members: Member[];
};

export function MeetingHistory({ rounds, members }: Props) {
  return (
    <div className="rounded-lg border border-line bg-white px-5 py-1 md:px-6">
      <ul className="m-0 list-none p-0">
        {rounds.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-4 border-b border-line py-4">
            <div className="min-w-[150px]">
              <p className="m-0 text-[15px] font-bold">{r.title}</p>
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
