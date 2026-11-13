import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkWorker, unauthorized } from "@/lib/worker-auth";
import { summaryRequest } from "@/lib/llm/summarize";

// 워커가 이 시간 넘게 결과를 안 올리면 멈춘 것으로 보고 다시 가져감 (요약은 보통 30초 안팎)
const STALE_MS = 5 * 60 * 1000;

// POST /api/worker/summary/claim — (워커) 요약할 회의 하나 가져가기
// 응답 200: { meetingId, request }  request = Anthropic Messages API에 그대로 보낼 본문 / 할 일이 없으면 204
// 두 워커가 같은 회의를 부르지 않게, 본 상태 그대로일 때만 잠금 (받아쓰기 claim과 같은 방식)
// 본문 { meetingId } 를 주면 그 회의만 (시험용)
export async function POST(request: Request) {
  if (!checkWorker(request)) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { meetingId?: unknown };
  const only = typeof body.meetingId === "string" ? body.meetingId : undefined;
  const staleBefore = new Date(Date.now() - STALE_MS);

  for (let attempt = 0; attempt < 3; attempt++) {
    const job = await db.meeting.findFirst({
      where: { ...(only ? { id: only } : {}), status: "summarizing", OR: [{ summaryStartedAt: null }, { summaryStartedAt: { lt: staleBefore } }] },
      orderBy: { createdAt: "asc" },
      select: { id: true, summaryStartedAt: true },
    });
    if (!job) return new NextResponse(null, { status: 204 });
    const took = await db.meeting.updateMany({
      where: { id: job.id, status: "summarizing", summaryStartedAt: job.summaryStartedAt },
      data: { summaryStartedAt: new Date() },
    });
    if (took.count === 0) continue;
    const req = await summaryRequest(job.id);
    if (!req) continue;
    return NextResponse.json({ meetingId: job.id, request: req });
  }
  return new NextResponse(null, { status: 204 });
}
