import { NextResponse } from "next/server";
import { createProject, parseNewProject } from "@/lib/projects";

// POST /api/projects — 프로젝트 만들기. 로그인 전(11/16 제출본)이라 누구나 만들 수 있음.
// 구글 로그인을 붙이면 세션 사용자를 팀장(Member.userId)으로 연결할 것 (CLAUDE.md 9절)
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const parsed = parseNewProject(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const { id } = await createProject(parsed.value);
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("프로젝트 만들기 실패", err);
    return NextResponse.json({ error: "프로젝트를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
