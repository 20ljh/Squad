import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { KpiTile } from "@/components/dashboard/KpiTile";
import { ParticipationCard } from "@/components/dashboard/ParticipationCard";
import { HighlightList } from "@/components/dashboard/HighlightList";
import { MeetingHistory } from "@/components/dashboard/MeetingHistory";
import { MeetingSearch } from "@/components/dashboard/MeetingSearch";
import { getDashboard } from "@/lib/sample-data";
import { getProjectDashboard } from "@/lib/dashboard";
import { meetingIdsWithResult } from "@/lib/meetings";
import { meetingPath, newMeetingPath } from "@/lib/paths";
import { memberMap } from "@/lib/format";
import { pageTitle } from "@/lib/brand";
import type { Dashboard } from "@/lib/types";

// Next 14: params는 일반 객체입니다(Next 15부터는 Promise).
type Params = { params: { id: string } };

/** 예시 프로젝트(sample)는 예시 대시보드, 그 밖에는 DB에서 센 대시보드 (회의가 없으면 0·빈 목록) */
async function loadDashboard(projectId: string): Promise<{ data: Dashboard; sample: boolean } | null> {
  const sample = getDashboard(projectId);
  if (sample) return { data: sample, sample: true };
  const data = await getProjectDashboard(projectId);
  return data ? { data, sample: false } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = await loadDashboard(params.id);
  return { title: pageTitle(found ? "팀 대시보드" : "프로젝트를 찾을 수 없어요") };
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

// 프로젝트 메인(/p/[id]) = 팀 대시보드
export default async function ProjectMainPage({ params }: Params) {
  const found = await loadDashboard(params.id);
  if (!found) notFound();
  const { data, sample } = found;

  const byId = memberMap(data.members);
  // 결과 페이지가 있는(DB에 있는) 회의만 링크로 연결 (예시 프로젝트는 3차 회의만 있음)
  const withResult = await meetingIdsWithResult(params.id);
  const meetingHrefs: Record<string, string> = {};
  for (const r of data.rounds) {
    if (withResult.has(r.id)) meetingHrefs[r.id] = meetingPath(params.id, r.id);
  }
  const latest = [...data.rounds].reverse().find((r) => meetingHrefs[r.id]);
  // 회의 추가는 DB 프로젝트만 (예시 프로젝트는 보기 전용)
  const addHref = sample ? undefined : newMeetingPath(params.id);

  const heading = (
    <>
      <p className="m-0 text-sm font-semibold text-accent-strong">{data.teamName}</p>
      <h1 className="m-0 text-balance font-display text-[clamp(26px,4vw,36px)] font-bold tracking-[-.01em]">{data.headline}</h1>
      <p className="m-0 text-base tabular-nums text-ink-soft">{data.subline}</p>
    </>
  );

  return (
    <div className="min-h-screen break-keep bg-surface-alt [overflow-wrap:anywhere]">
      <SiteHeader
        context="팀 대시보드"
        nav={
          latest
            ? { href: meetingHrefs[latest.id], label: latest.resultLabel ?? `${latest.shortLabel} 회의 결과`, shortLabel: "최근 회의" }
            : undefined
        }
      />

      <main className="mx-auto flex w-full max-w-page flex-col gap-12 px-5 pb-24 pt-10 sm:px-8">
        {addHref ? (
          <section className="flex animate-fade-up flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2">{heading}</div>
            <Link
              href={addHref}
              className="inline-flex h-12 items-center gap-2 rounded-sm bg-accent-strong px-6 text-base font-bold text-white no-underline transition-colors duration-150 hover:bg-accent-deep"
            >
              <PlusIcon />
              회의 기록 추가
            </Link>
          </section>
        ) : (
          <section className="flex animate-fade-up flex-col gap-2">{heading}</section>
        )}

        <section aria-label="핵심 지표" className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          {data.kpis.map((k) => (
            <KpiTile key={k.label} kpi={k} />
          ))}
        </section>

        <section aria-labelledby="participation-title" className="flex flex-col gap-4">
          <SectionHeading id="participation-title" title="팀원별 참여 현황" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4">
            {data.participation.map((p) => {
              const m = byId[p.memberId];
              return m ? <ParticipationCard key={p.memberId} member={m} data={p} /> : null;
            })}
          </div>
        </section>

        <section aria-labelledby="highlight-title" className="flex flex-col gap-4">
          <SectionHeading id="highlight-title" title="하이라이트 인용구" />
          <HighlightList items={data.highlights} />
        </section>

        <section aria-labelledby="history-title" className="flex flex-col gap-4">
          <SectionHeading id="history-title" title="회의 기록과 캐치업 현황" />
          <MeetingHistory rounds={data.rounds} members={data.members} hrefs={meetingHrefs} />
        </section>

        <section aria-labelledby="search-title" className="flex flex-col gap-4">
          <SectionHeading
            id="search-title"
            title="회의 기록 검색"
            description="지난 회의 전체에서 “언제, 왜 그렇게 정했는지” 바로 찾아드려요."
          />
          <MeetingSearch sample={data.sampleSearch} />
        </section>
      </main>
    </div>
  );
}
