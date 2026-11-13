import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activeJob, checkWorker, unauthorized } from "@/lib/worker-auth";

type Ctx = { params: { id: string } };
type Utt = { speaker: string; start: number; end: number; text: string };

function parseUtterances(v: unknown): Utt[] | null {
  if (!Array.isArray(v) || v.length > 20000) return null;
  const out: Utt[] = [];
  for (const x of v) {
    if (typeof x !== "object" || x === null) return null;
    const { speaker, start, end, text } = x as Record<string, unknown>;
    if (typeof speaker !== "string" || !/^화자\d{1,2}$/.test(speaker)) return null;
    if (typeof start !== "number" || typeof end !== "number" || typeof text !== "string" || !(end >= start) || start < 0) return null;
    const t = text.trim();
    if (t) out.push({ speaker, start, end, text: t.slice(0, 5000) });
  }
  return out;
}

// POST /api/worker/jobs/:id/result — (STT 워커) 받아쓰기 + 화자 나누기 최종 결과
// 본문: { audioPath, durationSec, utterances: [{ speaker: "화자1", start, end, text }] }
// 중간 결과(화자 없음)를 지우고 화자가 붙은 원문으로 바꾼 뒤 상태를 mapping(화자 확인)으로
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
  const utterances = parseUtterances(body.utterances);
  if (!utterances) return NextResponse.json({ error: "utterances 형식이 올바르지 않아요." }, { status: 400 });
  const durationSec = typeof body.durationSec === "number" && body.durationSec > 0 ? Math.round(body.durationSec) : null;

  const meeting = await db.meeting.findUniqueOrThrow({ where: { id: params.id }, select: { startedAt: true } });
  const labels = [...new Set(utterances.map((u) => u.speaker))].sort((a, b) => Number(a.slice(2)) - Number(b.slice(2)));

  await db.$transaction(async (tx) => {
    // 그 사이 취소됐으면 아무것도 바꾸지 않음
    const still = await tx.meeting.updateMany({
      where: { id: params.id, status: "transcribing", audioPath: body.audioPath as string },
      data: {
        status: "mapping",
        durationSec,
        // 시작 시각 + 녹음 길이 = 끝난 시각 → 화면의 "13:51–13:57"
        endedAt: durationSec ? new Date(meeting.startedAt.getTime() + durationSec * 1000) : null,
        sttHeartbeatAt: new Date(),
      },
    });
    if (still.count === 0) throw new Error("cancelled");
    await tx.speechSegment.deleteMany({ where: { meetingId: params.id } });
    await tx.speakerLabel.deleteMany({ where: { meetingId: params.id } });
    const ids: Record<string, string> = {};
    for (const label of labels) {
      const row = await tx.speakerLabel.create({ data: { meetingId: params.id, label }, select: { id: true } });
      ids[label] = row.id;
    }
    await tx.speechSegment.createMany({
      data: utterances.map((u) => ({ meetingId: params.id, speakerLabelId: ids[u.speaker], startSec: u.start, endSec: u.end, text: u.text })),
    });
  }).catch((err: unknown) => {
    if (err instanceof Error && err.message === "cancelled") return "cancelled";
    throw err;
  });

  const now = await db.meeting.findUnique({ where: { id: params.id }, select: { status: true } });
  if (now?.status !== "mapping") return NextResponse.json({ error: "취소됐거나 다른 녹음으로 바뀐 작업이에요.", cancelled: true }, { status: 409 });
  return NextResponse.json({ ok: true, speakers: labels.length, utterances: utterances.length });
}
