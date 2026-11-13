import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { GOOGLE_SCOPES, googleClient, googleConfigured } from "@/lib/auth/google";
import { appUrl, safeNext, secureCookies } from "@/lib/auth/session";

// GET /api/auth/google?next=/p/... — 구글 로그인 시작
// state(위조 요청 방지)·code_verifier(PKCE)는 10분짜리 httpOnly 쿠키에 두고 콜백에서 확인
export async function GET(request: Request) {
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  if (!googleConfigured()) return NextResponse.redirect(`${appUrl()}/login?error=config&next=${encodeURIComponent(next)}`);

  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = googleClient().createAuthorizationURL(state, verifier, GOOGLE_SCOPES);
  url.searchParams.set("prompt", "select_account"); // 여러 구글 계정 중 고를 수 있게

  const opts = { httpOnly: true, secure: secureCookies(), sameSite: "lax" as const, path: "/", maxAge: 600 };
  cookies().set("google_state", state, opts);
  cookies().set("google_verifier", verifier, opts);
  cookies().set("login_next", next, opts);
  return NextResponse.redirect(url);
}
