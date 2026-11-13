import { NextResponse } from "next/server";
import { requireMeetingApi } from "@/lib/auth/access";
import { db } from "@/lib/db";
import { deleteAudio } from "@/lib/audio-store";

type Ctx = { params: { id: string } };

// POST /api/meetings/:id/cancel — 받아쓰는 중인 회의를 취소하고 "녹음 올리기" 단계로 되돌림
// 올린 녹음과 지금까지의 받아쓰기 결과는 지움.
// 이미 녹음을 처리하고 있는 STT 워커는 다음 확인 때 멈추고, 늦게 올리는 결과는 서버가 받지 않음
// (워커는 처리한 녹음 파일 이름을 함께 보내고, 지금 회의의 녹음과 다르면 거절 → 취소 후 새로 올린 녹음과 섞이지 않음)
// 로그인한 이 프로젝트 팀원만 (lib/auth/access.ts)
export async function POST(_request: Request, { params }: Ctx) {
  const auth = await requireMeetingApi(params.id);
  if (!auth.ok) return auth.response;
  const meeting = await db.meeting.findUnique({ where: { id: params.id }, select: { id: true, status: true, audioPath: true } });
  if (!meeting) return NextResponse.json({ error: "회의를 찾을 수 없어요." }, { status: 404 });
  if (meeting.status !== "transcribing") {
    return NextResponse.json({ error: "받아쓰는 중일 때만 취소할 수 있어요." }, { status: 409 });
  }

  // 상태를 먼저 되돌려서, 워커가 확인했을 때 바로 "취소됨"으로 보이게 함
  const updated = await db.meeting.updateMany({
    where: { id: meeting.id, status: "transcribing" },
    data: { status: "draft", audioPath: null, audioName: null, audioSize: null, durationSec: null, sttStartedAt: null, sttHeartbeatAt: null },
  });
  if (updated.count === 0) return NextResponse.json({ error: "이미 다음 단계로 넘어갔어요. 새로고침해 주세요." }, { status: 409 });

  await db.$transaction([db.speechSegment.deleteMany({ where: { meetingId: meeting.id } }), db.speakerLabel.deleteMany({ where: { meetingId: meeting.id } })]);
  await deleteAudio(meeting.audioPath);
  return NextResponse.json({ status: "draft" });
}
