import { decideJoinRequest } from "@/lib/join-decide";

type Ctx = { params: { id: string } };

// POST /api/join-requests/:id/approve — 참여 요청 수락 (팀장만). 수락되면 요청자가 이름·역할을 고름
export async function POST(_request: Request, { params }: Ctx) {
  return decideJoinRequest(params.id, "approved");
}
