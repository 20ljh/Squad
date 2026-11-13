"use client";

import Link from "next/link";
import { useState } from "react";

type Sample = { question: string; answer: string; linkLabel: string; href: string };

type Props = {
  /** 예시 질문·답변. 없으면(DB 프로젝트) 검색 칸만 두고 "회의가 쌓이면" 안내 */
  sample?: Sample;
};

// 지금은 예시 질문/답변을 보여주는 데모. RAG 검색 API가 생기면 handleSubmit에서 호출하도록 교체합니다.
export function MeetingSearch({ sample }: Props) {
  if (!sample) return <EmptySearch />;
  return <SampleSearch sample={sample} />;
}

function EmptySearch() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line bg-white p-5">
      <div className="flex flex-wrap gap-2">
        <label htmlFor="meeting-search" className="sr-only">
          회의 기록 검색어
        </label>
        <input
          id="meeting-search"
          type="text"
          disabled
          placeholder="예: API 방식 왜 REST로 정했어?"
          aria-describedby="meeting-search-empty"
          className="h-12 min-w-[200px] flex-1 rounded-sm border border-ink-soft/50 bg-surface-alt px-4 text-base text-ink placeholder:text-ink-soft"
        />
        <button type="button" disabled className="h-12 shrink-0 whitespace-nowrap rounded-sm bg-accent-strong px-6 text-[15px] font-bold text-white opacity-60">
          검색
        </button>
      </div>
      <p id="meeting-search-empty" className="m-0 text-[13px] text-ink-soft">
        아직 회의가 없어요. 회의가 쌓이면 지난 회의 전체에서 찾을 수 있어요.
      </p>
    </div>
  );
}

function SampleSearch({ sample }: { sample: Sample }) {
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
