"use client";

import { useState } from "react";

// 달력 한 달 보기 (일정 날짜·최종 마감일·회의 일자에서 같이 씀)
// 위에 "11월"과 이전·다음 달, 요일 줄(일요일은 붉게), 고른 날은 볼펜 파랑 칸, 오늘은 테두리
// min·max 밖의 날은 누를 수 없음. 값은 "YYYY-MM-DD"

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function isoOf(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function todayIso(): string {
  const t = new Date();
  return isoOf(t.getFullYear(), t.getMonth(), t.getDate());
}

/** "2026-11-19" → { y, m(0부터), d, md: "11/19", weekday: "목요일", label: "2026.11.19 (목)" } */
export function dateInfo(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return { y, m: m - 1, d, md: `${m}/${d}`, weekday: `${wd}요일`, label: `${y}.${String(m).padStart(2, "0")}.${String(d).padStart(2, "0")} (${wd})` };
}

type Props = {
  value: string | null;
  onSelect: (iso: string) => void;
  /** 처음 보여 줄 달 (값이 없을 때) */
  initialMonth?: string;
  min?: string;
  max?: string;
};

export function Calendar({ value, onSelect, initialMonth, min, max }: Props) {
  const start = dateInfo(value ?? initialMonth ?? todayIso());
  const [month, setMonth] = useState({ y: start.y, m: start.m });
  const thisYear = new Date().getFullYear();
  const first = new Date(month.y, month.m, 1).getDay();
  const days = new Date(month.y, month.m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const today = todayIso();
  const move = (k: number) => setMonth(({ y, m }) => ({ y: m + k < 0 ? y - 1 : m + k > 11 ? y + 1 : y, m: (m + k + 12) % 12 }));
  // 범위 밖 달로는 넘어가지 않게
  const firstOfMonth = isoOf(month.y, month.m, 1);
  const lastOfMonth = isoOf(month.y, month.m, days);
  const canPrev = !min || firstOfMonth > min;
  const canNext = !max || lastOfMonth < max;
  const navBtn =
    "flex h-11 w-11 items-center justify-center rounded-sm text-ink-soft transition-colors duration-150 hover:bg-surface-alt hover:text-ink disabled:opacity-30 disabled:hover:bg-transparent";

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => move(-1)} disabled={!canPrev} aria-label="이전 달" className={navBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <p className="m-0 text-[15px] font-semibold tabular-nums" aria-live="polite">
          {month.y !== thisYear ? `${month.y}년 ` : ""}
          {month.m + 1}월
        </p>
        <button type="button" onClick={() => move(1)} disabled={!canNext} aria-label="다음 달" className={navBtn}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <span key={w} className={`pb-1 text-xs ${i === 0 ? "text-warn" : "text-ink-soft"}`} aria-hidden="true">
            {w}
          </span>
        ))}
        {cells.map((d, i) => {
          if (d === null) return <span key={`b${i}`} aria-hidden="true" />;
          const v = isoOf(month.y, month.m, d);
          const picked = v === value;
          const isToday = v === today;
          const out = (min && v < min) || (max && v > max);
          return (
            <button
              key={v}
              type="button"
              onClick={() => onSelect(v)}
              disabled={Boolean(out)}
              aria-pressed={picked}
              aria-label={`${month.y}년 ${month.m + 1}월 ${d}일 ${WEEKDAYS[(first + d - 1) % 7]}요일${isToday ? ", 오늘" : ""}`}
              className={`flex h-9 items-center justify-center rounded-sm text-[13px] tabular-nums transition-colors duration-150 disabled:cursor-default disabled:text-ink-soft/40 disabled:hover:bg-transparent ${
                picked ? "bg-accent-strong font-semibold text-white" : `${isToday ? "border border-accent-strong text-accent-strong" : "text-ink"} hover:bg-surface-alt`
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
