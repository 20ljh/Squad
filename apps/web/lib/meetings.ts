import { db } from "./db";
import type { Meeting, Member } from "./types";

// DB의 회의를 화면 모양(lib/types.ts)으로 바꿈. 시간은 모두 한국 시간 기준으로 보여 줌.

const TZ = "Asia/Seoul";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** Date → 한국 시간 기준 "YYYY-MM-DD" */
export function toKstIso(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function kstTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

/** 2026-10-03 → "10/3(토)" */
function shortDate(date: Date): string {
  const [y, m, d] = toKstIso(date).split("-").map(Number);
  return `${m}/${d}(${WEEKDAYS[new Date(y, m - 1, d).getDay()]})`;
}

/** 결정 마감 표시: 날짜가 있으면 "10/3(토) 자정", 없으면 "주말(날짜 미정)", 둘 다 없으면 "기한 없음" */
export function dueLabel(dueDate: Date | null, dueText: string | null): string {
  if (dueDate) return dueText ? `${shortDate(dueDate)} ${dueText}` : shortDate(dueDate);
  return dueText ? `${dueText}(날짜 미정)` : "기한 없음";
}

/** 2538초 → "42:18", 1시간 넘으면 "1:02:03" */
function duration(sec: number | null): string {
  if (sec == null) return "-";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mmss = `${String(m).padStart(h ? 2 : 1, "0")}:${String(s).padStart(2, "0")}`;
  return h ? `${h}:${mmss}` : mmss;
}

function timeRange(startedAt: Date, endedAt: Date | null, durationSec: number | null): string {
  if (endedAt) return `${kstTime(startedAt)}–${kstTime(endedAt)}`;
  // 회의를 만들 때 시간을 비워 두면 0시로 저장됨
  if (kstTime(startedAt) === "00:00" && !durationSec) return "시간 미정";
  return durationSec ? `${kstTime(startedAt)}부터 약 ${Math.max(1, Math.round(durationSec / 60))}분` : kstTime(startedAt);
}

type Seg = { startSec: number; endSec: number; text: string; speakerLabelId: string | null };

/** 화자 확인 화면: 화자마다 말한 횟수·시간과 대표 발화(긴 것 3개, 시간 순) */
function mappingView(labels: { id: string; label: string; memberId: string | null }[], segs: Seg[], candidates: Member[]) {
  const labelName = Object.fromEntries(labels.map((l) => [l.id, l.label]));
  const sorted = [...labels].sort((a, b) => Number(a.label.replace(/\D/g, "")) - Number(b.label.replace(/\D/g, "")));
  return {
    speakers: sorted.map((l) => {
      const mine = segs.filter((s) => s.speakerLabelId === l.id);
      const samples = [...mine]
        .sort((a, b) => b.text.length - a.text.length)
        .slice(0, 3)
        .sort((a, b) => a.startSec - b.startSec)
        .map((s) => ({ start: s.startSec, text: s.text }));
      return { id: l.id, label: l.label, memberId: l.memberId, count: mine.length, seconds: Math.round(mine.reduce((t, s) => t + (s.endSec - s.startSec), 0)), samples };
    }),
    candidates,
    transcript: segs.map((s) => ({ start: s.startSec, label: s.speakerLabelId ? labelName[s.speakerLabelId] ?? "" : "", text: s.text })),
  };
}

/** 프로젝트·회의가 없으면 null (→ 404) */
export async function getMeeting(projectId: string, meetingId: string): Promise<Meeting | null> {
  const m = await db.meeting.findFirst({
    where: { id: meetingId, projectId },
    include: {
      project: { include: { members: { orderBy: { order: "asc" } } } },
      attendances: true,
      speakerLabels: { orderBy: { label: "asc" } },
      agendaItems: { orderBy: { order: "asc" }, include: { opinions: { orderBy: { order: "asc" } } } },
      schedules: { orderBy: { order: "asc" } },
      segments: { orderBy: { startSec: "asc" }, select: { startSec: true, endSec: true, text: true, speakerLabelId: true } },
    },
  });
  if (!m) return null;

  const members: Member[] = m.project.members.map((p) => ({
    id: p.id,
    name: p.name,
    role: p.position || "팀원",
    initial: p.initial,
    color: p.color,
  }));
  const nameById = Object.fromEntries(members.map((p) => [p.id, p.name]));

  // 아직 팀원과 매핑되지 않은 화자는 "화자1"처럼 임시 팀원으로 보여 줌
  const labelToMember: Record<string, string> = {};
  const unmappedColors = ["#5B6472", "#6B5E4E", "#4E6B5E", "#5E4E6B"];
  m.speakerLabels.forEach((s, i) => {
    if (s.memberId) {
      labelToMember[s.id] = s.memberId;
    } else {
      const id = `speaker:${s.id}`;
      labelToMember[s.id] = id;
      members.push({ id, name: s.label, role: "매핑 전", initial: s.label.replace(/\D/g, "") || "?", color: unmappedColors[i % 4] });
    }
  });

  const attendeeIds = m.attendances.filter((a) => a.present).map((a) => a.memberId);

  return {
    id: m.id,
    teamName: m.project.course ? `${m.project.name} · ${m.project.course}` : m.project.name,
    title: m.title,
    shortTitle: m.shortTitle,
    date: toKstIso(m.startedAt),
    timeRange: timeRange(m.startedAt, m.endedAt, m.durationSec),
    mode: m.mode,
    status: (["draft", "transcribing", "mapping", "summarizing", "done", "failed"].includes(m.status) ? m.status : "draft") as Meeting["status"],
    speakerCount: m.speakerCount ?? undefined,
    failReason: m.failReason,
    record:
      m.status === "done"
        ? {
            hasAudio: m.audioPath !== null,
            lines: m.segments.map((s) => ({
              start: s.startSec,
              end: s.endSec,
              memberId: s.speakerLabelId ? labelToMember[s.speakerLabelId] ?? "" : "",
              text: s.text,
            })),
          }
        : undefined,
    mapping: m.status === "mapping" ? mappingView(m.speakerLabels, m.segments, members.filter((x) => attendeeIds.includes(x.id))) : undefined,
    processing:
      m.status === "transcribing"
        ? {
            audioName: m.audioName,
            audioSize: m.audioSize,
            durationSec: m.durationSec,
            started: m.sttStartedAt !== null,
            lines: m.segments.map((s) => ({ start: s.startSec, text: s.text })),
          }
        : undefined,
    transcriptDuration: duration(m.durationSec),
    members,
    attendeeIds,
    agenda: m.agendaItems.map((a) => ({
      id: a.id,
      order: a.order,
      title: a.title,
      shortTitle: a.shortTitle,
      opinions: a.opinions.map((o) => ({
        memberId: o.memberId ?? (o.speakerLabelId ? labelToMember[o.speakerLabelId] : "") ?? "",
        quote: o.quote,
        gist: o.gist,
      })),
      decision: a.decisionText
        ? {
            text: a.decisionText,
            short: a.decisionShort ?? a.decisionText,
            ownerLabel: (a.ownerMemberId && nameById[a.ownerMemberId]) || a.ownerLabel || "미정",
            dueLabel: dueLabel(a.dueDate, a.dueText),
          }
        : null,
    })),
    schedules: m.schedules.map((s) => ({
      id: s.id,
      date: s.dueDate ? toKstIso(s.dueDate) : null,
      dueText: s.dueText ?? undefined,
      label: s.label,
      ownerLabel: s.ownerLabel ?? "미정",
    })),
  };
}

/** 프로젝트의 회의 중 결과 페이지가 있는 회의 id */
export async function meetingIdsWithResult(projectId: string): Promise<Set<string>> {
  const rows = await db.meeting.findMany({ where: { projectId }, select: { id: true } });
  return new Set(rows.map((r) => r.id));
}
