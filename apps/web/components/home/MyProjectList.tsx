import Link from "next/link";
import type { MyProject } from "@/lib/my-projects";

const badge: Record<MyProject["status"], { label: string; className: string }> = {
  leader: { label: "팀장", className: "bg-accent-soft text-accent-deep" },
  member: { label: "팀원", className: "bg-surface-alt text-ink-soft" },
  pending: { label: "승인 대기", className: "bg-warn-soft text-warn" },
};

// items가 null이면 로그인 전 → 로그인 안내
export function MyProjectList({ items }: { items: MyProject[] | null }) {
  if (!items) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-line px-4 py-6 text-center">
        <p className="m-0 text-[15px] text-ink-soft">로그인하면 내가 만들거나 참여한 프로젝트가 여기에 보여요.</p>
        <Link
          href="/login"
          className="inline-flex min-h-11 items-center rounded-sm border border-ink-soft/50 bg-white px-5 text-[15px] font-semibold text-ink no-underline transition-colors duration-150 hover:border-accent hover:text-accent-strong"
        >
          구글 계정으로 로그인
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <div className="flex flex-col gap-1 rounded-sm border border-dashed border-line px-4 py-6 text-center">
          <p className="m-0 text-sm font-semibold text-ink">아직 프로젝트가 없어요</p>
          <p className="m-0 text-[13px] text-ink-soft">프로젝트를 만들거나 초대 코드로 참여하면 여기에 보여요.</p>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {items.map((p) => {
            const b = badge[p.status];
            const row = "flex items-center justify-between gap-3 rounded-sm border border-line bg-white px-4 py-3.5 text-ink no-underline sm:px-[18px] sm:py-4";
            const inner = (
              <>
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-bold sm:text-base">{p.name}</span>
                  <span className="truncate text-xs text-ink-soft sm:text-[13px]">{p.meta}</span>
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${b.className}`}>{b.label}</span>
              </>
            );
            return (
              <li key={p.id}>
                {/* 승인 대기는 아직 들어갈 수 없어서 링크가 아님 */}
                {p.href ? (
                  <Link href={p.href} className={`${row} transition-colors duration-150 hover:border-accent`}>
                    {inner}
                  </Link>
                ) : (
                  <div className={row}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
