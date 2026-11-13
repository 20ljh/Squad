import { decodeIdToken } from "arctic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { googleClient } from "@/lib/auth/google";
import { appUrl, createSession, safeNext } from "@/lib/auth/session";

type GoogleClaims = { sub?: string; email?: string; email_verified?: boolean; name?: string };

// GET /api/auth/google/callback — 구글이 돌려보낸 code를 토큰으로 바꾸고 사용자·세션을 만듦
// id_token은 구글 토큰 엔드포인트에서 TLS로 직접 받은 것이라 서명 검증 없이 내용을 읽어도 됨 (OIDC Core 3.1.3.7)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = cookies();
  const savedState = jar.get("google_state")?.value;
  const verifier = jar.get("google_verifier")?.value;
  const next = safeNext(jar.get("login_next")?.value);
  jar.delete("google_state");
  jar.delete("google_verifier");
  jar.delete("login_next");

  const fail = (reason: string) => NextResponse.redirect(`${appUrl()}/login?error=${reason}&next=${encodeURIComponent(next)}`);
  if (url.searchParams.get("error")) return fail("cancelled"); // 사용자가 구글 화면에서 취소
  if (!code || !state || !savedState || !verifier || state !== savedState) return fail("state");

  let claims: GoogleClaims;
  try {
    const tokens = await googleClient().validateAuthorizationCode(code, verifier);
    claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  } catch (err) {
    console.error("구글 로그인 실패", err);
    return fail("google");
  }
  if (!claims.sub || !claims.email || claims.email_verified === false) return fail("google");

  const name = (claims.name || claims.email.split("@")[0]).slice(0, 40);
  const user = await db.user.upsert({
    where: { googleSub: claims.sub },
    create: { googleSub: claims.sub, email: claims.email, name },
    update: { email: claims.email, name },
    select: { id: true },
  });
  await createSession(user.id, request.headers.get("user-agent"));
  return NextResponse.redirect(`${appUrl()}${next}`);
}
