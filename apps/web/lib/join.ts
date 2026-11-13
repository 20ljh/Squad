import { db } from "./db";
import { inviteCodeHash, newInviteCode } from "./secrets";
import { MAX_NAME, memberColor } from "./projects";

// 초대·참여 (CLAUDE.md 7절 Phase 1-1)
// 팀원이 초대 링크로 확인 메시지를 보냄 → 팀장이 메시지를 보고 수락·거절
// → 수락되면 팀원이 이름(미리 넣은 이름 또는 새 이름)·역할을 고름

export const MAX_MESSAGE = 100;
export const MAX_POSITION = 20;
/** 한 사용자가 한 시간에 보낼 수 있는 참여 요청 수 (초대 코드 무작위 대입·스팸 방지) */
export const JOIN_RATE_PER_HOUR = 10;

/** "SQD-XXXX-XXXX" 형식이면 대문자로 맞춘 코드, 아니면 null */
export function normalizeCode(raw: string): string | null {
  let c = raw;
  try {
    c = decodeURIComponent(raw);
  } catch {
    return null;
  }
  c = c.trim().toUpperCase();
  return /^SQD-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/.test(c) ? c : null;
}

export async function projectByCode(raw: string) {
  const code = normalizeCode(raw);
  if (!code) return null;
  return db.project.findUnique({ where: { inviteCodeHash: inviteCodeHash(code) }, select: { id: true, name: true, course: true } });
}

/** 초대 코드 다시 발급 (이전 코드는 바로 무효) → 새 원문 */
export async function reissueInviteCode(projectId: string): Promise<string> {
  const code = newInviteCode();
  await db.project.update({ where: { id: projectId }, data: { inviteCodeHash: inviteCodeHash(code), inviteCodeIssuedAt: new Date() } });
  return code;
}

/** 이 사용자의 이 프로젝트 최근 참여 요청 */
export async function latestRequest(projectId: string, userId: string) {
  return db.joinRequest.findFirst({
    where: { projectId, userId },
    orderBy: { createdAt: "desc" },
    select: { id: true, status: true, memberId: true, message: true, createdAt: true },
  });
}

/** 수락된 요청자가 고를 수 있는 이름 = 아직 아무 계정과도 연결되지 않은 팀원 */
export async function unlinkedMembers(projectId: string) {
  return db.member.findMany({ where: { projectId, userId: null }, orderBy: { order: "asc" }, select: { id: true, name: true } });
}

/** 팀장이 볼 대기 중인 요청 */
export async function pendingRequests(projectId: string) {
  return db.joinRequest.findMany({
    where: { projectId, status: "pending" },
    orderBy: { createdAt: "asc" },
    select: { id: true, message: true, createdAt: true, user: { select: { name: true, email: true } } },
  });
}

export type ProfileInput = { memberId: string | null; name: string; position: string };

export function parseProfile(body: unknown): { ok: true; value: ProfileInput } | { ok: false; error: string } {
  if (typeof body !== "object" || body === null) return { ok: false, error: "요청 형식이 올바르지 않아요." };
  const b = body as Record<string, unknown>;
  const memberId = typeof b.memberId === "string" && b.memberId ? b.memberId : null;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  const position = typeof b.position === "string" ? b.position.trim() : "";
  if (!memberId && !name) return { ok: false, error: "목록에서 내 이름을 고르거나 새 이름을 입력해 주세요." };
  if (name.length > MAX_NAME) return { ok: false, error: `이름은 ${MAX_NAME}자까지 쓸 수 있어요.` };
  if (position.length > MAX_POSITION) return { ok: false, error: `역할은 ${MAX_POSITION}자까지 쓸 수 있어요.` };
  return { ok: true, value: { memberId, name, position } };
}

type ProfileResult = { projectId: string } | { error: string; status: number };

/** 수락된 요청자를 팀원으로 연결 */
export async function completeProfile(requestId: string, userId: string, input: ProfileInput): Promise<ProfileResult> {
  const req = await db.joinRequest.findUnique({ where: { id: requestId }, select: { id: true, projectId: true, userId: true, status: true } });
  if (!req || req.userId !== userId) return { error: "참여 요청을 찾을 수 없어요.", status: 404 };
  if (req.status !== "approved") return { error: "팀장이 아직 수락하지 않았어요.", status: 409 };
  const already = await db.member.findUnique({ where: { projectId_userId: { projectId: req.projectId, userId } }, select: { id: true } });
  if (already) return { projectId: req.projectId };

  return db.$transaction(async (tx): Promise<ProfileResult> => {
    let memberId: string;
    if (input.memberId) {
      // 이미 다른 사람과 연결된 이름은 고를 수 없음 (동시에 고르는 경우도 userId: null 조건으로 막음)
      const took = await tx.member.updateMany({
        where: { id: input.memberId, projectId: req.projectId, userId: null },
        data: { userId, ...(input.position ? { position: input.position } : {}) },
      });
      if (took.count === 0) return { error: "그 이름은 이미 다른 팀원이 골랐어요. 다른 이름을 골라 주세요.", status: 409 };
      memberId = input.memberId;
    } else {
      const members = await tx.member.findMany({ where: { projectId: req.projectId }, select: { name: true, order: true } });
      if (members.some((m) => m.name === input.name)) {
        return { error: "같은 이름의 팀원이 이미 있어요. 목록에서 고르거나 다른 이름을 써 주세요.", status: 409 };
      }
      const order = members.reduce((a, m) => Math.max(a, m.order), -1) + 1;
      const created = await tx.member.create({
        data: {
          projectId: req.projectId,
          userId,
          name: input.name,
          role: "member",
          position: input.position,
          initial: [...input.name][0] ?? "?",
          color: memberColor(order),
          order,
        },
        select: { id: true },
      });
      memberId = created.id;
    }
    await tx.joinRequest.update({ where: { id: req.id }, data: { memberId } });
    return { projectId: req.projectId };
  });
}
