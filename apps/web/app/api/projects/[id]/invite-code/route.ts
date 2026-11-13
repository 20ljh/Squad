import { NextResponse } from "next/server";
import { requireProjectApi } from "@/lib/auth/access";
import { reissueInviteCode } from "@/lib/join";

type Ctx = { params: { id: string } };

// POST /api/projects/:id/invite-code — 초대 코드 새로 만들기 (팀장만, 이전 코드는 바로 무효)
// 원문은 이 응답에서만 볼 수 있음 (DB에는 HMAC만)
export async function POST(_request: Request, { params }: Ctx) {
  const auth = await requireProjectApi(params.id, { leaderOnly: true });
  if (!auth.ok) return auth.response;
  const inviteCode = await reissueInviteCode(params.id);
  return NextResponse.json({ inviteCode });
}
