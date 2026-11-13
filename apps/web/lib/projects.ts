import { db } from "./db";
import { inviteCodeHash, newInviteCode } from "./secrets";

// 프로젝트 만들기 + 회의 상태 이름 (대시보드 집계는 lib/dashboard.ts)

export const MAX_MEMBERS = 10;
export const MAX_NAME = 20;
export const MAX_TITLE = 40;

// 흰 글자와 대비 4.5:1 이상인 팀원 색 (CLAUDE.md 8절)
const MEMBER_COLORS = ["#7A5AC7", "#2F7D5B", "#B0487A", "#3A6EA5", "#A84A32", "#9A4F96", "#8A6A12", "#5B6472", "#B4502F", "#8A5A2B"];

export type NewProjectInput = {
  name: string;
  course: string;
  leader: string;
  members: string[];
  /** 최종 마감일 "YYYY-MM-DD" (선택) */
  deadline: string | null;
};

/** 한국 시간 기준 오늘 "YYYY-MM-DD" */
function todayKst(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** "YYYY-MM-DD"가 실제 있는 날짜인지 */
function isRealDate(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** 요청 본문 검사. 문제가 있으면 사용자에게 보여 줄 문장을 돌려줌 */
export function parseNewProject(body: unknown): { ok: true; value: NewProjectInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "요청 형식이 올바르지 않아요." };
  const b = body as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const name = str(b.name);
  const course = str(b.course);
  const leader = str(b.leader);
  const members = Array.isArray(b.members) ? b.members.map(str).filter(Boolean) : [];
  const deadline = str(b.deadline) || null;

  if (!name) return { ok: false, error: "프로젝트 이름을 입력해 주세요." };
  if (name.length > MAX_TITLE || course.length > MAX_TITLE) return { ok: false, error: `프로젝트 이름과 과목은 ${MAX_TITLE}자까지 쓸 수 있어요.` };
  if (!leader) return { ok: false, error: "팀장인 내 이름을 입력해 주세요." };
  if ([leader, ...members].some((n) => n.length > MAX_NAME)) return { ok: false, error: `이름은 ${MAX_NAME}자까지 쓸 수 있어요.` };
  if (members.length > MAX_MEMBERS) return { ok: false, error: `팀원은 ${MAX_MEMBERS}명까지 미리 넣을 수 있어요.` };
  if (new Set([leader, ...members]).size !== members.length + 1) return { ok: false, error: "같은 이름이 두 번 들어 있어요." };
  if (deadline) {
    if (!isRealDate(deadline)) return { ok: false, error: "최종 마감일을 달력에서 다시 골라 주세요." };
    const today = todayKst();
    if (deadline < today) return { ok: false, error: "최종 마감일은 오늘이거나 이후 날짜로 골라 주세요." };
    if (Number(deadline.slice(0, 4)) > Number(today.slice(0, 4)) + 3) return { ok: false, error: "최종 마감일은 3년 안의 날짜로 골라 주세요." };
  }
  return { ok: true, value: { name, course, leader, members, deadline } };
}

/** 프로젝트를 만들고 팀장을 첫 팀원으로 넣음. 초대 코드는 HMAC만 저장 (원문은 참여 기능에서 보여 줌) */
export async function createProject(input: NewProjectInput): Promise<{ id: string }> {
  const names = [input.leader, ...input.members];
  const project = await db.project.create({
    data: {
      name: input.name,
      course: input.course || null,
      deadline: input.deadline ? new Date(`${input.deadline}T00:00:00+09:00`) : null,
      inviteCodeHash: inviteCodeHash(newInviteCode()),
      inviteCodeIssuedAt: new Date(),
      members: {
        create: names.map((n, i) => ({
          name: n,
          role: i === 0 ? "leader" : "member",
          position: i === 0 ? "팀장" : "",
          initial: [...n][0] ?? "?",
          color: MEMBER_COLORS[i % MEMBER_COLORS.length],
          order: i,
        })),
      },
    },
    select: { id: true },
  });
  return project;
}

export type MeetingStatus = "draft" | "transcribing" | "mapping" | "summarizing" | "done" | "failed";

export const STATUS_LABEL: Record<MeetingStatus, string> = {
  draft: "녹음 올리기 전",
  transcribing: "받아쓰는 중",
  mapping: "화자 확인 필요",
  summarizing: "요약 중",
  done: "정리 완료",
  failed: "처리 실패",
};
