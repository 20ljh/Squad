import { NextResponse } from "next/server";
import { appUrl, destroySession } from "@/lib/auth/session";

// POST /api/auth/logout — 세션을 무효로 하고 메인으로 (폼 제출이라 303으로 GET 이동)
export async function POST() {
  await destroySession();
  return NextResponse.redirect(`${appUrl()}/`, { status: 303 });
}
