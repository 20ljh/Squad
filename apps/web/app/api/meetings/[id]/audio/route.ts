import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { AUDIO_EXTS, MAX_AUDIO_BYTES, audioExt, deleteAudio, saveAudio } from "@/lib/audio-store";

type Ctx = { params: { id: string } };

// POST /api/meetings/:id/audio — 회의 녹음 올리기 (multipart, 칸 이름 "audio")
// 저장하면 상태가 transcribing 이 되고, STT 워커가 /api/worker/claim 으로 가져감
// 로그인 전(11/16 제출본)이라 팀원 확인은 없음. 로그인을 붙이면 세션 사용자가 이 프로젝트 팀원인지 확인할 것
export async function POST(request: Request, { params }: Ctx) {
  const meeting = await db.meeting.findUnique({ where: { id: params.id }, select: { id: true, projectId: true, status: true, audioPath: true } });
  if (!meeting) return NextResponse.json({ error: "회의를 찾을 수 없어요." }, { status: 404 });
  if (meeting.status !== "draft" && meeting.status !== "failed") {
    return NextResponse.json({ error: "이미 녹음을 올린 회의예요." }, { status: 409 });
  }

  let file: File | null = null;
  try {
    const form = await request.formData();
    const f = form.get("audio");
    file = f instanceof File ? f : null;
  } catch {
    return NextResponse.json({ error: "파일을 읽지 못했어요. 다시 골라 주세요." }, { status: 400 });
  }
  if (!file || file.size === 0) return NextResponse.json({ error: "녹음 파일을 골라 주세요." }, { status: 400 });
  if (file.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: "파일이 너무 커요. 300MB 이하로 올려 주세요." }, { status: 413 });
  const ext = audioExt(file.name);
  if (!ext) {
    return NextResponse.json({ error: `음성 파일만 올릴 수 있어요 (${AUDIO_EXTS.join(", ")}).` }, { status: 415 });
  }

  try {
    const name = await saveAudio(await file.arrayBuffer(), ext);
    // 다시 올리는 경우(실패 후) 이전 파일은 지움
    await deleteAudio(meeting.audioPath);
    // 화면 표시용 원래 이름: 경로·제어 문자를 빼고 100자까지
    const shownName = file.name.split(/[\\/]/).pop()!.replace(/[\u0000-\u001f]/g, "").slice(0, 100) || `녹음.${ext}`;
    await db.$transaction([
      // 실패 후 다시 올리는 경우 이전 받아쓰기 조각은 지움
      db.speechSegment.deleteMany({ where: { meetingId: meeting.id } }),
      db.speakerLabel.deleteMany({ where: { meetingId: meeting.id } }),
      db.meeting.update({
        where: { id: meeting.id },
        data: { audioPath: name, audioName: shownName, audioSize: file.size, durationSec: null, sttStartedAt: null, sttHeartbeatAt: null, failReason: null, status: "transcribing" },
      }),
    ]);
    return NextResponse.json({ status: "transcribing" }, { status: 201 });
  } catch (err) {
    console.error("녹음 저장 실패", err);
    return NextResponse.json({ error: "녹음을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 500 });
  }
}
