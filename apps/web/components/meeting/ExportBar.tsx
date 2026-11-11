"use client";

import { useState } from "react";

type Props = {
  meetingId: string;
  summary: string;
};

type Status = "idle" | "exporting" | "done" | "error";

export function ExportBar({ meetingId, summary }: Props) {
  const [status, setStatus] = useState<Status>("idle");

  async function handleExport() {
    setStatus("exporting");
    try {
      // TODO: 백엔드 연결 시 교체 — await fetch(`/api/notion-export/${meetingId}`, { method: "POST" })
      await new Promise((r) => setTimeout(r, 700));
      void meetingId;
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-line bg-white px-5 py-5 md:px-6">
      <div>
        <p className="m-0 text-base font-bold">이 결과를 Notion 페이지로 내보낼까요?</p>
        <p className="mt-1 text-sm text-ink-soft">{summary}</p>
      </div>
      <div className="flex items-center gap-3">
        <span aria-live="polite" className="text-sm font-semibold">
          {status === "done" ? <span className="animate-fade-in text-accent-strong">Notion 페이지로 내보냈어요</span> : null}
          {status === "error" ? <span className="text-warn">내보내지 못했어요. Notion 연결을 확인한 뒤 다시 시도해 주세요.</span> : null}
        </span>
        <button
          type="button"
          onClick={handleExport}
          disabled={status === "exporting"}
          className="h-12 whitespace-nowrap rounded-sm bg-accent-strong px-6 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-accent-deep disabled:cursor-wait disabled:opacity-80"
        >
          {status === "exporting" ? "내보내는 중…" : "Notion으로 내보내기"}
        </button>
      </div>
    </footer>
  );
}
