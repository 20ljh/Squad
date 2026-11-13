"use client";

import { useEffect, useState } from "react";

// 초대 코드·링크 공유 (프로젝트를 만든 직후, 팀장이 코드를 다시 발급했을 때)
// 코드 원문은 DB에 없어서 이 화면에서만 볼 수 있음 → 복사 버튼을 크게

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">{label}</span>
      <div className="flex min-w-0 items-stretch gap-2">
        <code className="flex min-h-12 min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap rounded-sm border border-line bg-surface-alt px-3.5 font-display text-[15px] tabular-nums text-ink">
          {value}
        </code>
        <button
          type="button"
          onClick={copy}
          className="min-h-12 shrink-0 rounded-sm border border-line bg-white px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:border-accent hover:text-accent-strong"
        >
          {copied ? "복사했어요" : "복사"}
        </button>
      </div>
    </div>
  );
}

export function InviteShare({ code }: { code: string }) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/join/${code}`;
  return (
    <div className="flex flex-col gap-4">
      <CopyRow label="초대 링크" value={link} />
      <CopyRow label="초대 코드" value={code} />
      <p className="m-0 text-[13px] leading-[1.6] text-ink-soft" aria-live="polite">
        이 코드는 지금만 볼 수 있어요. 잃어버리면 팀 대시보드의 &lsquo;팀원 초대&rsquo;에서 새 코드를 만들 수 있어요(이전 코드는 더 쓸 수 없게 돼요).
        링크를 받은 사람은 확인 메시지를 보내고, 내가 수락해야 들어올 수 있어요.
      </p>
    </div>
  );
}
