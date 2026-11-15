import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectApi } from "@/lib/auth/access";

type Ctx = { params: { id: string } };

// PATCH /api/opinions/:id — 의견을 대시보드 하이라이트에 올리기·내리기 { pinned: boolean } (그 프로젝트 팀원 누구나)
export async function PATCH(request: Request, { params }: Ctx) {
  const body = (await request.json().catch(() => ({}))) as { pinned?: unknown };
  if (typeof body.pinned !== "boolean") return NextResponse.json({ error: "pinned 값이 필요해요." }, { status: 400 });

  const op = await db.opinion.findUnique({ where: { id: params.id }, select: { id: true, agendaItem: { select: { meeting: { select: { projectId: true } } } } } });
  if (!op) return NextResponse.json({ error: "의견을 찾을 수 없어요." }, { status: 404 });
  const auth = await requireProjectApi(op.agendaItem.meeting.projectId);
  if (!auth.ok) return auth.response;

  await db.opinion.update({ where: { id: op.id }, data: { pinned: body.pinned } });
  return NextResponse.json({ pinned: body.pinned });
}
