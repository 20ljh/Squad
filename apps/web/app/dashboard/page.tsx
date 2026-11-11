import type { Metadata } from "next";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { KpiTile } from "@/components/dashboard/KpiTile";
import { ParticipationCard } from "@/components/dashboard/ParticipationCard";
import { HighlightList } from "@/components/dashboard/HighlightList";
import { MeetingHistory } from "@/components/dashboard/MeetingHistory";
import { MeetingSearch } from "@/components/dashboard/MeetingSearch";
import { getDashboard } from "@/lib/sample-data";
import { memberMap } from "@/lib/format";
import { pageTitle } from "@/lib/brand";

export const metadata: Metadata = { title: pageTitle("팀 대시보드") };

export default function DashboardPage() {
  const data = getDashboard();
  const byId = memberMap(data.members);
  const latest = data.rounds[data.rounds.length - 1];

  return (
    <div className="min-h-screen break-keep bg-surface-alt [overflow-wrap:anywhere]">
      <SiteHeader context="팀 대시보드" nav={{ href: "/meetings/sample", label: `${latest?.shortLabel ?? ""} 회의 결과`, icon: "back" }} />

      <main className="mx-auto flex w-full max-w-page flex-col gap-12 px-5 pb-24 pt-10 sm:px-8">
        <section className="flex animate-fade-up flex-col gap-2">
          <p className="m-0 text-sm font-semibold text-accent-strong">{data.teamName}</p>
          <h1 className="m-0 text-balance font-display text-[clamp(26px,4vw,36px)] font-bold tracking-[-.01em]">{data.headline}</h1>
          <p className="m-0 text-base tabular-nums text-ink-soft">{data.subline}</p>
        </section>

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
          <MeetingHistory rounds={data.rounds} members={data.members} />
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
