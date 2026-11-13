import { appUrl } from "@/lib/auth/session";
import type { ExportBlock } from "@/lib/meeting-export";

// Notion 공개 연동(OAuth) 어댑터 (CLAUDE.md 10절, lib/integrations/ 로 분리)
// - 팀장이 "Notion 연결"을 누르면 Notion 화면에서 워크스페이스와 공유할 페이지를 고름
// - 받은 토큰은 프로젝트에 암호화해서 저장(lib/crypto.ts), 회의를 내보낼 때만 꺼내 씀
// - Notion API는 초당 3요청 제한 → 블록은 100개씩 나눠 보내고 요청 사이를 띄움

const API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const MAX_TEXT = 1900; // rich_text 하나는 2000자까지

export function notionConfigured(): boolean {
  return Boolean(process.env.NOTION_CLIENT_ID && process.env.NOTION_CLIENT_SECRET);
}

export function notionRedirectUri(): string {
  return `${appUrl()}/api/notion/callback`;
}

export function notionAuthorizeUrl(state: string): string {
  const u = new URL(`${API}/oauth/authorize`);
  u.searchParams.set("client_id", process.env.NOTION_CLIENT_ID ?? "");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("owner", "user");
  u.searchParams.set("redirect_uri", notionRedirectUri());
  u.searchParams.set("state", state);
  return u.toString();
}

export class NotionError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: { method: string; token?: string; body?: unknown; basic?: string }): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json", "Notion-Version": NOTION_VERSION };
  if (init.token) headers.authorization = `Bearer ${init.token}`;
  if (init.basic) headers.authorization = `Basic ${init.basic}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API}${path}`, { method: init.method, headers, body: init.body ? JSON.stringify(init.body) : undefined, cache: "no-store" });
    if (res.status === 429) {
      // 요청 제한: Notion이 알려 준 시간만큼 기다렸다가 다시
      const wait = Number(res.headers.get("retry-after") ?? "1");
      await new Promise((r) => setTimeout(r, Math.min(10, Math.max(1, wait)) * 1000));
      continue;
    }
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) throw new NotionError(String(data.message ?? `Notion 오류 ${res.status}`), res.status, typeof data.code === "string" ? data.code : undefined);
    return data as T;
  }
  throw new NotionError("Notion 요청이 너무 많아요. 잠시 뒤 다시 시도해 주세요.", 429, "rate_limited");
}

/** OAuth code → 토큰과 워크스페이스 이름 */
export async function exchangeNotionCode(code: string): Promise<{ accessToken: string; workspaceName: string }> {
  const basic = Buffer.from(`${process.env.NOTION_CLIENT_ID}:${process.env.NOTION_CLIENT_SECRET}`).toString("base64");
  const data = await call<{ access_token: string; workspace_name?: string | null }>("/oauth/token", {
    method: "POST",
    basic,
    body: { grant_type: "authorization_code", code, redirect_uri: notionRedirectUri() },
  });
  return { accessToken: data.access_token, workspaceName: data.workspace_name ?? "Notion" };
}

type RichText = { plain_text?: string };
type SearchPage = { id: string; object: string; url?: string; properties?: Record<string, { type?: string; title?: RichText[] }>; parent?: { type?: string } };

function pageTitle(p: SearchPage): string {
  for (const prop of Object.values(p.properties ?? {})) {
    if (prop.type === "title") return (prop.title ?? []).map((t) => t.plain_text ?? "").join("") || "제목 없음";
  }
  return "제목 없음";
}

/** 연동이 접근할 수 있는(사용자가 공유한) 페이지 목록. 데이터베이스 안의 행은 빼고 일반 페이지만 */
export async function listNotionPages(token: string): Promise<{ id: string; title: string }[]> {
  const data = await call<{ results: SearchPage[] }>("/search", {
    method: "POST",
    token,
    body: { filter: { property: "object", value: "page" }, sort: { direction: "descending", timestamp: "last_edited_time" }, page_size: 50 },
  });
  return data.results.filter((p) => p.object === "page" && p.parent?.type !== "database_id").map((p) => ({ id: p.id, title: pageTitle(p) }));
}

// ---- 블록 변환 ----

type Rich = { type: "text"; text: { content: string }; annotations?: { bold?: boolean } };

function rich(text: string, bold = false): Rich[] {
  const out: Rich[] = [];
  for (let i = 0; i < text.length || i === 0; i += MAX_TEXT) {
    out.push({ type: "text", text: { content: text.slice(i, i + MAX_TEXT) }, ...(bold ? { annotations: { bold: true } } : {}) });
    if (text.length === 0) break;
  }
  return out;
}

function toNotionBlock(b: ExportBlock): Record<string, unknown> {
  const text = [...(b.lead ? rich(b.lead, true) : []), ...rich(b.text)];
  switch (b.type) {
    case "h2":
      return { object: "block", type: "heading_2", heading_2: { rich_text: text } };
    case "h3":
      return { object: "block", type: "heading_3", heading_3: { rich_text: text } };
    case "bullet":
      return { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: text } };
    case "todo":
      return { object: "block", type: "to_do", to_do: { rich_text: text, checked: Boolean(b.checked) } };
    case "quote":
      return { object: "block", type: "quote", quote: { rich_text: text } };
    case "divider":
      return { object: "block", type: "divider", divider: {} };
    default:
      return { object: "block", type: "paragraph", paragraph: { rich_text: text } };
  }
}

/** 상위 페이지 아래에 회의 페이지를 만들고 주소를 돌려줌. 블록이 100개를 넘으면 나눠서 붙임 */
export async function createNotionMeetingPage(token: string, parentPageId: string, title: string, blocks: ExportBlock[]): Promise<string> {
  const children = blocks.map(toNotionBlock);
  const first = children.slice(0, 100);
  const page = await call<{ id: string; url: string }>("/pages", {
    method: "POST",
    token,
    body: { parent: { page_id: parentPageId }, icon: { type: "emoji", emoji: "🗒️" }, properties: { title: { title: rich(title) } }, children: first },
  });
  for (let i = 100; i < children.length; i += 100) {
    await new Promise((r) => setTimeout(r, 350)); // 초당 3요청 제한
    await call(`/blocks/${page.id}/children`, { method: "PATCH", token, body: { children: children.slice(i, i + 100) } });
  }
  return page.url;
}
