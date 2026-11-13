import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { audioFilePath } from "@/lib/audio-store";
import { activeJob, checkWorker, unauthorized } from "@/lib/worker-auth";

type Ctx = { params: { id: string } };

// GET /api/worker/jobs/:id/audio?audioPath=… — (STT 워커) 가져간 회의의 녹음 파일 내려받기
// 받아쓰는 중이고 녹음 이름이 맞을 때만 (취소됐으면 409)
export async function GET(request: Request, { params }: Ctx) {
  if (!checkWorker(request)) return unauthorized();
  const audioPath = new URL(request.url).searchParams.get("audioPath");
  const job = await activeJob(params.id, audioPath);
  if ("error" in job) return job.error;

  let file: string;
  try {
    file = audioFilePath(audioPath!);
    const info = await stat(file);
    const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
    return new Response(stream, {
      headers: { "content-type": "application/octet-stream", "content-length": String(info.size), "cache-control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "녹음 파일을 찾을 수 없어요." }, { status: 404 });
  }
}
