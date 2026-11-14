import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectApi } from "@/lib/auth/access";
import { NotionError, listNotionPages } from "@/lib/integrations/notion";
import { notionToken } from "@/lib/notion-project";

type Ctx = { params: { id: string } };

// 프로젝트의 Notion 설정 (팀장만)
// GET    → 연동이 볼 수 있는 페이지 목록 { pages: [{ id, title }] }
// POST   { pageId } → 회의를 내보낼 상위 페이지로 정함
// DELETE → 연결 끊기 (저장한 토큰 삭제)

export async function GET(_request: Request, { params }: Ctx) {
  const auth = await requireProjectApi(params.id, { leaderOnly: true });
  if (!auth.ok) return auth.response;
  const token = await notionToken(params.id);
  if (!token) return NextResponse.json({ error: "Notion이 연결되어 있지 않아요." }, { status: 409 });
  try {
    return NextResponse.json({ pages: await listNotionPages(token) });
  } catch (err) {
    const unauthorized = err instanceof NotionError && err.status === 401;
    return NextResponse.json(
      { error: unauthorized ? "Notion 연결이 끊겼어요. 다시 연결해 주세요." : "Notion 페이지 목록을 가져오지 못했어요. 잠시 뒤 다시 시도해 주세요." },
      { status: unauthorized ? 409 : 502 },
    );
  }
}

export async function POST(request: Request, { params }: Ctx) {
  const auth = await requireProjectApi(params.id, { leaderOnly: true });
  if (!auth.ok) return auth.response;
  const body = (await request.json().catch(() => ({}))) as { pageId?: unknown };
  const token = await notionToken(params.id);
  if (!token) return NextResponse.json({ error: "Notion이 연결되어 있지 않아요." }, { status: 409 });
  // 화면에서 보낸 값을 믿지 않고, 실제로 연동이 볼 수 있는 페이지인지 다시 확인
  const pages = await listNotionPages(token).catch(() => null);
  const page = pages?.find((p) => p.id === body.pageId);
  if (!page) return NextResponse.json({ error: "그 페이지를 찾을 수 없어요. Notion 연결 때 공유한 페이지 중에서 골라 주세요." }, { status: 400 });
  await db.project.update({ where: { id: params.id }, data: { notionPageId: page.id, notionPageTitle: page.title, notionDatabaseId: null } }); // 페이지를 바꾸면 회의록 데이터베이스는 새로
  return NextResponse.json({ pageId: page.id, pageTitle: page.title });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const auth = await requireProjectApi(params.id, { leaderOnly: true });
  if (!auth.ok) return auth.response;
  await db.project.update({
    where: { id: params.id },
    data: { notionTokenEnc: null, notionWorkspace: null, notionConnectedAt: null, notionPageId: null, notionPageTitle: null, notionDatabaseId: null },
  });
  return NextResponse.json({ connected: false });
}
