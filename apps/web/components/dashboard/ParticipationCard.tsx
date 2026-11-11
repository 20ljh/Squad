import type { Member, Participation } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";

export function ParticipationCard({ member, data }: { member: Member; data: Participation }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-5">
      <div className="flex items-center gap-3">
        <Avatar member={member} size={32} />
        <div>
          <p className="m-0 text-[15px] font-bold">{member.name}</p>
          <p className="m-0 text-[13px] text-ink-soft">{member.role}</p>
        </div>
      </div>
      <div className="flex justify-between text-[13px] tabular-nums text-ink-soft">
        <span>
          액션아이템 {data.actionDone}/{data.actionTotal}
        </span>
        <span>
          출석 {data.attendDone}/{data.attendTotal}
        </span>
      </div>
    </div>
  );
}
