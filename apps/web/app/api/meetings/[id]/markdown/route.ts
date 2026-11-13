import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isPublicProject, requireProjectApi } from "@/lib/auth/access";
import { getMeeting } from "@/lib/meetings";
import { buildMeetingDoc, toMarkdown } from "@/lib/meeting-export";

type Ctx = { params: { id: string } };

// GET /api/meetings/:id/markdown — 회의 결과를 Markdown으로 (Notion을 연결하지 않아도 복사해 붙여 넣기)
// 팀원만. 예시 프로젝트는 누구나
export async function GET(_request: Request, { params }: Ctx) {
  const m = await db.meeting.findUnique({ where: { id: params.id }, select: { projectId: true } });
  if (!m) return NextResponse.json({ error: "회의를 찾을 수 없어요." }, { status: 404 });
  if (!isPublicProject(m.projectId)) {
    const auth = await requireProjectApi(m.projectId);
    if (!auth.ok) return auth.response;
  }
  const meeting = await getMeeting(m.projectId, params.id);
  if (!meeting || (meeting.status && meeting.status !== "done")) return NextResponse.json({ error: "정리가 끝난 회의만 내보낼 수 있어요." }, { status: 409 });
  const md = toMarkdown(await buildMeetingDoc(meeting));
  return new Response(md, { headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store" } });
}
