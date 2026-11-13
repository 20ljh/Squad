import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserApi } from "@/lib/auth/access";
import { JOIN_RATE_PER_HOUR, MAX_MESSAGE, latestRequest, projectByCode } from "@/lib/join";

type Ctx = { params: { code: string } };

// POST /api/join/:code — 참여 요청 보내기 (로그인 필요). 본문 { message }
// 팀장이 확인 메시지를 보고 수락해야 들어올 수 있음. 한 사용자당 한 시간에 JOIN_RATE_PER_HOUR번까지
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const userId = auth.user.id;

  const recent = await db.joinRequest.count({ where: { userId, createdAt: { gt: new Date(Date.now() - 60 * 60 * 1000) } } });
  if (recent >= JOIN_RATE_PER_HOUR) {
    return NextResponse.json({ error: "참여 요청을 너무 많이 보냈어요. 한 시간 뒤 다시 시도해 주세요." }, { status: 429 });
  }

  const project = await projectByCode(params.code);
  if (!project) return NextResponse.json({ error: "초대 코드가 맞지 않아요. 팀장에게 새 링크를 받아 주세요." }, { status: 404 });

  const body = (await request.json().catch(() => ({}))) as { message?: unknown };
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) return NextResponse.json({ error: "팀장이 알아볼 수 있게 확인 메시지를 써 주세요." }, { status: 400 });
  if (message.length > MAX_MESSAGE) return NextResponse.json({ error: `확인 메시지는 ${MAX_MESSAGE}자까지 쓸 수 있어요.` }, { status: 400 });

  const member = await db.member.findUnique({ where: { projectId_userId: { projectId: project.id, userId } }, select: { id: true } });
  if (member) return NextResponse.json({ error: "이미 이 프로젝트의 팀원이에요.", projectId: project.id }, { status: 409 });
  const last = await latestRequest(project.id, userId);
  if (last && (last.status === "pending" || last.status === "approved")) return NextResponse.json({ id: last.id, status: last.status });

  const created = await db.joinRequest.create({ data: { projectId: project.id, userId, message }, select: { id: true, status: true } });
  return NextResponse.json(created, { status: 201 });
}
