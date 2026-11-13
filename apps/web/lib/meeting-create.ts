import { db } from "./db";

// 회의 만들기 (대시보드의 "회의 기록 추가" 팝업). 녹음은 만든 뒤 회의 페이지에서 올림.

// 회의 결과 페이지 맨 위 정보 줄(일자·시간·방식·참석)과 같은 칸만 받음. 회의 이름은 "n차 회의"로 자동
/** 방식 입력칸의 추천 목록 (직접 입력도 됨) */
export const MODE_SUGGESTIONS = ["대면", "Discord 음성채널", "Zoom", "Google Meet"] as const;
const MAX_MODE = 20;

export type NewMeetingInput = {
  /** "YYYY-MM-DD" (한국 시간) */
  date: string;
  /** 시작 시각 "HH:MM" */
  time: string;
  mode: string;
  attendeeIds: string[];
};

function isRealDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** 요청 본문 검사. 참석자가 이 프로젝트의 팀원인지는 createMeeting에서 DB로 확인 */
export function parseNewMeeting(body: unknown): { ok: true; value: NewMeetingInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "요청 형식이 올바르지 않아요." };
  const b = body as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const date = str(b.date);
  const time = str(b.time);
  const mode = str(b.mode);
  const attendeeIds = Array.isArray(b.attendeeIds) ? [...new Set(b.attendeeIds.map(str).filter(Boolean))] : [];

  if (!isRealDate(date)) return { ok: false, error: "회의 일자를 달력에서 골라 주세요." };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { ok: false, error: "회의 시작 시각을 골라 주세요." };
  if (!mode) return { ok: false, error: "회의 방식을 입력해 주세요. 예: 대면, Discord 음성채널" };
  if (mode.length > MAX_MODE) return { ok: false, error: `회의 방식은 ${MAX_MODE}자까지 쓸 수 있어요.` };
  if (attendeeIds.length === 0) return { ok: false, error: "참석한 팀원을 한 명 이상 골라 주세요." };
  return { ok: true, value: { date, time, mode, attendeeIds } };
}

/** 회의 틀을 만듦 (상태 draft). 참석자 수 = 화자 분리에 쓸 화자 수. 없는 프로젝트면 null */
export async function createMeeting(projectId: string, input: NewMeetingInput): Promise<{ id: string } | { error: string } | null> {
  const project = await db.project.findUnique({ where: { id: projectId }, select: { id: true, _count: { select: { meetings: true } } } });
  if (!project) return null;
  const members = await db.member.findMany({ where: { projectId }, select: { id: true } });
  // 회의 이름은 "n차 회의" (요약이 끝나면 결과 페이지 제목은 "n차 회의 결과")
  const round = project._count.meetings + 1;
  const memberIds = new Set(members.map((m) => m.id));
  // 다른 프로젝트의 팀원 id는 받지 않음 (DB 외래 키로는 못 막는 부분, claude/DB.md 5절)
  if (input.attendeeIds.some((id) => !memberIds.has(id))) return { error: "참석자 목록이 이 프로젝트의 팀원과 맞지 않아요. 새로고침 후 다시 골라 주세요." };

  const meeting = await db.meeting.create({
    data: {
      projectId,
      title: `${round}차 회의 결과`,
      shortTitle: `${round}차 회의`,
      startedAt: new Date(`${input.date}T${input.time}:00+09:00`),
      mode: input.mode,
      speakerCount: input.attendeeIds.length,
      status: "draft",
      attendances: {
        create: [...memberIds].map((memberId) => ({ memberId, present: input.attendeeIds.includes(memberId) })),
      },
    },
    select: { id: true },
  });
  return meeting;
}
