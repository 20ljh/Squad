// 메인 화면의 대표 장면: 회의가 끝난 뒤 남는 결과 한 장을 미리 보여주는 예시.
// 실제 회의 결과 화면(안건 → 결정 → 담당·마감)과 같은 구조를 코드로 그린 것이고, 데이터는 예시.
// 결정 문구에만 형광펜 표시(bg-marker)를 써서, 제목의 표시와 같은 뜻(= 정리된 핵심)을 갖게 함.

import Link from "next/link";
import type { PreviewData } from "@/lib/home-preview";

type Row = { agenda: string; decision: string | null; owner: string; due: string };

const meeting = {
  title: "3차 정기회의",
  meta: ["2026년 9월 22일 (화) 19:00–20:15", "Discord 음성채널", "참석 4명"],
};

const rows: Row[] = [
  { agenda: "UI 디자인 시안 선택", decision: "Figma B안 채택, 스타일가이드 문서화", owner: "지현", due: "10/3 (토)" },
  { agenda: "백엔드 API 설계 방향", decision: "REST 방식 확정, API 명세서 초안 작성", owner: "민수", due: "10/12 (월)" },
  { agenda: "발표 일정 조율", decision: "10/5 중간발표까지 데모 프로토타입 완성", owner: "전원", due: "10/5 (월)" },
];

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

// data가 있으면 내 프로젝트의 최근 회의, 없으면(로그인 전·정리된 회의 없음) 위의 예시
export function ResultPreview({ data }: { data?: PreviewData | null }) {
  const view = data ?? { title: meeting.title, meta: meeting.meta, rows, footerLeft: "업무 3개 | 다음 마감 10/3 (토)", footerRight: "Notion에 내보냄", href: null as string | null };
  return (
    <figure className="m-0 overflow-hidden rounded-lg border border-ink-soft/40 bg-white shadow-soft">
      {/* 회의 머리말 */}
      <div className="flex flex-col gap-1 border-b border-ink-soft/25 px-5 py-4 md:flex-row md:items-baseline md:justify-between md:px-6">
        {view.href ? (
          <Link href={view.href} className="text-base font-semibold text-ink no-underline transition-colors duration-150 hover:text-accent-strong">
            {view.title}
          </Link>
        ) : (
          <p className="m-0 text-base font-semibold">{view.title}</p>
        )}
        <p className="m-0 flex flex-wrap gap-x-2 text-[13px] tabular-nums text-ink-soft">
          {view.meta.map((m, i) => (
            <span key={m} className="whitespace-nowrap">
              {i > 0 ? <span aria-hidden="true">| </span> : null}
              {m}
            </span>
          ))}
        </p>
      </div>

      {/* 표 머리 (PC) */}
      <div className="hidden grid-cols-[1.1fr_1.6fr_64px_88px] gap-4 border-b border-ink-soft/25 px-6 py-2 text-xs text-ink-soft md:grid">
        <span>안건</span>
        <span>결정</span>
        <span>담당</span>
        <span className="text-right">마감</span>
      </div>

      <ol className="m-0 list-none p-0">
        {(view.rows as Row[]).map((r, i) => (
          <li
            key={r.agenda}
            className="flex flex-col gap-2 border-b border-ink-soft/25 px-5 py-4 last:border-b-0 md:grid md:grid-cols-[1.1fr_1.6fr_64px_88px] md:items-baseline md:gap-4 md:px-6"
          >
            <span className="flex items-baseline gap-2 text-[15px] font-medium">
              <span className="w-4 shrink-0 text-xs tabular-nums text-ink-soft">{i + 1}</span>
              {r.agenda}
            </span>
            <span className="flex items-baseline gap-2 pl-6 text-[15px] md:pl-0">
              {/* 결정이 있을 때만 체크 (없는 안건은 아이콘 자리만 비워 글자 줄을 맞춤) */}
              <span className={`relative top-[3px] w-4 shrink-0 ${r.decision ? "text-accent-strong" : "invisible"}`}>
                <CheckIcon />
              </span>
              <span>
                {r.decision ? <span className="bg-marker box-decoration-clone">{r.decision}</span> : <span className="text-ink-soft">결정 없이 다음 회의로</span>}
              </span>
            </span>
            <span className="flex gap-3 pl-6 text-[13px] text-ink-soft md:contents md:pl-0 md:text-sm">
              <span className="md:text-ink">
                <span className="md:hidden">담당 </span>
                {r.owner}
              </span>
              <span className="tabular-nums md:text-right md:text-ink">
                <span className="md:hidden">마감 </span>
                {r.due}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {/* 꼬리말: 할 일 요약 + 내보내기 상태 */}
      <div className="flex flex-col gap-1 border-t border-ink-soft/25 bg-surface-alt px-5 py-3 text-[13px] text-ink-soft md:flex-row md:justify-between md:px-6">
        <span className="tabular-nums">{view.footerLeft}</span>
        <span>{view.footerRight}</span>
      </div>
      <figcaption className="sr-only">{data ? "내 프로젝트의 최근 회의 결과" : "회의 결과 예시"}: 안건과 각 결정, 담당, 마감</figcaption>
    </figure>
  );
}
