import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { BRAND, pageTitle } from "@/lib/brand";
import { getCurrentUser, safeNext } from "@/lib/auth/session";
import { googleConfigured } from "@/lib/auth/google";

export const metadata: Metadata = { title: pageTitle("로그인") };

type Props = { searchParams: { next?: string; error?: string } };

const ERRORS: Record<string, string> = {
  cancelled: "구글 로그인을 취소했어요. 다시 시도해 주세요.",
  state: "로그인 시간이 지났거나 다른 창에서 시작한 로그인이에요. 다시 시도해 주세요.",
  google: "구글 계정 정보를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요.",
  config: "서버에 구글 로그인 설정이 아직 없어요. 관리자에게 알려 주세요.",
};

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

// 로그인(/login?next=...) — 구글 계정으로만 로그인. 모든 프로젝트 기능은 로그인 후에 (CLAUDE.md 7절)
export default async function LoginPage({ searchParams }: Props) {
  const next = safeNext(searchParams.next);
  if (await getCurrentUser()) redirect(next);
  const error = searchParams.error ? ERRORS[searchParams.error] ?? ERRORS.google : null;
  const ready = googleConfigured();

  return (
    <div className="min-h-screen break-keep bg-surface-alt [overflow-wrap:anywhere]">
      <SiteHeader nav={{ href: "/", label: "메인으로", icon: "back" }} />
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-6 px-5 pb-16 pt-12 sm:pt-20">
        <section className="flex animate-fade-up flex-col gap-6 rounded-lg border border-line bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-2">
            <h1 className="m-0 font-display text-[26px] font-bold leading-[1.3]">로그인</h1>
            <p className="m-0 text-base leading-[1.6] text-ink-soft">
              {BRAND.name}는 구글 계정으로 로그인해요. 다른 기기에서도 같은 계정으로 들어오면 내 프로젝트가 그대로 보여요.
            </p>
          </div>
          {error ? (
            <p role="alert" className="m-0 rounded-sm bg-warn-soft px-4 py-3 text-[15px] text-warn">
              {error}
            </p>
          ) : null}
          {ready ? (
            <a
              href={`/api/auth/google?next=${encodeURIComponent(next)}`}
              className="flex min-h-12 items-center justify-center gap-3 rounded-sm border border-ink-soft/50 bg-white px-5 text-base font-semibold text-ink no-underline transition-colors duration-150 hover:border-accent hover:bg-surface-alt"
            >
              <GoogleMark />
              구글 계정으로 계속하기
            </a>
          ) : (
            <p className="m-0 rounded-sm bg-surface-alt px-4 py-3 text-[15px] text-ink-soft">{ERRORS.config}</p>
          )}
          <p className="m-0 text-[13px] leading-[1.6] text-ink-soft">
            구글에서는 이름·이메일·계정 ID만 받아요. 구글 비밀번호나 다른 정보는 받지 않아요.{" "}
            <a href="/privacy" className="text-accent-strong underline">
              개인정보 처리 안내
            </a>
          </p>
        </section>
      </main>
    </div>
  );
}
