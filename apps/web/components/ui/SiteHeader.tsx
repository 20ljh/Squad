import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { LogoMark } from "./Logo";

type Props = {
  /** 로고 오른쪽 라벨 (메인 화면처럼 없으면 생략) */
  context?: string;
  /** 우측 이동 버튼 */
  nav: {
    href: string;
    label: string;
    /** 좁은 화면(모바일)에서 대신 보여줄 짧은 라벨 */
    shortLabel?: string;
    icon?: "grid" | "back";
  };
};

function NavIcon({ kind }: { kind: "grid" | "back" }) {
  if (kind === "back") {
    return (
      <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M10 3l-5 5 5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="1.5" width="5.5" height="9" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <rect x="1.5" y="9" width="5.5" height="5.5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function SiteHeader({ context, nav }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-page items-center gap-2.5 px-4 py-3.5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 text-ink no-underline">
          <LogoMark />
          <span className="font-display text-[15px] font-bold tracking-wide">{BRAND.name}</span>
        </Link>
        {context ? (
          <>
            <span className="mx-1 hidden h-4 w-px bg-line sm:block" aria-hidden="true" />
            <span className="hidden font-display text-[11px] uppercase tracking-[.08em] text-ink-soft sm:block">{context}</span>
          </>
        ) : null}
        <Link
          href={nav.href}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-[12.5px] font-semibold text-ink-soft transition hover:text-accent-strong"
        >
          {nav.icon ? <NavIcon kind={nav.icon} /> : null}
          {nav.shortLabel ? (
            <>
              <span className="sm:hidden">{nav.shortLabel}</span>
              <span className="hidden sm:inline">{nav.label}</span>
            </>
          ) : (
            nav.label
          )}
        </Link>
      </div>
    </header>
  );
}
