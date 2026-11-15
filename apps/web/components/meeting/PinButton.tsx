"use client";

import { useState } from "react";

// 의견 카드의 ☆: 누르면 대시보드 "하이라이트 인용구"에 올라감 (팀원만, 예시 프로젝트는 표시만)

export function PinButton({ opinionId, pinned, canEdit }: { opinionId: string; pinned: boolean; canEdit: boolean }) {
  const [on, setOn] = useState(pinned);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !on;
    setOn(next);
    setBusy(true);
    try {
      const res = await fetch(`/api/opinions/${encodeURIComponent(opinionId)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pinned: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      setOn(!next); // 실패하면 되돌림
    }
    setBusy(false);
  }

  if (!canEdit && !on) return null;
  const label = on ? "주요 내용에서 내리기" : "대시보드 주요 내용에 올리기";
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={!canEdit || busy}
      aria-pressed={on}
      aria-label={canEdit ? label : "회의 주요 내용"}
      title={canEdit ? label : "회의 주요 내용"}
      className={`-m-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-150 disabled:cursor-default ${
        on ? "text-accent-strong" : "text-ink-soft/60 hover:text-accent-strong"
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
      </svg>
    </button>
  );
}
