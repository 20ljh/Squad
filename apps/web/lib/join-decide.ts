import { NextResponse } from "next/server";
import { db } from "./db";
import { requireProjectApi } from "./auth/access";

// 참여 요청 수락·거절 공통 (그 프로젝트 팀장만). 이미 처리한 요청이면 409
export async function decideJoinRequest(requestId: string, status: "approved" | "rejected") {
  const req = await db.joinRequest.findUnique({ where: { id: requestId }, select: { id: true, projectId: true } });
  if (!req) return NextResponse.json({ error: "참여 요청을 찾을 수 없어요." }, { status: 404 });
  const auth = await requireProjectApi(req.projectId, { leaderOnly: true });
  if (!auth.ok) return auth.response;

  const done = await db.joinRequest.updateMany({ where: { id: req.id, status: "pending" }, data: { status } });
  if (done.count === 0) return NextResponse.json({ error: "이미 처리한 요청이에요. 새로고침해 주세요." }, { status: 409 });
  return NextResponse.json({ status });
}
