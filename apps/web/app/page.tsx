import Link from "next/link";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { InviteCodeForm } from "@/components/home/InviteCodeForm";
import { MyProjectList } from "@/components/home/MyProjectList";
import { BRAND } from "@/lib/brand";
import { getMyProjects } from "@/lib/my-projects";

// 메인(/) — 프로젝트 만들기, 초대 코드로 참여, 이 기기의 내 프로젝트
// 샘플 프로젝트는 아직 /dashboard 예시 화면으로 연결 (프로젝트 메인 /p/[id]를 만들면 옮김)
const SAMPLE_HREF = "/dashboard";

const features = [
  { no: "01", title: "안건·결정·할 일 정리", body: "누가 무엇을 언제까지 하기로 했는지 회의마다 한 페이지로 남아요." },
  { no: "02", title: "회의 흐름 마인드맵", body: "의견이 어떻게 결정으로 모였는지 한눈에 볼 수 있어요." },
  { no: "03", title: "Notion으로 내보내기", body: "정리한 결과를 팀이 이미 쓰는 Notion 페이지에 그대로 넣어줘요." },
];

function PlusIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

export default function HomePage() {
  const myProjects = getMyProjects();

  return (
    <>
      <SiteHeader nav={{ href: SAMPLE_HREF, label: "샘플 프로젝트 보기", shortLabel: "샘플 보기" }} />

      <main className="mx-auto flex w-full max-w-page flex-col gap-6 px-5 pb-16 pt-9 sm:px-8 md:gap-14 md:pb-16 md:pt-[72px]">
        <div className="flex flex-wrap items-start gap-6 md:gap-12">
          {/* 소개 + 프로젝트 만들기 */}
          <section className="flex min-w-0 flex-[1_1_460px] animate-fade-up flex-col gap-3 md:gap-5 md:pt-3">
            <p className="m-0 text-xs font-bold uppercase tracking-[.08em] text-accent-strong md:text-[13px]">Team Meeting Notes</p>
            <h1 className="m-0 font-display text-[30px] font-bold leading-[1.35] md:text-5xl md:leading-[1.3]">
              회의가 끝나면
              <br />
              정리는 {BRAND.name}가
            </h1>
            <p className="m-0 max-w-[30em] text-[15px] leading-[1.65] text-ink-soft md:text-[17px] md:leading-[1.7]">
              녹음이나 회의록을 올리면 안건·결정·할 일을 정리하고, 팀 Notion으로 보내드려요. 조별과제·캡스톤 팀을 위한 무료 서비스예요.
            </p>
            <div className="mt-3 flex flex-col gap-2.5 md:mt-2 md:flex-row md:flex-wrap md:items-center md:gap-4">
              <Link
                href="/projects/new"
                className="flex h-14 items-center justify-center gap-2 rounded-md bg-cta px-7 text-base font-bold text-white no-underline shadow-glow transition hover:shadow-glow-lg"
              >
                <PlusIcon />
                프로젝트 만들기
              </Link>
              <span className="text-center text-[13px] text-ink-soft md:text-left md:text-sm">팀장이 만들고, 팀원은 초대 링크로 참여해요</span>
            </div>
          </section>

          {/* 초대 코드 + 이 기기의 내 프로젝트 */}
          <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-6 md:gap-5">
            <section aria-labelledby="join-title" className="flex flex-col gap-3 rounded-lg bg-white p-5 shadow-soft md:p-6">
              <h2 id="join-title" className="m-0 font-display text-lg font-bold md:text-xl">
                초대 코드로 참여
              </h2>
              <label htmlFor="invite-code" className="text-[13px] text-ink-soft md:text-sm">
                팀장에게 받은 코드를 입력하세요. 링크를 받았다면 링크를 열면 돼요.
              </label>
              <InviteCodeForm />
            </section>

            <section aria-labelledby="my-projects-title" className="flex flex-col gap-3 rounded-lg bg-white p-5 shadow-soft md:p-6">
              <h2 id="my-projects-title" className="m-0 font-display text-lg font-bold md:text-xl">
                이 기기의 내 프로젝트
              </h2>
              <MyProjectList items={myProjects} />
            </section>
          </div>
        </div>

        {/* 서비스 소개 — PC에서만 (모바일은 아래 샘플 링크로 대신) */}
        <section aria-label={`${BRAND.name}가 하는 일`} className="hidden grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-5 md:grid">
          {features.map((f) => (
            <div key={f.no} className="flex flex-col gap-2 rounded-lg border border-line bg-white/80 p-[22px]">
              <span className="text-[13px] font-bold text-accent-strong">{f.no}</span>
              <h3 className="m-0 font-display text-lg font-bold">{f.title}</h3>
              <p className="m-0 text-sm leading-[1.6] text-ink-soft">{f.body}</p>
            </div>
          ))}
        </section>

        <Link href={SAMPLE_HREF} className="self-center text-sm font-medium text-accent-deep hover:text-ink md:hidden">
          샘플 프로젝트 둘러보기 →
        </Link>
      </main>
    </>
  );
}
