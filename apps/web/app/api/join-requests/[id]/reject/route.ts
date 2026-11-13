import { decideJoinRequest } from "@/lib/join-decide";

type Ctx = { params: { id: string } };

// POST /api/join-requests/:id/reject — 참여 요청 거절 (팀장만)
export async function POST(_request: Request, { params }: Ctx) {
  return decideJoinRequest(params.id, "rejected");
}
