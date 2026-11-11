"use client";

import Link from "next/link";
import { useState } from "react";

type Props = {
  sample: { question: string; answer: string; linkLabel: string; href: string };
};

// 지금은 예시 질문/답변을 보여주는 데모. RAG 검색 API가 생기면 handleSubmit에서 호출하도록 교체합니다.
export function MeetingSearch({ sample }: Props) {
  const [query, setQuery] = useState(sample.question);
  const [open, setOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOpen((v) => !v);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-5">
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-2" role="search">
        <label htmlFor="meeting-search" className="sr-only">
          회의 기록 검색어
        </label>
        <input
          id="meeting-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 min-w-[200px] flex-1 rounded-sm border border-ink-soft/50 bg-white px-4 text-base text-ink transition-colors duration-150 hover:border-ink-soft"
        />
        <button
          type="submit"
          className="h-12 shrink-0 whitespace-nowrap rounded-sm bg-accent-strong px-6 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
        >
          {open ? "결과 접기" : "검색"}
        </button>
      </form>
      {open ? (
        <div className="flex animate-fade-in flex-col gap-3 rounded-sm bg-surface-alt p-4" aria-live="polite">
          <p className="m-0 text-[15px] leading-relaxed text-ink">{sample.answer}</p>
          <Link
            href={sample.href}
            className="inline-flex min-h-11 items-center self-start rounded-sm border border-line bg-white px-4 text-sm font-semibold text-accent-strong no-underline transition-colors duration-150 hover:border-accent"
          >
            {sample.linkLabel}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
