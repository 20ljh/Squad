"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, dateInfo } from "./Calendar";
import { TimeWheel } from "./TimeWheel";

// 입력 칸처럼 보이는 버튼 + 아래로 펼치는 고르기 판 (최종 마감일·회의 일자·시작 시각)
// 날짜는 달력에서 누르면 바로 정해지고, 시각은 휠로 고른 뒤 "확인". 바깥을 누르거나 Esc면 닫힘

const fieldClass =
  "flex h-12 w-full min-w-0 items-center justify-between gap-2 rounded-sm border border-ink-soft/50 bg-white px-3.5 text-left text-base transition-colors duration-150 hover:border-ink-soft data-[invalid=true]:border-warn sm:px-4";

function usePopover() {
  const wrap = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // 고르기 판만 닫고, 바깥 팝업(<dialog>)은 그대로 (기본 동작인 dialog 닫기까지 막음)
        e.preventDefault();
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);
  return { wrap, open, setOpen };
}

function Icon({ kind }: { kind: "date" | "time" }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-ink-soft">
      {kind === "date" ? (
        <>
          <rect x="3.5" y="5" width="17" height="15" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </>
      ) : (
        <>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </>
      )}
    </svg>
  );
}

// 판은 위 입력 칸과 같은 너비
const panel = "absolute inset-x-0 top-full z-30 mt-2 rounded-lg border border-line bg-white p-3 shadow-soft";

type DateProps = {
  id: string;
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  /** 비울 수 있는 칸(선택)이면 "지우기" */
  clearable?: boolean;
  invalid?: boolean;
  describedBy?: string;
};

export function DateField({ id, value, onChange, placeholder = "날짜 고르기", min, max, clearable, invalid, describedBy }: DateProps) {
  const { wrap, open, setOpen } = usePopover();
  return (
    <div ref={wrap} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-invalid={invalid ? "true" : undefined}
        aria-describedby={describedBy}
        className={fieldClass}
      >
        <span className={`tabular-nums ${value ? "text-ink" : "text-ink-soft"}`}>{value ? dateInfo(value).label : placeholder}</span>
        <Icon kind="date" />
      </button>
      {open ? (
        <div role="dialog" aria-label="날짜 고르기" className={panel}>
          <Calendar
            value={value || null}
            min={min}
            max={max}
            initialMonth={min && !value ? min : undefined}
            onSelect={(v) => {
              onChange(v);
              setOpen(false);
            }}
          />
          {clearable && value ? (
            <div className="mt-2 flex justify-end border-t border-line pt-2">
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="min-h-11 rounded-sm px-3 text-sm font-semibold text-ink-soft transition-colors duration-150 hover:text-ink"
              >
                지우기
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TimeField({ id, value, onChange, placeholder = "시각 고르기", invalid }: { id: string; value: string; onChange: (hhmm: string) => void; placeholder?: string; invalid?: boolean }) {
  const { wrap, open, setOpen } = usePopover();
  const [draft, setDraft] = useState(value || "09:00");
  return (
    <div ref={wrap} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => {
          if (!open) setDraft(value || "09:00");
          setOpen((o) => !o);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        data-invalid={invalid ? "true" : undefined}
        className={fieldClass}
      >
        <span className={`tabular-nums ${value ? "text-ink" : "text-ink-soft"}`}>{value || placeholder}</span>
        <Icon kind="time" />
      </button>
      {open ? (
        <div role="dialog" aria-label="시각 고르기" className={panel}>
          <TimeWheel value={draft} onChange={setDraft} />
          <div className="mt-2 flex justify-end gap-1 border-t border-line pt-2">
            <button type="button" onClick={() => setOpen(false)} className="min-h-11 rounded-sm px-3 text-sm font-semibold text-ink-soft transition-colors duration-150 hover:text-ink">
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                onChange(draft);
                setOpen(false);
              }}
              className="min-h-11 rounded-sm bg-accent-strong px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-accent-deep"
            >
              확인
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
