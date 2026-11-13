import { NextResponse } from "next/server";
import { db } from "./db";
import { isWorkerRequest } from "./secrets";

// STT 워커 API 공통: 비밀 키 확인 + "이 작업이 아직 유효한지" 확인
// 유효 = 회의가 받아쓰는 중이고, 워커가 처리하는 녹음 파일 이름이 지금 회의의 녹음과 같음
// (취소됐거나 새 녹음으로 바뀌었으면 409 → 워커는 그 자리에서 멈춤)

export function unauthorized() {
  return NextResponse.json({ error: "워커 키가 없거나 맞지 않아요." }, { status: 401 });
}

export function checkWorker(request: Request): boolean {
  return isWorkerRequest(request.headers.get("authorization"));
}

export async function activeJob(meetingId: string, audioPath: unknown) {
  const m = await db.meeting.findUnique({ where: { id: meetingId }, select: { id: true, status: true, audioPath: true, sttStartedAt: true } });
  if (!m) return { error: NextResponse.json({ error: "회의를 찾을 수 없어요.", cancelled: true }, { status: 404 }) } as const;
  if (m.status !== "transcribing" || typeof audioPath !== "string" || m.audioPath !== audioPath) {
    return { error: NextResponse.json({ error: "취소됐거나 다른 녹음으로 바뀐 작업이에요.", cancelled: true }, { status: 409 }) } as const;
  }
  return { meeting: m } as const;
}
