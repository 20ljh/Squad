import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/lib/db";

// 로그인 세션 (CLAUDE.md 3절): 무작위 토큰은 httpOnly 쿠키에, DB에는 SHA-256 해시만 저장
// DB가 새도 해시로는 쿠키를 만들 수 없음. 로그아웃하면 revokedAt을 채워 바로 무효

export const SESSION_COOKIE = "sq_session";
const SESSION_DAYS = 30;
const TOUCH_MS = 60 * 60 * 1000; // 마지막 접속 시각은 한 시간에 한 번만 갱신

/** 서비스 주소 (구글·Notion 콜백 주소를 만들 때 씀). 배포에서는 https 주소 */
export function appUrl(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

/** https로 서비스할 때만 Secure 쿠키 (로컬 http 개발에서는 Secure면 쿠키가 안 붙음) */
export function secureCookies(): boolean {
  return appUrl().startsWith("https://");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** "Chrome · Windows"처럼 기기 표시 이름 (정확할 필요 없음, 세션 목록 표시용) */
function deviceLabel(ua: string | null): string {
  if (!ua) return "알 수 없는 기기";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "브라우저";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "기타";
  return `${browser} | ${os}`;
}

/** 로그인 성공 뒤 세션을 만들고 쿠키를 붙임 (Route Handler 안에서만 호출) */
export async function createSession(userId: string, userAgent: string | null): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { userId, tokenHash: hashToken(token), label: deviceLabel(userAgent), expiresAt } });
  cookies().set(SESSION_COOKIE, token, { httpOnly: true, secure: secureCookies(), sameSite: "lax", path: "/", expires: expiresAt });
}

export type CurrentUser = { id: string; name: string; email: string };

/** 지금 요청의 로그인 사용자. 없거나 만료·로그아웃된 세션이면 null (한 요청 안에서는 한 번만 조회) */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const s = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, expiresAt: true, revokedAt: true, lastSeenAt: true, user: { select: { id: true, name: true, email: true } } },
  });
  if (!s || s.revokedAt || s.expiresAt < new Date()) return null;
  if (Date.now() - s.lastSeenAt.getTime() > TOUCH_MS) {
    void db.session.update({ where: { id: s.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }
  return s.user;
});

/** 로그아웃: 세션 무효 + 쿠키 삭제 */
export async function destroySession(): Promise<void> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (token) await db.session.updateMany({ where: { tokenHash: hashToken(token), revokedAt: null }, data: { revokedAt: new Date() } });
  cookies().delete(SESSION_COOKIE);
}

/** 로그인 뒤 돌아갈 주소. 우리 사이트 안의 경로만 허용 (다른 사이트로 보내는 공격 방지) */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
