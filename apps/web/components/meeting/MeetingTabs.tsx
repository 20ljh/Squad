"use client";

import { useEffect, useRef, useState } from "react";

// 회의 결과 페이지의 탭: "요약"(기본) / "녹음·원문"
// 주소 끝 #transcript 로 들어오면 녹음·원문 탭부터 열림 (공유·새로고침해도 같은 탭)

type TabKey = "summary" | "transcript";

const TABS: { key: TabKey; label: string }[] = [
  { key: "summary", label: "요약" },
  { key: "transcript", label: "녹음·원문" },
];

export function MeetingTabs({ summary, transcript }: { summary: React.ReactNode; transcript: React.ReactNode }) {
  const [tab, setTab] = useState<TabKey>("summary");
  const refs = useRef<Record<TabKey, HTMLButtonElement | null>>({ summary: null, transcript: null });

  // 주소의 #transcript 를 따라감 (처음 열 때, 같은 페이지 안에서 링크로 이동할 때)
  useEffect(() => {
    const sync = () => setTab(window.location.hash === "#transcript" ? "transcript" : "summary");
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  function select(key: TabKey, focus = false) {
    setTab(key);
    history.replaceState(null, "", key === "transcript" ? "#transcript" : window.location.pathname + window.location.search);
    if (focus) refs.current[key]?.focus();
  }

  // 키보드: 왼쪽·오른쪽 화살표로 탭 이동 (WAI-ARIA 탭 패턴)
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const i = TABS.findIndex((t) => t.key === tab);
    const next = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length];
    select(next.key, true);
  }

  return (
    <div className="flex flex-col gap-8">
      <div role="tablist" aria-label="회의 결과 보기" onKeyDown={onKeyDown} className="flex gap-1 border-b border-line">
        {TABS.map((t) => {
          const on = tab === t.key;
          return (
            <button
              key={t.key}
              ref={(el) => {
                refs.current[t.key] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.key}`}
              aria-selected={on}
              aria-controls={`panel-${t.key}`}
              tabIndex={on ? 0 : -1}
              onClick={() => select(t.key)}
              className={`-mb-px min-h-12 border-b-[3px] px-5 text-[16px] font-bold transition-colors duration-150 ${
                on ? "border-accent-strong text-accent-strong" : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      {/* hidden 속성만으로는 flex 클래스에 가려 안 숨겨지므로 클래스로도 숨김 */}
      <div role="tabpanel" id="panel-summary" aria-labelledby="tab-summary" hidden={tab !== "summary"} className={tab === "summary" ? "flex flex-col gap-12" : "hidden"}>
        {summary}
      </div>
      <div role="tabpanel" id="panel-transcript" aria-labelledby="tab-transcript" hidden={tab !== "transcript"} className={tab === "transcript" ? "block" : "hidden"}>
        {transcript}
      </div>
    </div>
  );
}
