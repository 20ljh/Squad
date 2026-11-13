import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireProjectApi } from "@/lib/auth/access";
import { appUrl, secureCookies } from "@/lib/auth/session";
import { notionAuthorizeUrl, notionConfigured } from "@/lib/integrations/notion";
import { projectPath } from "@/lib/paths";

// GET /api/notion/connect?projectId=... — Notion 연결 시작 (팀장만)
// Notion 화면에서 워크스페이스와 공유할 페이지를 고른 뒤 /api/notion/callback 으로 돌아옴
export async function GET(request: Request) {
  const projectId = new URL(request.url).searchParams.get("projectId") ?? "";
  const auth = await requireProjectApi(projectId, { leaderOnly: true });
  if (!auth.ok) return auth.response;
  if (!notionConfigured()) return NextResponse.redirect(`${appUrl()}${projectPath(projectId)}?notion=config#notion`);

  const state = randomBytes(24).toString("base64url");
  const opts = { httpOnly: true, secure: secureCookies(), sameSite: "lax" as const, path: "/", maxAge: 600 };
  cookies().set("notion_state", state, opts);
  cookies().set("notion_project", projectId, opts);
  return NextResponse.redirect(notionAuthorizeUrl(state));
}
