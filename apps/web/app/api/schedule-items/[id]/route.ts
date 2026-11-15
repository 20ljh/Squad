import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectApi } from "@/lib/auth/access";

type Ctx = { params: { id: string } };

// PATCH /api/schedule-items/:id — 회의에서 나온 일정의 날짜 정하기·바꾸기 { date: "YYYY-MM-DD" } (그 프로젝트 팀원 누구나)
// "주말까지"처럼 날짜 미정으로 저장된 일정을 팀이 정하거나, 잘못 들은 날짜를 고칠 때. 대시보드 "다음 일정 D-n"에도 반영
export async function PATCH(request: Request, { params }: Ctx) {
  const body = (await request.json().catch(() => ({}))) as { date?: unknown };
  const iso = typeof body.date === "string" ? body.date : "";
  const date = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00+09:00`) : null;
  if (!date || Number.isNaN(date.getTime())) return NextResponse.json({ error: "날짜를 달력에서 골라 주세요." }, { status: 400 });

  const item = await db.scheduleItem.findUnique({ where: { id: params.id }, select: { id: true, meeting: { select: { projectId: true } } } });
  if (!item) return NextResponse.json({ error: "일정을 찾을 수 없어요." }, { status: 404 });
  const auth = await requireProjectApi(item.meeting.projectId);
  if (!auth.ok) return auth.response;

  // 날짜를 정하면 "주말" 같은 원래 표현(dueText)은 지움
  await db.scheduleItem.update({ where: { id: item.id }, data: { dueDate: date, dueText: null } });
  return NextResponse.json({ date: iso });
}
