import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Avatar, MemberLegend } from "@/components/ui/Avatar";
import { AgendaCard } from "@/components/meeting/AgendaCard";
import { MindMap } from "@/components/meeting/MindMap";
import { ScheduleList } from "@/components/meeting/ScheduleList";
import { ExportBar } from "@/components/meeting/ExportBar";
import { getMeeting } from "@/lib/meetings";
import { meetingPath, projectPath } from "@/lib/paths";
import { canViewProject, isPublicProject, requireProjectPage } from "@/lib/auth/access";
import { notionStatus } from "@/lib/notion-project";
import { db } from "@/lib/db";
import { formatFullDate, memberMap } from "@/lib/format";
import { pageTitle } from "@/lib/brand";
import { STATUS_LABEL } from "@/lib/projects";
import { MeetingProgress } from "@/components/meeting/MeetingProgress";
import { MeetingTabs } from "@/components/meeting/MeetingTabs";
import { TranscriptPlayer } from "@/components/meeting/TranscriptPlayer";
import { ActionList } from "@/components/meeting/ActionList";

// Next 14: params는 일반 객체입니다(Next 15부터는 Promise).
type Params = { params: { id: string; mid: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  // 팀원이 아니면 회의 이름도 알리지 않음
  const meeting = (await canViewProject(params.id)) ? await getMeeting(params.id, params.mid) : null;
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

export default async function MeetingResultPage({ params }: Params) {
  // 예시 프로젝트는 누구나, 그 밖에는 로그인한 팀원만
  const access = await requireProjectPage(params.id, meetingPath(params.id, params.mid));
  // 팀원이면 할 일 체크·하이라이트 ☆를 바꿀 수 있음 (예시 프로젝트는 보기만)
  const canEdit = access !== null;
  const meeting = await getMeeting(params.id, params.mid);
  if (!meeting) notFound();

  const byId = memberMap(meeting.members);
  const attendees = meeting.attendeeIds.map((id) => byId[id]).filter(Boolean);
  // 매핑 전 화자("speaker:…" 임시 팀원)는 팀원 수에 넣지 않음
  const teamSize = meeting.members.filter((m) => !m.id.startsWith("speaker:")).length;
  const decisionCount = meeting.agenda.filter((a) => a.decision).length;
  const [, mm, dd] = meeting.date.split("-").map(Number);
  // 예시 데이터는 상태가 없음 = 정리 완료. 그 밖에는 녹음 올리기·처리 단계를 보여 줌
  const status = meeting.status ?? "done";
  const done = status === "done";
  // 내보내기: 예시 프로젝트는 Markdown 복사만. 그 밖에는 팀장이 Notion을 연결하고 페이지를 골랐는지
  let notion: { ready: boolean; pageTitle: string | null; lastUrl: string | null } | null = null;
  if (done && !isPublicProject(params.id)) {
    const [ns, row] = await Promise.all([notionStatus(params.id), db.meeting.findUnique({ where: { id: meeting.id }, select: { notionPageUrl: true } })]);
    notion = { ready: ns.connected && Boolean(ns.pageId), pageTitle: ns.pageTitle, lastUrl: row?.notionPageUrl ?? null };
  }

  return (
    <div className="min-h-screen break-keep bg-surface-alt [overflow-wrap:anywhere]">
      <SiteHeader context="회의 결과 기록" nav={{ href: projectPath(params.id), label: "팀 대시보드", icon: "back" }} />

      <main className="mx-auto flex w-full max-w-page flex-col gap-12 px-5 pb-24 pt-10 sm:px-8">
        <section className="flex animate-fade-up flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <p className="mb-2 text-sm font-semibold text-accent-strong">{meeting.teamName}</p>
              <h1 className="m-0 text-balance font-display text-[clamp(26px,4vw,36px)] font-bold tracking-[-.01em]">
                {done ? meeting.title : meeting.shortTitle}
              </h1>
            </div>
            {done ? (
              <p className="m-0 flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-[13px] font-semibold tabular-nums text-accent-strong">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                STT 전사 완료 · {meeting.transcriptDuration}
              </p>
            ) : (
              <p
                className={`m-0 rounded-full px-3 py-1.5 text-[13px] font-semibold ${status === "failed" ? "bg-warn-soft text-warn" : "border border-line bg-white text-ink-soft"}`}
              >
                {STATUS_LABEL[status]}
              </p>
            )}
          </div>

          <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4 rounded-lg border border-line bg-white p-5">
            <MetaItem label="일자">
              <span className="font-display tabular-nums">{formatFullDate(meeting.date)}</span>
            </MetaItem>
            <MetaItem label="시간">
              <span className="font-display tabular-nums">{meeting.timeRange}</span>
            </MetaItem>
            <MetaItem label="방식">{meeting.mode}</MetaItem>
            <MetaItem label={`참석 (${attendees.length}/${teamSize})`}>
              <span className="flex gap-1.5">
                {attendees.map((m) => (
                  <Avatar key={m.id} member={m} />
                ))}
              </span>
            </MetaItem>
          </dl>
        </section>

        {!done ? (
          <MeetingProgress
            meetingId={meeting.id}
            status={status}
            speakerCount={meeting.speakerCount}
            processing={meeting.processing}
            failReason={meeting.failReason}
            mapping={meeting.mapping}
          />
        ) : null}

        {done ? (
          <MeetingTabs
            transcript={<TranscriptPlayer meetingId={meeting.id} record={meeting.record ?? { hasAudio: false, lines: [] }} members={meeting.members} />}
            summary={
              <>
                <section id="summary" aria-labelledby="summary-title" className="flex scroll-mt-20 flex-col gap-4">
                  <SectionHeading id="summary-title" title="안건별 논의와 결정" />
                  {meeting.agenda.map((item) => (
                    <AgendaCard key={item.id} item={item} members={byId} canPin={canEdit} />
                  ))}
                </section>

                {meeting.actions && meeting.actions.length > 0 ? (
                  <section id="actions" aria-labelledby="actions-title" className="flex scroll-mt-20 flex-col gap-4">
                    <SectionHeading id="actions-title" title="할 일" description={canEdit ? "끝낸 일은 체크해 주세요. 대시보드에 바로 반영돼요." : undefined} />
                    <ActionList items={meeting.actions} members={byId} canEdit={canEdit} />
                  </section>
                ) : null}

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
                  notion={notion}
                  summary={`안건 ${meeting.agenda.length}건 · 결정사항 ${decisionCount}건 · 일정 ${meeting.schedules.length}건이 함께 정리돼요.`}
                />
              </>
            }
          />
        ) : null}
      </main>
    </div>
  );
}
