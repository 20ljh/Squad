import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectApi } from "@/lib/auth/access";

type Ctx = { params: { id: string } };

const MAX_POSITION = 20;

async function findMember(id: string) {
  return db.member.findUnique({ where: { id }, select: { id: true, projectId: true, role: true, userId: true } });
}

// PATCH /api/members/:id — 맡은 일(position) 바꾸기 { position } (팀장은 누구나, 팀원은 본인만)
export async function PATCH(request: Request, { params }: Ctx) {
  const body = (await request.json().catch(() => ({}))) as { position?: unknown };
  if (typeof body.position !== "string") return NextResponse.json({ error: "맡은 일을 입력해 주세요." }, { status: 400 });
  const position = body.position.trim();
  if (position.length > MAX_POSITION) return NextResponse.json({ error: `맡은 일은 ${MAX_POSITION}자까지 쓸 수 있어요.` }, { status: 400 });

  const m = await findMember(params.id);
  if (!m) return NextResponse.json({ error: "팀원을 찾을 수 없어요." }, { status: 404 });
  const auth = await requireProjectApi(m.projectId);
  if (!auth.ok) return auth.response;
  if (auth.access.member.role !== "leader" && auth.access.member.id !== m.id) {
    return NextResponse.json({ error: "본인의 맡은 일만 바꿀 수 있어요." }, { status: 403 });
  }
  await db.member.update({ where: { id: m.id }, data: { position } });
  return NextResponse.json({ position });
}

// DELETE /api/members/:id — 팀원 내보내기 (팀장만, 팀장 자신은 불가)
// 회의 기록은 남음: 그 팀원의 의견·업무·담당은 비워지고(알 수 없음), 참석·열람 기록은 함께 지워짐
export async function DELETE(_request: Request, { params }: Ctx) {
  const m = await findMember(params.id);
  if (!m) return NextResponse.json({ error: "팀원을 찾을 수 없어요." }, { status: 404 });
  const auth = await requireProjectApi(m.projectId, { leaderOnly: true });
  if (!auth.ok) return auth.response;
  if (m.role === "leader") return NextResponse.json({ error: "팀장은 삭제할 수 없어요." }, { status: 400 });

  await db.member.delete({ where: { id: m.id } });
  return NextResponse.json({ deleted: true });
}
