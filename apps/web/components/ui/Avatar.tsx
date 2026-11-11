import type { Member } from "@/lib/types";

type Props = {
  member: Member;
  size?: number;
  /** 흐리게(미열람 등) 표시 */
  dimmed?: boolean;
  title?: string;
};

export function Avatar({ member, size = 26, dimmed = false, title }: Props) {
  return (
    <span
      title={title ?? `${member.name} · ${member.role}`}
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.42),
        background: member.color,
        opacity: dimmed ? 0.28 : 1,
      }}
    >
      {member.initial}
    </span>
  );
}

export function MemberLegend({ members }: { members: Member[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-4 p-0">
      {members.map((m) => (
        <li key={m.id} className="flex items-center gap-1.5">
          <span className="inline-block h-[9px] w-[9px] rounded-full" style={{ background: m.color }} aria-hidden="true" />
          <span className="text-[13px] text-ink-soft">
            {m.name} · {m.role}
          </span>
        </li>
      ))}
    </ul>
  );
}
