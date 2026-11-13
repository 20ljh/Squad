import { Google } from "arctic";
import { appUrl } from "./session";

// 구글 로그인 (OAuth 2.0 + PKCE). 요청 범위는 openid·email·profile만 (CLAUDE.md 10절)
// 구글 토큰은 저장하지 않음: 로그인 순간 신원(sub·email·name)만 확인하고 버림

export const GOOGLE_SCOPES = ["openid", "email", "profile"];

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleClient(): Google {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new Error("GOOGLE_CLIENT_ID·GOOGLE_CLIENT_SECRET이 apps/web/.env 에 없어요.");
  return new Google(id, secret, `${appUrl()}/api/auth/google/callback`);
}
