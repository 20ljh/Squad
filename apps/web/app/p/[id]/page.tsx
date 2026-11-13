import type { Metadata } from "next";
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
import { meetingPath, projectPath } from "@/lib/paths";
import { AddMeetingButton } from "@/components/dashboard/AddMeetingButton";
import { memberMap } from "@/lib/format";
import { pageTitle } from "@/lib/brand";
import type { Dashboard } from "@/lib/types";
import { canViewProject, requireProjectPage } from "@/lib/auth/access";
import { pendingRequests } from "@/lib/join";
import { TeamInviteButton } from "@/components/dashboard/TeamInviteButton";
import { JoinRequestList } from "@/components/dashboard/JoinRequestList";
import { NotionSettings } from "@/components/dashboard/NotionSettings";
import { notionStatus } from "@/lib/notion-project";

// Next 14: params는 일반 객체입니다(Next 15부터는 Promise).
type Params = { params: { id: string }; searchParams?: { notion?: string } };

/** 예시 프로젝트(sample)는 예시 대시보드, 그 밖에는 DB에서 센 대시보드 (회의가 없으면 0·빈 목록) */
async function loadDashboard(projectId: string): Promise<{ data: Dashboard; sample: boolean } | null> {
  const sample = getDashboard(projectId);
  if (sample) return { data: sample, sample: true };
  const data = await getProjectDashboard(projectId);
  return data ? { data, sample: false } : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const found = (await canViewProject(params.id)) ? await loadDashboard(params.id) : null;
  return { title: pageTitle(found ? "팀 대시보드" : "프로젝트를 찾을 수 없어요") };
}

// 프로젝트 메인(/p/[id]) = 팀 대시보드
export default async function ProjectMainPage({ params, searchParams }: Params) {
  // 예시 프로젝트는 누구나, 그 밖에는 로그인한 팀원만 (아니면 로그인 화면 또는 404)
  const access = await requireProjectPage(params.id, projectPath(params.id));
  const isLeader = access?.member.role === "leader";
  const requests = isLeader ? await pendingRequests(params.id) : [];
  const notion = isLeader ? await notionStatus(params.id) : null;
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
  const canAdd = !sample;

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
        {canAdd ? (
          <section className="flex animate-fade-up flex-wrap items-end justify-between gap-4">
            <div className="flex min-w-0 flex-col gap-2">{heading}</div>
            <div className="flex flex-wrap gap-2">
              {isLeader ? <TeamInviteButton projectId={params.id} /> : null}
              <AddMeetingButton projectId={params.id} members={data.members} />
            </div>
          </section>
        ) : (
          <section className="flex animate-fade-up flex-col gap-2">{heading}</section>
        )}

        {requests.length > 0 ? (
          <section aria-labelledby="join-title" className="flex flex-col gap-4">
            <SectionHeading id="join-title" title={`참여 요청 ${requests.length}건`} description="확인 메시지와 구글 계정을 보고 우리 팀원이 맞으면 수락해 주세요." />
            <JoinRequestList
              items={requests.map((r) => ({ id: r.id, message: r.message, createdAt: r.createdAt.toISOString(), userName: r.user.name, userEmail: r.user.email }))}
            />
          </section>
        ) : null}

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

        {notion ? (
          <section id="notion" aria-labelledby="notion-title" className="flex scroll-mt-20 flex-col gap-4">
            <SectionHeading id="notion-title" title="Notion 연결" description="팀장만 볼 수 있어요. 연결해 두면 팀원 누구나 회의 결과를 Notion으로 내보낼 수 있어요." />
            <NotionSettings projectId={params.id} status={notion} flash={searchParams?.notion} />
          </section>
        ) : null}

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
