"use client";

import { useEffect, useRef, useState } from "react";
import { InviteShare } from "@/components/invite/InviteShare";

// 팀장의 "팀원 초대" 버튼 + 팝업
// 초대 코드 원문은 DB에 없어서, 보여 주려면 새로 만들어야 함 (이전 코드는 바로 무효)

function PersonPlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21a7 7 0 0 1 14 0M19 8v6M16 11h6" />
    </svg>
  );
}

export function TeamInviteButton({ projectId }: { projectId: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setCode(null);
      setError(null);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  async function issue() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/invite-code`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { inviteCode?: string; error?: string };
      if (!res.ok || !data.inviteCode) setError(data.error ?? "초대 코드를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      else setCode(data.inviteCode);
    } catch {
      setError("서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.");
    }
    setBusy(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-12 items-center gap-2 rounded-sm border border-ink-soft/50 bg-white px-5 text-[15px] font-semibold text-ink transition-colors duration-150 hover:border-accent hover:text-accent-strong"
      >
        <PersonPlusIcon />
        팀원 초대
      </button>
      <dialog
        ref={ref}
        aria-labelledby="invite-title"
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        className="m-auto w-[calc(100%-32px)] max-w-[520px] rounded-lg border border-ink-soft/30 bg-white p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        <div className="flex flex-col gap-5 p-6 md:p-7">
          <div className="flex flex-col gap-1">
            <h2 id="invite-title" className="m-0 font-display text-xl font-bold">
              팀원 초대
            </h2>
            <p className="m-0 text-[14px] leading-[1.6] text-ink-soft">
              {code
                ? "새 초대 링크를 팀원에게 보내 주세요."
                : "보안을 위해 초대 코드는 저장하지 않아요. 새 코드를 만들면 이전 코드와 링크는 더 쓸 수 없어요."}
            </p>
          </div>
          {code ? <InviteShare code={code} /> : null}
          <p aria-live="polite" className="m-0 text-[13px] font-medium text-warn empty:hidden">
            {error}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="min-h-12 rounded-sm px-5 text-[15px] font-semibold text-ink-soft transition-colors duration-150 hover:text-ink"
            >
              닫기
            </button>
            {code ? null : (
              <button
                type="button"
                onClick={issue}
                disabled={busy}
                className="min-h-12 rounded-sm bg-accent-strong px-5 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-accent-deep disabled:opacity-60"
              >
                {busy ? "만드는 중…" : "새 초대 코드 만들기"}
              </button>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
