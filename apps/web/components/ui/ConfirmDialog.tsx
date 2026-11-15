"use client";

import { useEffect, useRef } from "react";

// 지우기 전 확인 팝업: 가운데 제목·설명, 아래 회색 "취소" / 빨간 확인 버튼 (회의 삭제와 같은 모양)
// open이 true면 뜨고, 뒤는 흐려짐. 다른 팝업(<dialog>) 위에도 겹쳐 뜸

type Props = {
  open: boolean;
  title: string;
  /** 설명 (줄바꿈은 \n) */
  body: string;
  confirmLabel: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, body, confirmLabel, busy, error, onConfirm, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[calc(100%-32px)] max-w-[360px] rounded-lg border border-ink-soft/30 bg-white p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      <div className="flex flex-col gap-5 p-6 text-center">
        <div className="flex flex-col gap-2">
          <h2 className="m-0 font-display text-xl font-semibold">{title}</h2>
          <p className="m-0 whitespace-pre-line text-[15px] leading-[1.6] text-ink-soft">{body}</p>
        </div>
        <p aria-live="polite" className="m-0 text-[13px] font-medium text-warn empty:hidden">
          {error}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-12 rounded-sm bg-surface-alt text-[15px] font-semibold text-ink transition-colors duration-150 hover:bg-line disabled:opacity-60"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="min-h-12 rounded-sm bg-warn text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-warn/90 disabled:opacity-60"
          >
            {busy ? "삭제하는 중…" : confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
