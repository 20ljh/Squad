"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Meeting, Member } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";

// 회의 결과 "할 일" 칸: 요약에서 뽑은 할 일을 담당·마감과 함께 보여 주고, 팀원이 완료로 체크
// 체크하면 바로 저장(PATCH /api/action-items/:id)하고 대시보드 숫자도 바뀜. 예시 프로젝트는 보기만

type Action = NonNullable<Meeting["actions"]>[number];

function dueText(iso: string | null): string {
  if (!iso) return "마감 미정";
  const [y, m, d] = iso.split("-").map(Number);
  const wd = ["일", "월", "화", "수", "목", "금", "토"][new Date(y, m - 1, d).getDay()];
  return `${m}/${d}(${wd})까지`;
}

export function ActionList({ items, members, canEdit }: { items: Action[]; members: Record<string, Member>; canEdit: boolean }) {
  const router = useRouter();
  const [done, setDone] = useState<Record<string, boolean>>(() => Object.fromEntries(items.map((t) => [t.id, t.done])));
  const [error, setError] = useState<string | null>(null);

  async function toggle(id: string) {
    const next = !done[id];
    setDone((d) => ({ ...d, [id]: next })); // 먼저 화면을 바꾸고, 실패하면 되돌림
    setError(null);
    try {
      const res = await fetch(`/api/action-items/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ done: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setDone((d) => ({ ...d, [id]: !next }));
      setError("저장하지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.");
    }
  }

  const left = items.filter((t) => !done[t.id]).length;

  return (
    <div className="flex flex-col gap-2">
      <p className="m-0 text-[14px] tabular-nums text-ink-soft" aria-live="polite">
        {left ? `남은 할 일 ${left}건 · 완료 ${items.length - left}건` : "모두 끝냈어요"}
      </p>
      <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-lg border border-line bg-white p-0 px-4 md:px-5">
        {items.map((t) => {
          const m = t.memberId ? members[t.memberId] : undefined;
          const checked = done[t.id];
          return (
            <li key={t.id}>
              <label className={`flex min-h-14 items-center gap-3 py-2.5 ${canEdit ? "cursor-pointer" : "cursor-default"}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!canEdit}
                  onChange={() => toggle(t.id)}
                  className="h-5 w-5 shrink-0 accent-accent-strong disabled:cursor-default"
                />
                <span className={`min-w-0 flex-1 text-[15px] leading-snug ${checked ? "text-ink-soft line-through" : "text-ink"}`}>{t.title}</span>
                <span className="flex shrink-0 items-center gap-2 text-[13px] text-ink-soft">
                  {m ? <Avatar member={m} size={22} /> : null}
                  <span className="hidden sm:inline">{t.ownerName ?? "담당 미정"}</span>
                  <span className="tabular-nums">{dueText(t.due)}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p aria-live="polite" className="m-0 text-[13px] font-medium text-warn empty:hidden">
        {error}
      </p>
    </div>
  );
}
