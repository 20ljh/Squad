import type { Member } from "@/lib/types";

type Props = {
  member: Member;
  size?: number;
  /** 흐리게(미열람 등) 표시 */
  dimmed?: boolean;
  title?: string;
};

// 아바타는 중성 색(종이색 원 + 먹 글자)으로 통일. 팀원 색은 마인드맵·범례·원문의 작은 점에만
export function Avatar({ member, size = 26, dimmed = false, title }: Props) {
  return (
    <span
      title={title ?? `${member.name} | ${member.role}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full border font-medium ${
        dimmed ? "border-line bg-white text-ink-soft/60" : "border-line bg-surface-alt text-ink"
      }`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
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
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: m.color }} aria-hidden="true" />
          {/* 마인드맵 범례는 이름만 (맡은 일은 안건 카드에서 보여 줌) */}
          <span className="text-[15px] text-ink-soft">{m.name}</span>
        </li>
      ))}
    </ul>
  );
}
