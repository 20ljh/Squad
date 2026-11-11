import type { Metadata } from "next";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { ProjectNewForm, SafetyNote } from "@/components/projects/ProjectNewForm";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = { title: pageTitle("새 프로젝트 만들기") };

// 기본 프로젝트 설정(/projects/new) — 프로젝트 이름, 과목·팀 이름, 내 이름(팀장), 팀원 이름(선택)
// 만든 다음 화면(생성 완료·초대 공유)은 다음 단계에서 만듦
const steps = ["초대 링크나 코드를 팀원에게 보내요", "팀원이 이름을 골라 참여를 요청해요", "확인 코드가 같은지 보고 내가 승인해요"];

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
            <section aria-labelledby="after-title" className="flex flex-col gap-4 rounded-lg border border-line bg-white p-6">
              <h2 id="after-title" className="m-0 font-display text-lg font-bold">
                만든 다음에는
              </h2>
              <ol className="m-0 flex list-none flex-col gap-3.5 p-0">
                {steps.map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-[13px] font-semibold tabular-nums text-ink">
                      {i + 1}
                    </span>
                    <span className="pt-0.5 text-[15px] leading-[1.6]">{s}</span>
                  </li>
                ))}
              </ol>
            </section>
            <SafetyNote />
          </aside>
        </div>
      </main>
    </div>
  );
}
