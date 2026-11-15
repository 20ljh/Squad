"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// 초대 코드는 영문·숫자·하이픈만 (예: SQD-7K4P-2MXQ). 실제 존재 여부는 참여 요청 화면(/join/[code])에서 확인
const CODE_PATTERN = /^[A-Z0-9-]{4,20}$/;

export function InviteCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) {
      setError("초대 코드를 입력해 주세요.");
      return;
    }
    if (!CODE_PATTERN.test(normalized)) {
      setError("코드에는 영문, 숫자, 하이픈(-)만 들어가요. 팀장에게 받은 코드를 다시 확인해 주세요.");
      return;
    }
    setError(null);
    router.push(`/join/${encodeURIComponent(normalized)}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          id="invite-code"
          name="code"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="예: SQD-7K4P-2MXQ"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          aria-describedby="invite-code-error"
          aria-invalid={error ? true : undefined}
          className="h-12 min-w-0 flex-1 rounded-sm border border-ink-soft/50 bg-white px-3.5 text-base text-ink transition-colors duration-150 placeholder:text-ink-soft hover:border-ink-soft sm:h-[52px] sm:px-4"
        />
        <button
          type="submit"
          className="h-12 shrink-0 rounded-sm bg-accent-soft px-[18px] text-[15px] font-semibold text-accent-deep transition-colors duration-150 hover:bg-line sm:h-[52px] sm:px-[22px]"
        >
          참여
        </button>
      </div>
      <p id="invite-code-error" aria-live="polite" className="m-0 text-[13px] font-medium text-warn empty:hidden">
        {error}
      </p>
    </form>
  );
}
