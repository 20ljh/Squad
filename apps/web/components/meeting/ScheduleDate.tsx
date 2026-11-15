"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Calendar, dateInfo } from "@/components/ui/Calendar";

// 일정의 날짜 칸: 크게 "11/19", 아래 작게 "목요일". 날짜 미정이면 "미정"만 가운데에
// 팀원이면 칸을 눌러 달력 팝업에서 날짜를 정하거나 바꿈 (PATCH /api/schedule-items/:id)
// 달력은 공통 부품(components/ui/Calendar.tsx)

type Props = {
  id: string;
  date: string | null;
  label: string;
  canEdit: boolean;
  /** 날짜 미정일 때 달력을 처음 열 달 (회의 날짜) */
  baseDate: string;
};

export function ScheduleDate({ id, date, label, canEdit, baseDate }: Props) {
  const router = useRouter();
  const wrap = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(date);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const p = value ? dateInfo(value) : null;

  // 바깥을 누르거나 Esc면 닫기
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle() {
    setOpen((o) => !o);
  }

  async function save(next: string) {
    setOpen(false);
    if (next === value) return;
    const prev = value;
    setValue(next); // 먼저 바꿔 보여 주고, 실패하면 되돌림
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/schedule-items/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh(); // D-day·정렬을 서버 값으로 다시
    } catch {
      setValue(prev);
      setError(true);
    }
    setBusy(false);
  }

  const face = (
    <>
      <span className={`block font-display font-semibold leading-none tabular-nums ${p ? "text-xl text-ink" : "text-base text-ink-soft"}`}>{p ? p.md : "미정"}</span>
      {p ? <span className="mt-1 block text-xs text-ink-soft">{p.weekday}</span> : null}
    </>
  );
  // 날짜가 있어도 없어도 칸 높이는 같게, 내용은 가운데
  const box = "flex min-h-12 w-16 shrink-0 flex-col items-center justify-center rounded-sm text-center";

  if (!canEdit) return <div className={box}>{face}</div>;

  return (
    <div ref={wrap} className="relative shrink-0">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label} 날짜 ${p ? `${p.md} ${p.weekday}, 바꾸기` : "정하기"}`}
        title={p ? "눌러서 날짜 바꾸기" : "눌러서 날짜 정하기"}
        className={`${box} border border-dashed transition-colors duration-150 hover:border-accent hover:bg-surface-alt disabled:opacity-60 ${
          open ? "border-accent bg-surface-alt" : p ? "border-transparent" : "border-line"
        }`}
      >
        {face}
      </button>

      {open ? (
        <div role="dialog" aria-label={`${label} 날짜 고르기`} className="absolute left-0 top-full z-30 mt-2 w-[272px] rounded-lg border border-line bg-white p-3 shadow-soft">
          <Calendar value={value} initialMonth={baseDate} onSelect={save} />
        </div>
      ) : null}

      {error ? (
        <span role="alert" className="absolute left-0 top-full mt-1 whitespace-nowrap text-xs text-warn">
          저장하지 못했어요
        </span>
      ) : null}
    </div>
  );
}
