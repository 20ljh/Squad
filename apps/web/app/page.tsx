import Link from "next/link";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { InviteCodeForm } from "@/components/home/InviteCodeForm";
import { MyProjectList } from "@/components/home/MyProjectList";
import { BRAND } from "@/lib/brand";
import { getMyProjects } from "@/lib/my-projects";
import { getCurrentUser } from "@/lib/auth/session";
import { SAMPLE_PROJECT_ID, projectPath } from "@/lib/paths";

// 메인(/) — 프로젝트 만들기, 초대 코드로 참여, 내 프로젝트(로그인한 계정 기준)
// 샘플 프로젝트는 예시 데이터로 동작하는 프로젝트 메인(/p/sample)으로 연결
// 표현 원칙: 그라데이션·빛나는 그림자 없이 단색 면과 얇은 선으로 정리 (Flat 방향)
const SAMPLE_HREF = projectPath(SAMPLE_PROJECT_ID);

type IconName = "list" | "flow" | "export";

const features: { icon: IconName; title: string; body: string }[] = [
  { icon: "list", title: "안건·결정·할 일 정리", body: "누가 무엇을 언제까지 하기로 했는지 회의마다 한 페이지로 남아요." },
  { icon: "flow", title: "회의 흐름 마인드맵", body: "의견이 어떻게 결정으로 모였는지 한눈에 볼 수 있어요." },
  { icon: "export", title: "Notion으로 내보내기", body: "정리한 결과를 팀이 이미 쓰는 Notion 페이지에 그대로 넣어줘요." },
];

function Icon({ name }: { name: IconName | "plus" | "chevron" }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "chevron":
      return (
        <svg {...common} width={16} height={16}>
          <path d="M9 6l6 6-6 6" />
        </svg>
      );
    case "list":
      return (
        <svg {...common}>
          <path d="M9 6h11M9 12h11M9 18h11" />
          <path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2" />
        </svg>
      );
    case "flow":
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="2" />
          <circle cx="19" cy="6" r="2" />
          <circle cx="19" cy="18" r="2" />
          <path d="M7 12h4l6-6M11 12l6 6" />
        </svg>
      );
    case "export":
      return (
        <svg {...common}>
          <path d="M14 4h6v6M20 4l-9 9" />
          <path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
        </svg>
      );
  }
}

export default async function HomePage() {
  const user = await getCurrentUser();
  const myProjects = user ? await getMyProjects(user.id) : null;

  return (
    <div className="min-h-screen break-keep bg-surface-alt [overflow-wrap:anywhere]">
      <SiteHeader nav={{ href: SAMPLE_HREF, label: "샘플 프로젝트 보기", shortLabel: "샘플 보기" }} />

      <main className="mx-auto flex w-full max-w-page flex-col gap-8 px-5 pb-16 pt-10 sm:px-8 md:gap-16 md:pt-20">
        <div className="flex flex-wrap items-start gap-8 md:gap-12">
          {/* 소개 + 프로젝트 만들기 */}
          <section className="flex min-w-0 flex-[1_1_460px] animate-fade-up flex-col gap-4 md:gap-5 md:pt-2">
            <p className="m-0 text-sm font-semibold text-accent-strong">Team Meeting Notes</p>
            <h1 className="m-0 text-balance font-display text-[32px] font-bold leading-[1.3] tracking-[-.02em] md:text-[52px] md:leading-[1.2]">
              회의가 끝나면
              <br />
              정리는 {BRAND.name}가
            </h1>
            <p className="m-0 max-w-[30em] text-base leading-[1.7] text-ink-soft md:text-lg">
              녹음이나 회의록을 올리면 안건·결정·할 일을 정리하고, 팀 Notion으로 보내드려요. 조별과제·캡스톤 팀을 위한 무료 서비스예요.
            </p>
            <div className="mt-2 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-5">
              <Link
                href="/projects/new"
                className="flex h-14 items-center justify-center gap-2 rounded-sm bg-accent-strong px-7 text-base font-bold text-white no-underline transition-colors duration-150 hover:bg-accent-deep"
              >
                <Icon name="plus" />
                프로젝트 만들기
              </Link>
              <span className="text-center text-sm text-ink-soft md:text-left">팀장이 만들고, 팀원은 초대 링크로 참여해요</span>
            </div>
          </section>

          {/* 초대 코드 + 내 프로젝트 */}
          <div className="flex min-w-0 flex-[1_1_400px] flex-col gap-4">
            <section aria-labelledby="join-title" className="flex flex-col gap-3 rounded-lg border border-line bg-white p-5 md:p-6">
              <h2 id="join-title" className="m-0 font-display text-lg font-bold md:text-xl">
                초대 코드로 참여
              </h2>
              <label htmlFor="invite-code" className="text-sm text-ink-soft">
                팀장에게 받은 코드를 입력하세요. 링크를 받았다면 링크를 열면 돼요.
              </label>
              <InviteCodeForm />
            </section>

            <section aria-labelledby="my-projects-title" className="flex flex-col gap-3 rounded-lg border border-line bg-white p-5 md:p-6">
              <h2 id="my-projects-title" className="m-0 font-display text-lg font-bold md:text-xl">
                내 프로젝트
              </h2>
              <MyProjectList items={myProjects} />
            </section>
          </div>
        </div>

        {/* 서비스 소개 — PC에서만 (모바일은 아래 샘플 링크로 대신). 카드 대신 위쪽 선으로 구분한 세 단 */}
        <section aria-label={`${BRAND.name}가 하는 일`} className="hidden grid-cols-3 gap-10 border-t border-line pt-10 md:grid">
          {features.map((f) => (
            <div key={f.title} className="flex flex-col gap-2">
              <span className="mb-1 inline-flex h-10 w-10 items-center justify-center rounded-sm bg-white text-accent-strong">
                <Icon name={f.icon} />
              </span>
              <h3 className="m-0 font-display text-lg font-bold">{f.title}</h3>
              <p className="m-0 text-[15px] leading-[1.65] text-ink-soft">{f.body}</p>
            </div>
          ))}
        </section>

        <Link
          href={SAMPLE_HREF}
          className="inline-flex min-h-11 items-center gap-1 self-center text-[15px] font-semibold text-accent-deep transition-colors duration-150 hover:text-ink md:hidden"
        >
          샘플 프로젝트 둘러보기
          <Icon name="chevron" />
        </Link>
      </main>
    </div>
  );
}
