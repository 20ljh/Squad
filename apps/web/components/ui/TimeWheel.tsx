"use client";

import { useEffect, useRef } from "react";

// 시각 휠 피커: 시(0~23)·분(5분 단위) 두 줄. 가운데 줄이 고른 값, 위아래로 갈수록 흐려짐
// 굴리거나(스크롤이 칸에 딱 맞춰 멈춤) 항목을 누르거나 위·아래 화살표로 고름. 값은 "HH:MM"

const ROW = 36; // 한 줄 높이
const VISIBLE = 5; // 보이는 줄 수 (가운데가 선택)

function Column({ label, items, index, onChange }: { label: string; items: string[]; index: number; onChange: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number>();
  const settling = useRef(false);

  // 바깥에서 값이 바뀌면 그 줄을 가운데로
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const top = index * ROW;
    if (Math.abs(el.scrollTop - top) > 1) {
      settling.current = true;
      el.scrollTo({ top, behavior: "auto" });
      window.setTimeout(() => (settling.current = false), 50);
    }
  }, [index]);

  function onScroll() {
    if (settling.current) return;
    window.clearTimeout(timer.current);
    // 굴리기가 멈추면 가장 가까운 줄로
    timer.current = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ROW)));
      if (i !== index) onChange(i);
    }, 90);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowUp" && index > 0) onChange(index - 1);
    else if (e.key === "ArrowDown" && index < items.length - 1) onChange(index + 1);
    else return;
    e.preventDefault();
  }

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label={label}
      aria-activedescendant={`${label}-${index}`}
      tabIndex={0}
      onScroll={onScroll}
      onKeyDown={onKeyDown}
      className="relative z-10 min-w-0 flex-1 snap-y snap-mandatory overflow-y-scroll rounded-sm outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-accent-strong [&::-webkit-scrollbar]:hidden"
      // 위아래 두 줄씩은 빈 자리 → 첫·마지막 값도 가운데에 올 수 있음. 가장자리는 흐리게
      style={{
        height: ROW * VISIBLE,
        paddingBlock: ROW * Math.floor(VISIBLE / 2),
        maskImage: "linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 30%, #000 70%, transparent)",
      }}
    >
      {items.map((t, i) => (
        <div
          key={t}
          id={`${label}-${i}`}
          role="option"
          aria-selected={i === index}
          onClick={() => onChange(i)}
          className={`flex snap-center cursor-pointer items-center justify-center text-[15px] tabular-nums transition-colors duration-150 ${
            i === index ? "font-semibold text-ink" : "text-ink-soft"
          }`}
          style={{ height: ROW }}
        >
          {t}
        </div>
      ))}
    </div>
  );
}

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}시`);
const MINUTES = Array.from({ length: 12 }, (_, i) => `${String(i * 5).padStart(2, "0")}분`);

export function TimeWheel({ value, onChange }: { value: string; onChange: (hhmm: string) => void }) {
  const [h, m] = value.split(":").map(Number);
  const hi = Number.isFinite(h) ? h : 9;
  const mi = Number.isFinite(m) ? Math.round(m / 5) % 12 : 0;
  const set = (nh: number, nm: number) => onChange(`${String(nh).padStart(2, "0")}:${String(nm * 5).padStart(2, "0")}`);
  return (
    <div className="relative flex justify-center gap-2">
      {/* 가운데 선택 줄 표시 */}
      <div className="pointer-events-none absolute inset-x-0 rounded-sm bg-surface-alt" style={{ top: ROW * 2, height: ROW }} aria-hidden="true" />
      <Column label="시" items={HOURS} index={hi} onChange={(i) => set(i, mi)} />
      <Column label="분" items={MINUTES} index={mi} onChange={(i) => set(hi, i)} />
    </div>
  );
}
