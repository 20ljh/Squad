import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectApi } from "@/lib/auth/access";

type Ctx = { params: { id: string } };

// PATCH /api/action-items/:id — 할 일 완료 체크 { done: boolean } (그 프로젝트 팀원 누구나)
// 대시보드의 "진행중 액션아이템"·"마감 임박"·팀원별 할 일 완료가 이 값으로 바뀜
export async function PATCH(request: Request, { params }: Ctx) {
  const body = (await request.json().catch(() => ({}))) as { done?: unknown };
  if (typeof body.done !== "boolean") return NextResponse.json({ error: "done 값이 필요해요." }, { status: 400 });

  const item = await db.actionItem.findUnique({ where: { id: params.id }, select: { id: true, agendaItem: { select: { meeting: { select: { projectId: true } } } } } });
  if (!item) return NextResponse.json({ error: "업무를 찾을 수 없어요." }, { status: 404 });
  const auth = await requireProjectApi(item.agendaItem.meeting.projectId);
  if (!auth.ok) return auth.response;

  await db.actionItem.update({ where: { id: item.id }, data: { done: body.done } });
  return NextResponse.json({ done: body.done });
}
