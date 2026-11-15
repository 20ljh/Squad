import { db } from "./db";
import { getMeeting } from "./meetings";
import { meetingPath } from "./paths";

// 메인 "회의가 끝나면 이렇게 남아요" 칸에 쓸 데이터
// 로그인했고 내 프로젝트에 정리가 끝난 회의가 있으면 그중 가장 최근 회의, 없으면 null(→ 예시를 보여 줌)

export type PreviewRow = { agenda: string; decision: string | null; owner: string; due: string };

export type PreviewData = {
  /** "마켓셰이프 · 3차 회의 결과" */
  title: string;
  meta: string[];
  rows: PreviewRow[];
  footerLeft: string;
  footerRight: string;
  href: string;
};

const WD = ["일", "월", "화", "수", "목", "금", "토"];

function shortDue(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${m}/${d} (${WD[new Date(y, m - 1, d).getDay()]})`;
}

function longDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일 (${WD[new Date(y, m - 1, d).getDay()]})`;
}

export async function latestMeetingPreview(userId: string): Promise<PreviewData | null> {
  const row = await db.meeting.findFirst({
    where: { status: "done", project: { members: { some: { userId } } } },
    orderBy: { startedAt: "desc" },
    select: { id: true, projectId: true, notionPageUrl: true, project: { select: { name: true } } },
  });
  if (!row) return null;
  const m = await getMeeting(row.projectId, row.id);
  if (!m) return null;

  const today = new Date().toISOString().slice(0, 10);
  const open = (m.actions ?? []).filter((a) => !a.done);
  const next = open
    .map((a) => a.due)
    .filter((d): d is string => Boolean(d) && (d as string) >= today)
    .sort()[0];
  const attendees = m.attendeeIds.length;

  return {
    title: `${row.project.name} | ${m.title}`,
    meta: [`${longDate(m.date)} ${m.timeRange}`, m.mode, `참석 ${attendees}명`],
    rows: m.agenda.map((a) => ({
      agenda: a.title,
      decision: a.decision?.text ?? null,
      owner: a.decision?.ownerLabel ?? "—",
      due: a.decision?.dueLabel ?? "—",
    })),
    footerLeft: open.length ? `남은 업무 ${open.length}개${next ? ` | 다음 마감 ${shortDue(next)}` : ""}` : (m.actions ?? []).length ? "업무를 모두 끝냈어요" : "업무 없음",
    footerRight: row.notionPageUrl ? "Notion에 내보냄" : "아직 Notion에 내보내지 않음",
    href: meetingPath(row.projectId, row.id),
  };
}
