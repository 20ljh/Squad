import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireMeetingApi } from "@/lib/auth/access";
import { getMeeting } from "@/lib/meetings";
import { buildMeetingDoc } from "@/lib/meeting-export";
import { NotionError, createMeetingsDatabase, createNotionMeetingPage } from "@/lib/integrations/notion";
import { notionStatus, notionToken } from "@/lib/notion-project";

type Ctx = { params: { id: string } };

// POST /api/meetings/:id/notion-export — 정리된 회의를 팀 Notion의 "회의록" 데이터베이스에 한 줄(페이지)로 내보냄 (팀원 누구나)
// 데이터베이스는 팀장이 고른 페이지 안에 처음 내보낼 때 인라인으로 만듦 (일시·방식·참석 속성). 누가 지웠으면 다시 만듦
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
    const token = (await notionToken(projectId))!;
    const pageId = status.pageId;
    const newDatabase = async () => {
      const id = await createMeetingsDatabase(token, pageId);
      await db.project.update({ where: { id: projectId }, data: { notionDatabaseId: id } });
      return id;
    };
    let databaseId = status.databaseId ?? (await newDatabase());
    let url: string;
    try {
      url = await createNotionMeetingPage(token, databaseId, doc);
    } catch (err) {
      // 회의록 데이터베이스를 Notion에서 지웠거나 옮긴 경우 → 고른 페이지 안에 새로 만들고 한 번 더
      if (!(err instanceof NotionError && err.status === 404 && status.databaseId)) throw err;
      databaseId = await newDatabase();
      url = await createNotionMeetingPage(token, databaseId, doc);
    }
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
