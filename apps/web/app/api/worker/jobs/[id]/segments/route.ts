import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activeJob, checkWorker, unauthorized } from "@/lib/worker-auth";

type Ctx = { params: { id: string } };
type Seg = { start: number; end: number; text: string };

function parseSegments(v: unknown): Seg[] | null {
  if (!Array.isArray(v) || v.length > 500) return null;
  const out: Seg[] = [];
  for (const x of v) {
    if (typeof x !== "object" || x === null) return null;
    const { start, end, text } = x as Record<string, unknown>;
    if (typeof start !== "number" || typeof end !== "number" || typeof text !== "string" || !(end >= start) || start < 0) return null;
    out.push({ start, end, text: text.trim().slice(0, 5000) });
  }
  return out;
}

// POST /api/worker/jobs/:id/segments — (STT 워커) 받아쓰기 중간 결과를 문장 단위로 올림
// 본문: { audioPath, durationSec?, segments: [{ start, end, text }] }
// 회의 페이지가 몇 초마다 읽어 "[00:06] …" 한 줄씩 보여 줌. 화자는 아직 모름(받아쓰기가 끝난 뒤 화자 나누기)
// 취소됐거나 녹음이 바뀌었으면 409 { cancelled: true } → 워커는 멈춤
// segments를 빈 배열로 보내면 "아직 유효한지" 확인 + 소식 갱신만 함 (단계 사이 확인용)
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

  const segments = parseSegments(body.segments);
  if (!segments) return NextResponse.json({ error: "segments 형식이 올바르지 않아요." }, { status: 400 });
  const durationSec = typeof body.durationSec === "number" && body.durationSec > 0 ? Math.round(body.durationSec) : undefined;

  await db.$transaction([
    db.speechSegment.createMany({ data: segments.filter((s) => s.text).map((s) => ({ meetingId: params.id, startSec: s.start, endSec: s.end, text: s.text })) }),
    db.meeting.update({
      where: { id: params.id },
      // 소식을 보낼 때마다 마지막 소식 시각을 갱신 (10분 넘게 없으면 멈춘 작업으로 봄)
      data: { ...(durationSec ? { durationSec } : {}), ...(job.meeting.sttStartedAt ? {} : { sttStartedAt: new Date() }), sttHeartbeatAt: new Date() },
    }),
  ]);
  return NextResponse.json({ ok: true, continue: true });
}
