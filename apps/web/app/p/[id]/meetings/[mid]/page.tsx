import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Avatar, MemberLegend } from "@/components/ui/Avatar";
import { AgendaCard } from "@/components/meeting/AgendaCard";
import { MindMap } from "@/components/meeting/MindMap";
import { ScheduleList } from "@/components/meeting/ScheduleList";
import { ExportBar } from "@/components/meeting/ExportBar";
import { getMeeting } from "@/lib/sample-data";
import { projectPath } from "@/lib/paths";
import { formatFullDate, memberMap } from "@/lib/format";
import { pageTitle } from "@/lib/brand";

// Next 14: params는 일반 객체입니다(Next 15부터는 Promise).
type Params = { params: { id: string; mid: string } };

export function generateMetadata({ params }: Params): Metadata {
  const meeting = getMeeting(params.id, params.mid);
  return { title: pageTitle(meeting ? meeting.title : "회의를 찾을 수 없어요") };
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="mb-1 text-[13px] text-ink-soft">{label}</dt>
      <dd className="m-0 text-[15px] font-semibold">{children}</dd>
    </div>
  );
}

export default function MeetingResultPage({ params }: Params) {
  const meeting = getMeeting(params.id, params.mid);
  if (!meeting) notFound();

  const byId = memberMap(meeting.members);
  const attendees = meeting.attendeeIds.map((id) => byId[id]).filter(Boolean);
  const decisionCount = meeting.agenda.filter((a) => a.decision).length;
  const [, mm, dd] = meeting.date.split("-").map(Number);

  return (
    <div className="min-h-screen break-keep bg-surface-alt [overflow-wrap:anywhere]">
      <SiteHeader context="회의 결과 기록" nav={{ href: projectPath(params.id), label: "팀 대시보드", icon: "back" }} />

      <main className="mx-auto flex w-full max-w-page flex-col gap-12 px-5 pb-24 pt-10 sm:px-8">
        <section className="flex animate-fade-up flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="mb-2 text-sm font-semibold text-accent-strong">{meeting.teamName}</p>
              <h1 className="m-0 text-balance font-display text-[clamp(26px,4vw,36px)] font-bold tracking-[-.01em]">{meeting.title}</h1>
            </div>
            <p className="m-0 flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-semibold tabular-nums text-accent-strong">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              STT 전사 완료 · {meeting.transcriptDuration}
            </p>
          </div>

          <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4 rounded-lg border border-line bg-white p-5">
            <MetaItem label="일자">
              <span className="font-display tabular-nums">{formatFullDate(meeting.date)}</span>
            </MetaItem>
            <MetaItem label="시간">
              <span className="font-display tabular-nums">{meeting.timeRange}</span>
            </MetaItem>
            <MetaItem label="방식">{meeting.mode}</MetaItem>
            <MetaItem label={`참석 (${attendees.length}/${meeting.members.length})`}>
              <span className="flex gap-1.5">
                {attendees.map((m) => (
                  <Avatar key={m.id} member={m} />
                ))}
              </span>
            </MetaItem>
          </dl>
        </section>

        <section id="summary" aria-labelledby="summary-title" className="flex scroll-mt-20 flex-col gap-4">
          <SectionHeading id="summary-title" title="안건별 논의와 결정" />
          {meeting.agenda.map((item) => (
            <AgendaCard key={item.id} item={item} members={byId} />
          ))}
        </section>

        <section id="mindmap" aria-labelledby="mindmap-title" className="flex scroll-mt-20 flex-col gap-4">
          <SectionHeading id="mindmap-title" title="논의 흐름 마인드맵" />
          <div className="flex flex-col gap-4 rounded-lg border border-line bg-white px-5 py-6 md:px-6">
            <figure className="m-0">
              <p className="mb-2 text-[13px] text-ink-soft sm:hidden">옆으로 밀어서 전체 흐름을 볼 수 있어요</p>
              <div className="overflow-x-auto">
                <MindMap
                  meetingLabel={meeting.shortTitle}
                  meetingSub={`${mm}/${dd} · ${attendees.length}인 참석`}
                  agenda={meeting.agenda}
                  members={byId}
                />
              </div>
              <figcaption className="mt-3 text-[13px] text-ink-soft">
                화살표는 팀원 의견이 결정으로 모이는 흐름을, 카드 왼쪽 색 막대는 발언한 팀원을 나타냅니다.
              </figcaption>
            </figure>
            <MemberLegend members={meeting.members} />
          </div>
        </section>

        <section id="schedule" aria-labelledby="schedule-title" className="flex scroll-mt-20 flex-col gap-4">
          <SectionHeading id="schedule-title" title="회의 중 언급된 일정" />
          <ScheduleList items={meeting.schedules} baseDate={meeting.date} />
        </section>

        <ExportBar
          meetingId={meeting.id}
          summary={`안건 ${meeting.agenda.length}건 · 결정사항 ${decisionCount}건 · 일정 ${meeting.schedules.length}건이 함께 정리돼요.`}
        />
      </main>
    </div>
  );
}
