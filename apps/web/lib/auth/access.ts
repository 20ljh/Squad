import { NextResponse } from "next/server";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { REC_TEST_PROJECT_ID, SAMPLE_PROJECT_ID } from "@/lib/paths";
import { getCurrentUser, type CurrentUser } from "./session";

// 권한 판단 (CLAUDE.md 9절): 모든 화면·API는 세션의 userId로 판단
// - 팀원 = 그 프로젝트에 세션 사용자와 연결된 Member가 있음
// - 팀장 = 그 Member의 role이 leader
// - 예시 프로젝트(sample·rec-test)는 로그인 없이 읽기만 가능 (시연·심사용)
// 팀원이 아닌 사람에게는 프로젝트가 있다는 것 자체를 알리지 않도록 404로 응답

const PUBLIC_PROJECTS = new Set([SAMPLE_PROJECT_ID, REC_TEST_PROJECT_ID]);

export function isPublicProject(projectId: string): boolean {
  return PUBLIC_PROJECTS.has(projectId);
}

export type MemberAccess = { user: CurrentUser; member: { id: string; role: string; name: string } };

export async function findMembership(projectId: string, userId: string) {
  return db.member.findUnique({
    where: { projectId_userId: { projectId, userId } },
    select: { id: true, role: true, name: true },
  });
}

export function loginPath(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

/** 화면 제목(메타데이터)처럼 이동 없이 "볼 수 있는지"만 알고 싶을 때 */
export async function canViewProject(projectId: string): Promise<boolean> {
  if (isPublicProject(projectId)) return true;
  const user = await getCurrentUser();
  return Boolean(user && (await findMembership(projectId, user.id)));
}

/**
 * 화면용: 예시 프로젝트면 null(누구나 보기), 아니면 팀원만.
 * 로그인 전이면 로그인 화면으로, 팀원이 아니면 404
 */
export async function requireProjectPage(projectId: string, here: string): Promise<MemberAccess | null> {
  if (isPublicProject(projectId)) return null;
  const user = await getCurrentUser();
  if (!user) redirect(loginPath(here));
  const member = await findMembership(projectId, user.id);
  if (!member) notFound();
  return { user, member };
}

type ApiResult = { ok: true; access: MemberAccess } | { ok: false; response: NextResponse };

const unauthenticated = () => NextResponse.json({ error: "로그인이 필요해요. 다시 로그인해 주세요." }, { status: 401 });
const hidden = () => NextResponse.json({ error: "프로젝트를 찾을 수 없어요." }, { status: 404 });

/** API용: 그 프로젝트의 팀원인지 (leaderOnly면 팀장만) */
export async function requireProjectApi(projectId: string, opts: { leaderOnly?: boolean } = {}): Promise<ApiResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, response: unauthenticated() };
  const member = await findMembership(projectId, user.id);
  if (!member) return { ok: false, response: hidden() };
  if (opts.leaderOnly && member.role !== "leader") {
    return { ok: false, response: NextResponse.json({ error: "팀장만 할 수 있어요." }, { status: 403 }) };
  }
  return { ok: true, access: { user, member } };
}

/** API용: 회의 id로 프로젝트를 찾아 팀원인지 확인 */
export async function requireMeetingApi(meetingId: string, opts: { leaderOnly?: boolean } = {}) {
  const m = await db.meeting.findUnique({ where: { id: meetingId }, select: { projectId: true } });
  if (!m) return { ok: false as const, response: NextResponse.json({ error: "회의를 찾을 수 없어요." }, { status: 404 }) };
  const r = await requireProjectApi(m.projectId, opts);
  return r.ok ? { ...r, projectId: m.projectId } : r;
}

/** API용: 로그인만 확인 */
export async function requireUserApi(): Promise<{ ok: true; user: CurrentUser } | { ok: false; response: NextResponse }> {
  const user = await getCurrentUser();
  return user ? { ok: true, user } : { ok: false, response: unauthenticated() };
}
