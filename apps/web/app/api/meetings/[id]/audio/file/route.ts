import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { audioFilePath } from "@/lib/audio-store";
import { isPublicProject, requireProjectApi } from "@/lib/auth/access";

type Ctx = { params: { id: string } };

const MIME: Record<string, string> = {
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  webm: "audio/webm",
  ogg: "audio/ogg",
  aac: "audio/aac",
  flac: "audio/flac",
};

// GET /api/meetings/:id/audio/file — 결과 페이지의 녹음 다시 듣기
// 브라우저가 원하는 구간만 받을 수 있게 Range 요청을 지원 (원문 줄을 눌러 시간 이동할 때 처음부터 받지 않음)
// 로그인한 이 프로젝트 팀원만. 예시 프로젝트(rec-test)의 녹음은 누구나 들을 수 있음 (lib/auth/access.ts)
export async function GET(request: Request, { params }: Ctx) {
  const m = await db.meeting.findUnique({ where: { id: params.id }, select: { audioPath: true, projectId: true } });
  if (m && !isPublicProject(m.projectId)) {
    const auth = await requireProjectApi(m.projectId);
    if (!auth.ok) return auth.response;
  }
  if (!m?.audioPath) return NextResponse.json({ error: "녹음이 없어요." }, { status: 404 });

  let file: string;
  let size: number;
  try {
    file = audioFilePath(m.audioPath);
    size = (await stat(file)).size;
  } catch {
    return NextResponse.json({ error: "녹음 파일을 찾을 수 없어요." }, { status: 404 });
  }
  const type = MIME[m.audioPath.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
  const base = { "content-type": type, "accept-ranges": "bytes", "cache-control": "private, max-age=3600" };

  const range = request.headers.get("range");
  const match = range?.match(/^bytes=(\d*)-(\d*)$/);
  if (match && (match[1] || match[2])) {
    // "bytes=100-" (100부터 끝까지), "bytes=-500" (끝에서 500바이트), "bytes=100-199"
    let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
    let end = match[1] && match[2] ? Number(match[2]) : size - 1;
    end = Math.min(end, size - 1);
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "content-range": `bytes */${size}` } });
    }
    start = Math.max(0, start);
    const stream = Readable.toWeb(createReadStream(file, { start, end })) as ReadableStream;
    return new Response(stream, {
      status: 206,
      headers: { ...base, "content-length": String(end - start + 1), "content-range": `bytes ${start}-${end}/${size}` },
    });
  }
  const stream = Readable.toWeb(createReadStream(file)) as ReadableStream;
  return new Response(stream, { headers: { ...base, "content-length": String(size) } });
}
