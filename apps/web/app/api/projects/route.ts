import { NextResponse } from "next/server";
import { createProject, parseNewProject } from "@/lib/projects";
import { requireUserApi } from "@/lib/auth/access";

// POST /api/projects — 프로젝트 만들기 (로그인 필요). 로그인한 사용자를 팀장(Member.userId)으로 연결
// 응답 { id, inviteCode }: 초대 코드 원문은 DB에 없어서 이 응답에서 한 번만 보여 줌 (잃어버리면 팀장이 다시 발급)
export async function POST(request: Request) {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const parsed = parseNewProject(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const { id, inviteCode } = await createProject(parsed.value, auth.user.id);
    return NextResponse.json({ id, inviteCode }, { status: 201 });
  } catch (err) {
    console.error("프로젝트 만들기 실패", err);
    return NextResponse.json({ error: "프로젝트를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
