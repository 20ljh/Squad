import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectApi } from "@/lib/auth/access";
import { deleteAudio } from "@/lib/audio-store";

type Ctx = { params: { id: string } };

// DELETE /api/projects/:id — 프로젝트 전체 삭제 (팀장만)
// 팀원·회의·요약·원문·참여 요청은 DB에서 함께 지워지고(Cascade), 저장된 회의 녹음 파일도 지움
export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireProjectApi(params.id, { leaderOnly: true });
  if (!auth.ok) return auth.response;

  const meetings = await db.meeting.findMany({ where: { projectId: params.id }, select: { audioPath: true } });
  await db.project.delete({ where: { id: params.id } });
  for (const m of meetings) await deleteAudio(m.audioPath);
  return NextResponse.json({ deleted: true });
}
