import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMeetingApi } from "@/lib/auth/access";
import { getMeeting } from "@/lib/meetings";
import { buildMeetingDoc } from "@/lib/meeting-export";
import { NotionError, createNotionMeetingPage } from "@/lib/integrations/notion";
import { notionStatus, notionToken } from "@/lib/notion-project";

type Ctx = { params: { id: string } };

// POST /api/meetings/:id/notion-export — 정리된 회의를 팀 Notion 페이지 아래에 새 페이지로 내보냄 (팀원 누구나)
// 응답 { url }. 다시 누르면 새 페이지를 하나 더 만듦 (Notion 쪽 페이지를 고친 내용을 덮어쓰지 않게)
export async function POST(_request: Request, { params }: Ctx) {
  const auth = await requireMeetingApi(params.id);
  if (!auth.ok) return auth.response;
  const projectId = auth.projectId;

  const status = await notionStatus(projectId);
  if (!status.connected || !status.pageId) {
    return NextResponse.json({ error: "아직 Notion이 연결되지 않았어요. 팀장이 팀 대시보드의 Notion 칸에서 연결하고 페이지를 골라 주세요.", code: "not_connected" }, { status: 409 });
  }
  const meeting = await getMeeting(projectId, params.id);
  if (!meeting || (meeting.status && meeting.status !== "done")) return NextResponse.json({ error: "정리가 끝난 회의만 내보낼 수 있어요." }, { status: 409 });

  try {
    const doc = await buildMeetingDoc(meeting);
    const url = await createNotionMeetingPage((await notionToken(projectId))!, status.pageId, doc.title, doc.blocks);
    await db.meeting.update({ where: { id: meeting.id }, data: { notionPageUrl: url } });
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Notion 내보내기 실패", err);
    if (err instanceof NotionError && (err.status === 401 || err.status === 404)) {
      return NextResponse.json(
        { error: "Notion 페이지에 접근할 수 없어요. 팀장이 Notion을 다시 연결하거나 내보낼 페이지를 다시 골라 주세요.", code: "not_connected" },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: "Notion으로 내보내지 못했어요. 잠시 뒤 다시 시도해 주세요." }, { status: 502 });
  }
}
