import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMeetingApi } from "@/lib/auth/access";
import { deleteAudio } from "@/lib/audio-store";

type Ctx = { params: { id: string } };

// DELETE /api/meetings/:id — 회의 기록 삭제 (그 프로젝트 팀장만)
// 회의에 딸린 요약·안건·의견·할 일·일정·원문·화자는 DB에서 함께 지워지고(Cascade), 저장된 녹음 파일도 지움
// 받아쓰는 중이던 회의면 워커는 다음 확인 때 404를 받고 멈춤
export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireMeetingApi(params.id, { leaderOnly: true });
  if (!auth.ok) return auth.response;

  const m = await db.meeting.findUnique({ where: { id: params.id }, select: { id: true, audioPath: true } });
  if (!m) return NextResponse.json({ error: "회의를 찾을 수 없어요." }, { status: 404 });
  await db.meeting.delete({ where: { id: m.id } });
  await deleteAudio(m.audioPath);
  return NextResponse.json({ deleted: true });
}
