import { db } from "./db";
import { toKstIso } from "./meetings";
import { STATUS_LABEL, type MeetingStatus } from "./projects";
import { dDay } from "./format";
import type { Dashboard } from "./types";

// DB에 만든 프로젝트의 팀 대시보드. 예시 프로젝트(sample)와 같은 구성으로, 값은 DB에서 셈.
// 회의가 없으면 숫자는 0, 목록은 비어 있고 화면이 "아직 회의가 없어요"를 보여 줌.

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DAY = 86_400_000;

function dateLabel(date: Date): string {
  const [y, m, d] = toKstIso(date).split("-").map(Number);
  return `${m}/${d}(${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

function totalDuration(sec: number): string {
  if (sec <= 0) return "녹음 없음";
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `총 ${h}시간 ${m}분 녹음` : `총 ${m}분 녹음`;
}

/** 제목 아래 한 줄: "n회차 회의 진행 · {가장 가까운 일정}까지 D-n". 앞·뒤 중 없는 쪽은 빼고, 둘 다 없으면 안내 */
function subline(meetingCount: number, nextDue: string | null): string {
  const parts = [meetingCount ? `${meetingCount}회차 회의 진행` : null, nextDue].filter(Boolean);
  return parts.length ? parts.join(" · ") : "아직 회의 기록이 없어요";
}

export async function getProjectDashboard(projectId: string): Promise<Dashboard | null> {
  const p = await db.project.findUnique({
    where: { id: projectId },
    include: {
      members: { orderBy: { order: "asc" } },
      meetings: {
        orderBy: { startedAt: "asc" },
        include: {
          attendances: true,
          reads: true,
          agendaItems: { include: { actionItems: true, opinions: { where: { pinned: true } } } },
          schedules: true,
        },
      },
    },
  });
  if (!p) return null;

  const now = Date.now();
  const actions = p.meetings.flatMap((m) => m.agendaItems.flatMap((a) => a.actionItems));
  const open = actions.filter((a) => !a.done);
  const dueSoon = open.filter((a) => a.dueDate && a.dueDate.getTime() - now <= 3 * DAY && a.dueDate.getTime() >= now - DAY);
  const dueThisWeek = open.filter((a) => a.dueDate && a.dueDate.getTime() - now <= 7 * DAY);
  const doneMeetings = p.meetings.filter((m) => m.status === "done");

  // 가장 가까운 다음 일정: 회의에서 나온 일정 + 끝나지 않은 할 일 + 프로젝트 최종 마감 중
  // 오늘(D-DAY)은 건너뛰고 내일 이후 중 가장 빠른 것
  const today = toKstIso(new Date());
  const candidates = [
    ...p.meetings.flatMap((m) => m.schedules.flatMap((x) => (x.dueDate ? [{ label: x.label, date: x.dueDate }] : []))),
    ...open.flatMap((a) => (a.dueDate ? [{ label: a.title, date: a.dueDate }] : [])),
    ...(p.deadline ? [{ label: "최종 마감", date: p.deadline }] : []),
  ]
    .map((c) => ({ label: c.label, iso: toKstIso(c.date) }))
    .filter((c) => c.iso > today)
    .sort((a, b) => a.iso.localeCompare(b.iso));
  const nextDue = candidates[0] ? `${candidates[0].label}까지 ${dDay(candidates[0].iso, today)}` : null;

  return {
    teamName: p.course ? `${p.name} · ${p.course}` : p.name,
    headline: "프로젝트 진행 현황",
    subline: subline(p.meetings.length, nextDue),
    members: p.members.map((m) => ({ id: m.id, name: m.name, role: m.position || "맡은 일 미정", initial: m.initial, color: m.color })),
    kpis: [
      { label: "진행중 액션아이템", value: `${open.length}건`, hint: `이번 주 마감 ${dueThisWeek.length}건` },
      { label: "마감 임박", value: `${dueSoon.length}건`, hint: "3일 이내", tone: "warn" },
      {
        label: "누적 회의",
        value: `${p.meetings.length}회`,
        hint: totalDuration(p.meetings.reduce((s, m) => s + (m.durationSec ?? 0), 0)),
      },
    ],
    participation: p.members.map((mem) => {
      const mine = actions.filter((a) => a.memberId === mem.id);
      const attended = p.meetings.filter((m) => m.attendances.some((a) => a.memberId === mem.id && a.present));
      return {
        memberId: mem.id,
        actionDone: mine.filter((a) => a.done).length,
        actionTotal: mine.length,
        attendDone: attended.length,
        attendTotal: p.meetings.length,
      };
    }),
    rounds: p.meetings.map((m) => {
      const status = (m.status in STATUS_LABEL ? m.status : "draft") as MeetingStatus;
      const present = m.attendances.filter((a) => a.present);
      return {
        id: m.id,
        title: m.title,
        shortLabel: m.shortTitle,
        resultLabel: "최근 회의 결과",
        dateLabel: status === "done" ? dateLabel(m.startedAt) : `${dateLabel(m.startedAt)} · ${STATUS_LABEL[status]}`,
        attendDone: present.length,
        attendTotal: m.attendances.length || present.length,
        readBy: m.reads.map((r) => r.memberId),
        absent: m.attendances.filter((a) => !a.present).map((a) => a.memberId),
      };
    }),
    highlights: doneMeetings.flatMap((m) =>
      m.agendaItems.flatMap((a) => a.opinions.map((o) => ({ text: o.quote, meetingTag: `${m.shortTitle} · ${a.shortTitle}` }))),
    ),
  };
}
