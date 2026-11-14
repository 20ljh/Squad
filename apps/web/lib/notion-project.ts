import { db } from "./db";
import { decryptSecret } from "./crypto";

// 프로젝트의 Notion 연결 상태 (토큰 원문은 서버 안에서만 꺼내 씀, 화면에는 보내지 않음)

export type NotionStatus = {
  connected: boolean;
  workspace: string | null;
  pageId: string | null;
  pageTitle: string | null;
  /** 처음 내보낼 때 만든 회의록 데이터베이스 (아직 없으면 null) */
  databaseId: string | null;
};

export async function notionStatus(projectId: string): Promise<NotionStatus> {
  const p = await db.project.findUnique({
    where: { id: projectId },
    select: { notionTokenEnc: true, notionWorkspace: true, notionPageId: true, notionPageTitle: true, notionDatabaseId: true },
  });
  return { connected: Boolean(p?.notionTokenEnc), workspace: p?.notionWorkspace ?? null, pageId: p?.notionPageId ?? null, pageTitle: p?.notionPageTitle ?? null, databaseId: p?.notionDatabaseId ?? null };
}

export async function notionToken(projectId: string): Promise<string | null> {
  const p = await db.project.findUnique({ where: { id: projectId }, select: { notionTokenEnc: true } });
  return p?.notionTokenEnc ? decryptSecret(p.notionTokenEnc) : null;
}
