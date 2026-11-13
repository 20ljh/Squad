import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireProjectApi } from "@/lib/auth/access";
import { appUrl } from "@/lib/auth/session";
import { encryptSecret } from "@/lib/crypto";
import { exchangeNotionCode } from "@/lib/integrations/notion";
import { projectPath } from "@/lib/paths";

// GET /api/notion/callback — Notion이 돌려보낸 code를 토큰으로 바꿔 프로젝트에 암호화 저장
// 그다음 대시보드의 Notion 칸에서 회의를 내보낼 페이지를 고름
export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = cookies();
  const savedState = jar.get("notion_state")?.value;
  const projectId = jar.get("notion_project")?.value ?? "";
  jar.delete("notion_state");
  jar.delete("notion_project");
  const back = (result: string) => NextResponse.redirect(`${appUrl()}${projectPath(projectId || "")}?notion=${result}#notion`);

  if (!projectId) return NextResponse.redirect(`${appUrl()}/`);
  const auth = await requireProjectApi(projectId, { leaderOnly: true });
  if (!auth.ok) return auth.response;
  if (url.searchParams.get("error")) return back("cancelled");
  const code = url.searchParams.get("code");
  if (!code || !savedState || url.searchParams.get("state") !== savedState) return back("state");

  try {
    const { accessToken, workspaceName } = await exchangeNotionCode(code);
    await db.project.update({
      where: { id: projectId },
      data: { notionTokenEnc: encryptSecret(accessToken), notionWorkspace: workspaceName, notionConnectedAt: new Date(), notionPageId: null, notionPageTitle: null },
    });
  } catch (err) {
    console.error("Notion 연결 실패", err);
    return back("failed");
  }
  return back("connected");
}
