import type { Metadata } from "next";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { ProjectNewForm, SafetyNote } from "@/components/projects/ProjectNewForm";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = { title: pageTitle("새 프로젝트 만들기") };

// 기본 프로젝트 설정(/projects/new) — 프로젝트 이름, 과목·팀 이름, 내 이름(팀장), 팀원 이름(선택)
// 만든 다음 화면(생성 완료·초대 공유)은 다음 단계에서 만듦
// 참여 흐름: 팀원이 확인 메시지를 먼저 보냄 → 팀장이 메시지를 보고 수락 → 팀원이 이름·역할 선택
const steps = [
  "초대 링크나 코드를 팀원에게 보내요",
  "팀원이 링크로 들어와 확인 메시지를 보내요",
  "메시지를 보고 내가 수락하면, 팀원이 자기 이름과 역할을 골라요",
];

function StepList() {
  return (
    // 동그라미(24px)를 글 줄 높이(28px) 가운데에 놓아(위 2px) 첫 줄이 항상 동그라미 가운데에 오게 함.
    // PC에서는 한 줄짜리 항목도 두 줄만큼(56px) 자리를 차지하게 해서 동그라미 간격을 일정하게 맞춤
    <ol className="m-0 flex list-none flex-col gap-3 p-0 md:gap-1">
      {steps.map((s, i) => (
        <li key={s} className="flex items-start gap-3 md:min-h-14">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink-soft/30 text-xs font-semibold tabular-nums text-ink">
            {i + 1}
          </span>
          <span className="text-[15px] leading-7">{s}</span>
        </li>
      ))}
    </ol>
  );
}

export default function ProjectNewPage() {
  return (
    <div className="min-h-screen break-keep bg-surface-alt [overflow-wrap:anywhere]">
      <SiteHeader context="프로젝트 만들기" nav={{ href: "/", label: "메인으로", icon: "back" }} />

      <main className="mx-auto flex w-full max-w-page flex-col gap-8 px-5 pb-16 pt-8 sm:px-8 md:pt-12">
        <section className="flex animate-fade-up flex-col gap-2">
          <h1 className="m-0 font-display text-[28px] font-bold leading-[1.3] tracking-[-.01em] md:text-[34px]">새 프로젝트 만들기</h1>
          <p className="m-0 text-base leading-[1.6] text-ink-soft">기본 정보만 넣으면 바로 시작할 수 있어요. 나중에 설정에서 바꿀 수 있어요.</p>
        </section>

        <div className="flex flex-wrap items-start gap-6 md:gap-8">
          <div className="min-w-0 flex-[999_1_560px]">
            <ProjectNewForm />
          </div>

          {/* 만든 다음 과정 + 보안 안내 (PC). 모바일은 폼 안에 보안 안내만 */}
          <aside className="hidden min-w-0 flex-[1_1_300px] flex-col gap-4 md:flex">
            <section aria-labelledby="after-title" className="flex flex-col gap-4 rounded-lg border border-ink-soft/30 bg-white p-6">
              <h2 id="after-title" className="m-0 font-display text-lg font-bold">
                만든 다음에는
              </h2>
              <StepList />
            </section>
            <SafetyNote />
          </aside>
        </div>

        {/* 모바일: 맨 아래에 접고 펼치는 "만든 다음에는" */}
        <details className="group rounded-lg border border-ink-soft/30 bg-white md:hidden">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 text-[17px] font-bold [&::-webkit-details-marker]:hidden">
            만든 다음에는
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="text-ink-soft transition-transform duration-150 group-open:rotate-180"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </summary>
          <div className="px-5 pb-5">
            <StepList />
          </div>
        </details>
      </main>
    </div>
  );
}
