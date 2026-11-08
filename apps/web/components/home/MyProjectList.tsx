import Link from "next/link";
import type { MyProject } from "@/lib/my-projects";

const badge: Record<MyProject["status"], { label: string; className: string }> = {
  leader: { label: "팀장", className: "bg-accent-soft text-accent-deep" },
  member: { label: "팀원", className: "bg-surface-alt text-ink-soft" },
  pending: { label: "승인 대기", className: "bg-warn-soft text-warn" },
};

export function MyProjectList({ items }: { items: MyProject[] }) {
  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <div className="flex flex-col gap-1 rounded-sm border border-dashed border-line px-4 py-6 text-center">
          <p className="m-0 text-sm font-semibold text-ink">아직 이 기기로 들어간 프로젝트가 없어요</p>
          <p className="m-0 text-[13px] text-ink-soft">프로젝트를 만들거나 초대 코드로 참여하면 여기에 보여요.</p>
        </div>
      ) : (
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {items.map((p) => {
            const b = badge[p.status];
            return (
              <li key={p.id}>
                <Link
                  href={p.href}
                  className="flex items-center justify-between gap-3 rounded-sm border border-line bg-white px-4 py-3.5 text-ink no-underline transition-colors duration-150 hover:border-accent sm:px-[18px] sm:py-4"
                >
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate text-[15px] font-bold sm:text-base">{p.name}</span>
                    <span className="truncate text-xs text-ink-soft sm:text-[13px]">{p.meta}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${b.className}`}>{b.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <p className="m-0 text-xs text-ink-soft sm:text-[13px]">계정 없이 쓰기 때문에, 이 브라우저에서 들어간 프로젝트만 보여요.</p>
    </div>
  );
}
