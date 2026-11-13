import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deleteAudio } from "@/lib/audio-store";
import { activeJob, checkWorker, unauthorized } from "@/lib/worker-auth";

type Ctx = { params: { id: string } };

// POST /api/worker/jobs/:id/fail — (STT 워커) 처리하지 못했음을 알림
// 본문: { audioPath, reason }  reason은 사용자에게 보여 줄 짧은 문장 (예: "음성 파일을 읽지 못했어요")
// 상태를 failed로 바꾸고 녹음을 지움 → 회의 페이지가 이유와 함께 "다시 올려 주세요"를 보여 줌
export async function POST(request: Request, { params }: Ctx) {
  if (!checkWorker(request)) return unauthorized();
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const job = await activeJob(params.id, body.audioPath);
  if ("error" in job) return job.error;
  const reason = typeof body.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 200) : "녹음을 처리하지 못했어요.";

  const updated = await db.meeting.updateMany({
    where: { id: params.id, status: "transcribing", audioPath: body.audioPath as string },
    data: { status: "failed", failReason: reason, audioPath: null, sttStartedAt: null, sttHeartbeatAt: null },
  });
  if (updated.count === 0) return NextResponse.json({ error: "취소됐거나 다른 녹음으로 바뀐 작업이에요.", cancelled: true }, { status: 409 });
  await db.$transaction([db.speechSegment.deleteMany({ where: { meetingId: params.id } }), db.speakerLabel.deleteMany({ where: { meetingId: params.id } })]);
  await deleteAudio(body.audioPath as string);
  return NextResponse.json({ ok: true });
}
