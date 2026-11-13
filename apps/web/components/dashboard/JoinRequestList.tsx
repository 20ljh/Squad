"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// 팀장에게만 보이는 "참여 요청" — 확인 메시지와 구글 계정을 보고 수락·거절
// 수락하면 요청자 화면이 이름·역할 고르기로 넘어감

export type JoinRequestItem = { id: string; message: string; createdAt: string; userName: string; userEmail: string };

function timeAgo(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.round(h / 24)}일 전`;
}

export function JoinRequestList({ items }: { items: JoinRequestItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(id: string, action: "approve" | "reject") {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/join-requests/${encodeURIComponent(id)}/${action}`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      }
    } catch {
      setError("서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.");
    }
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {items.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 rounded-lg border border-line bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 flex-col gap-1">
              <p className="m-0 text-base font-semibold">&ldquo;{r.message}&rdquo;</p>
              <p className="m-0 truncate text-[13px] text-ink-soft">
                {r.userName} · {r.userEmail} · {timeAgo(r.createdAt)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => decide(r.id, "reject")}
                className="min-h-11 rounded-sm border border-line bg-white px-4 text-[14px] font-semibold text-ink-soft transition-colors duration-150 hover:border-warn hover:text-warn disabled:opacity-60"
              >
                거절
              </button>
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => decide(r.id, "approve")}
                className="min-h-11 rounded-sm bg-accent-strong px-4 text-[14px] font-bold text-white transition-colors duration-150 hover:bg-accent-deep disabled:opacity-60"
              >
                {busy === r.id ? "처리 중…" : "수락"}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p aria-live="polite" className="m-0 text-[13px] font-medium text-warn empty:hidden">
        {error}
      </p>
    </div>
  );
}
