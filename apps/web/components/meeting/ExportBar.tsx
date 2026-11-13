"use client";

import { useState } from "react";

// 회의 결과 맨 아래 내보내기
// - Notion으로 내보내기: 팀장이 대시보드에서 Notion을 연결하고 페이지를 골라 둔 경우 (팀원 누구나 누를 수 있음)
// - Markdown 복사: Notion 연결 없이도 결과를 복사해 어디든 붙여 넣기

type Props = {
  meetingId: string;
  summary: string;
  /** null이면 Notion 내보내기를 쓸 수 없는 화면(예시 프로젝트) */
  notion: { ready: boolean; pageTitle: string | null; lastUrl: string | null } | null;
};

type Status = { kind: "idle" | "busy" | "ok" | "error"; text?: string; url?: string };

export function ExportBar({ meetingId, summary, notion }: Props) {
  const [exp, setExp] = useState<Status>({ kind: "idle", url: notion?.lastUrl ?? undefined });
  const [copy, setCopy] = useState<Status>({ kind: "idle" });
  const id = encodeURIComponent(meetingId);

  async function exportNotion() {
    setExp({ kind: "busy" });
    try {
      const res = await fetch(`/api/meetings/${id}/notion-export`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) setExp({ kind: "error", text: data.error ?? "내보내지 못했어요. 잠시 뒤 다시 시도해 주세요." });
      else setExp({ kind: "ok", text: "Notion 페이지로 내보냈어요", url: data.url });
    } catch {
      setExp({ kind: "error", text: "서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요." });
    }
  }

  async function copyMarkdown() {
    setCopy({ kind: "busy" });
    try {
      const res = await fetch(`/api/meetings/${id}/markdown`);
      if (!res.ok) throw new Error();
      await navigator.clipboard.writeText(await res.text());
      setCopy({ kind: "ok", text: "Markdown을 복사했어요. Notion·문서에 붙여 넣으면 돼요." });
    } catch {
      setCopy({ kind: "error", text: "복사하지 못했어요. 잠시 뒤 다시 시도해 주세요." });
    }
  }

  const notionHint = !notion
    ? "예시 프로젝트는 Markdown 복사만 할 수 있어요."
    : notion.ready
      ? `${notion.pageTitle ?? "팀 Notion"} 페이지 아래에 회의록을 만들어요.`
      : "Notion으로 내보내려면 팀장이 팀 대시보드에서 Notion을 연결해 주세요.";

  return (
    <footer className="flex flex-col gap-4 rounded-lg border border-line bg-white px-5 py-5 md:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="m-0 text-base font-bold">이 결과를 팀 문서로 옮길까요?</p>
          <p className="mt-1 text-sm text-ink-soft">{summary}</p>
          <p className="mt-1 text-sm text-ink-soft">{notionHint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={copyMarkdown}
            disabled={copy.kind === "busy"}
            className="h-12 whitespace-nowrap rounded-sm border border-ink-soft/50 bg-white px-5 text-[15px] font-semibold text-ink transition-colors duration-150 hover:border-accent hover:text-accent-strong disabled:opacity-60"
          >
            Markdown 복사
          </button>
          {notion?.ready ? (
            <button
              type="button"
              onClick={exportNotion}
              disabled={exp.kind === "busy"}
              className="h-12 whitespace-nowrap rounded-sm bg-accent-strong px-6 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-accent-deep disabled:cursor-wait disabled:opacity-80"
            >
              {exp.kind === "busy" ? "내보내는 중…" : "Notion으로 내보내기"}
            </button>
          ) : null}
        </div>
      </div>
      <div aria-live="polite" className="flex flex-col gap-1 text-sm font-semibold empty:hidden">
        {exp.kind === "ok" || exp.kind === "error" ? <span className={exp.kind === "ok" ? "animate-fade-in text-accent-strong" : "text-warn"}>{exp.text}</span> : null}
        {exp.url ? (
          <a href={exp.url} target="_blank" rel="noopener noreferrer" className="text-accent-strong underline">
            {exp.kind === "ok" ? "Notion에서 열기" : "지난번에 내보낸 Notion 페이지 열기"}
          </a>
        ) : null}
        {copy.kind === "ok" || copy.kind === "error" ? <span className={copy.kind === "ok" ? "text-accent-strong" : "text-warn"}>{copy.text}</span> : null}
      </div>
    </footer>
  );
}
