import { SiteHeader } from "@/components/ui/SiteHeader";

// 개인정보 처리 안내·이용 약관 공통 틀 (구글 OAuth 동의 화면·Notion 공개 연동 등록에 쓰는 주소)

export type LegalSection = { title: string; body: React.ReactNode };

export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: LegalSection[] }) {
  return (
    <div className="min-h-screen break-keep bg-surface-alt [overflow-wrap:anywhere]">
      <SiteHeader nav={{ href: "/", label: "메인으로", icon: "back" }} />
      <main className="mx-auto flex w-full max-w-[760px] flex-col gap-8 px-5 pb-20 pt-10 sm:px-8">
        <header className="flex flex-col gap-2">
          <h1 className="m-0 font-display text-[28px] font-semibold">{title}</h1>
          <p className="m-0 text-[14px] text-ink-soft">마지막 수정 {updated}</p>
          <p className="m-0 text-base leading-[1.7]">{intro}</p>
        </header>
        {sections.map((s) => (
          <section key={s.title} className="flex flex-col gap-2">
            <h2 className="m-0 font-display text-lg font-semibold">{s.title}</h2>
            <div className="text-base leading-[1.7] [&_li]:mb-1 [&_p]:m-0 [&_ul]:m-0 [&_ul]:pl-5">{s.body}</div>
          </section>
        ))}
      </main>
    </div>
  );
}
