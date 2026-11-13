import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkWorker, unauthorized } from "@/lib/worker-auth";

// 워커가 이 시간 넘게 소식이 없으면 멈춘 것으로 보고 다른 워커(또는 다시 켠 워커)가 가져감
const STALE_MS = 10 * 60 * 1000;

// POST /api/worker/claim — (STT 워커) 받아쓸 회의 하나 가져가기 (먼저 올라온 녹음부터)
// 응답 200: { meetingId, audioPath, audioName, speakerCount }  /  할 일이 없으면 204
// 두 워커가 같은 회의를 가져가지 않게, "내가 본 상태 그대로일 때만" 조건으로 한 번에 바꿈
// 본문 { meetingId } 를 주면 그 회의만 (시험·수동 재처리용)
export async function POST(request: Request) {
  if (!checkWorker(request)) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { meetingId?: unknown };
  const only = typeof body.meetingId === "string" ? body.meetingId : undefined;
  const staleBefore = new Date(Date.now() - STALE_MS);

  for (let attempt = 0; attempt < 3; attempt++) {
    const job = await db.meeting.findFirst({
      where: {
        ...(only ? { id: only } : {}),
        status: "transcribing",
        audioPath: { not: null },
        OR: [{ sttStartedAt: null }, { sttHeartbeatAt: { lt: staleBefore } }],
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, audioPath: true, audioName: true, speakerCount: true, sttStartedAt: true, sttHeartbeatAt: true },
    });
    if (!job || !job.audioPath) return new NextResponse(null, { status: 204 });

    const now = new Date();
    const took = await db.meeting.updateMany({
      where: { id: job.id, status: "transcribing", audioPath: job.audioPath, sttStartedAt: job.sttStartedAt, sttHeartbeatAt: job.sttHeartbeatAt },
      data: { sttStartedAt: now, sttHeartbeatAt: now, failReason: null },
    });
    if (took.count === 0) continue; // 그 사이 다른 워커가 가져갔거나 취소됨

    // 멈춘 작업을 다시 가져온 경우 이전 중간 결과는 지우고 처음부터
    await db.$transaction([db.speechSegment.deleteMany({ where: { meetingId: job.id } }), db.speakerLabel.deleteMany({ where: { meetingId: job.id } })]);
    return NextResponse.json({ meetingId: job.id, audioPath: job.audioPath, audioName: job.audioName, speakerCount: job.speakerCount ?? 1 });
  }
  return new NextResponse(null, { status: 204 });
}
