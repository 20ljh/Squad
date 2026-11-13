import { NextResponse } from "next/server";
import { requireUserApi } from "@/lib/auth/access";
import { completeProfile, parseProfile } from "@/lib/join";

type Ctx = { params: { id: string } };

// POST /api/join-requests/:id/profile — 수락된 요청자가 이름·역할을 골라 팀원으로 연결
// 본문 { memberId?: 미리 넣은 이름의 팀원 id, name?: 새 이름, position?: 맡은 일 }
export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireUserApi();
  if (!auth.ok) return auth.response;
  const parsed = parseProfile(await request.json().catch(() => null));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const result = await completeProfile(params.id, auth.user.id, parsed.value);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result);
}
