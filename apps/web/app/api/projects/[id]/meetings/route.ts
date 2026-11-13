import { NextResponse } from "next/server";
import { requireProjectApi } from "@/lib/auth/access";
import { createMeeting, parseNewMeeting } from "@/lib/meeting-create";
import { SAMPLE_PROJECT_ID } from "@/lib/paths";

type Ctx = { params: { id: string } };

// POST /api/projects/:id/meetings — 회의 틀 만들기 (녹음은 회의 페이지에서 따로 올림)
// 로그인한 이 프로젝트 팀원만 (lib/auth/access.ts)
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireProjectApi(params.id);
  if (!auth.ok) return auth.response;
  if (params.id === SAMPLE_PROJECT_ID) {
    return NextResponse.json({ error: "예시 프로젝트에는 회의를 추가할 수 없어요. 새 프로젝트를 만들어 주세요." }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const parsed = parseNewMeeting(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const result = await createMeeting(params.id, parsed.value);
    if (!result) return NextResponse.json({ error: "프로젝트를 찾을 수 없어요." }, { status: 404 });
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (err) {
    console.error("회의 만들기 실패", err);
    return NextResponse.json({ error: "회의를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
