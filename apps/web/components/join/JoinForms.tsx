"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { projectPath } from "@/lib/paths";

// 참여 화면(/join/[code])의 입력 두 가지
// 1) 확인 메시지 보내기 → 팀장이 보고 수락
// 2) 수락된 뒤 내 이름(미리 넣은 이름 중 고르기 또는 새로 쓰기)·맡은 일 고르기

const inputClass =
  "h-12 w-full min-w-0 rounded-sm border border-ink-soft/50 bg-white px-3.5 text-base text-ink transition-colors duration-150 placeholder:text-ink-soft hover:border-ink-soft";
const primary =
  "min-h-12 rounded-sm bg-accent-strong px-6 text-base font-bold text-white transition-colors duration-150 hover:bg-accent-deep disabled:opacity-60";

async function post(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch {
    return { ok: false, data: { error: "서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요." } };
  }
}

export function JoinRequestForm({ code, defaultName }: { code: string; defaultName: string }) {
  const router = useRouter();
  const [message, setMessage] = useState(defaultName ? `${defaultName}입니다.` : "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("팀장이 알아볼 수 있게 확인 메시지를 써 주세요.");
      return;
    }
    setBusy(true);
    const { ok, data } = await post(`/api/join/${encodeURIComponent(code)}`, { message });
    if (!ok) {
      if (typeof data.projectId === "string") {
        router.push(projectPath(data.projectId));
        return;
      }
      setError(typeof data.error === "string" ? data.error : "요청을 보내지 못했어요.");
      setBusy(false);
      return;
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="j-message" className="text-sm font-semibold">
          팀장에게 보낼 확인 메시지
        </label>
        <input
          id="j-message"
          value={message}
          maxLength={100}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="예: 3조 김현지입니다"
          aria-describedby="j-message-help j-error"
          className={inputClass}
        />
        <p id="j-message-help" className="m-0 text-[13px] text-ink-soft">
          팀장이 이 메시지와 내 구글 계정을 보고 수락해요.
        </p>
      </div>
      <p id="j-error" aria-live="polite" className="m-0 text-[13px] font-medium text-warn empty:hidden">
        {error}
      </p>
      <button type="submit" disabled={busy} className={`${primary} self-start`}>
        {busy ? "보내는 중…" : "참여 요청 보내기"}
      </button>
    </form>
  );
}

export function ProfileForm({ requestId, names, defaultName }: { requestId: string; names: { id: string; name: string }[]; defaultName: string }) {
  const router = useRouter();
  // 기본값: 구글 이름과 같은 미리 넣은 이름이 있으면 그것, 없으면 새 이름
  const match = names.find((n) => n.name === defaultName);
  const [choice, setChoice] = useState<string>(match ? match.id : names.length ? names[0].id : "new");
  const [newName, setNewName] = useState(match ? "" : defaultName);
  const [position, setPosition] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = choice === "new" ? { name: newName, position } : { memberId: choice, position };
    const { ok, data } = await post(`/api/join-requests/${encodeURIComponent(requestId)}/profile`, body);
    if (!ok || typeof data.projectId !== "string") {
      setError(typeof data.error === "string" ? data.error : "저장하지 못했어요.");
      setBusy(false);
      router.refresh();
      return;
    }
    router.push(projectPath(data.projectId));
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="mb-2 text-sm font-semibold">팀에서 쓸 내 이름</legend>
        {names.map((n) => (
          <label key={n.id} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-sm border border-line bg-white px-4 has-[:checked]:border-accent-strong has-[:checked]:bg-accent-soft">
            <input type="radio" name="who" value={n.id} checked={choice === n.id} onChange={() => setChoice(n.id)} className="h-4 w-4 accent-accent-strong" />
            <span className="text-base">{n.name}</span>
          </label>
        ))}
        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-sm border border-line bg-white px-4 has-[:checked]:border-accent-strong has-[:checked]:bg-accent-soft">
          <input type="radio" name="who" value="new" checked={choice === "new"} onChange={() => setChoice("new")} className="h-4 w-4 accent-accent-strong" />
          <span className="text-base">{names.length ? "목록에 내 이름이 없어요 (새로 쓰기)" : "이름 쓰기"}</span>
        </label>
        {choice === "new" ? (
          <input
            aria-label="새 이름"
            value={newName}
            maxLength={20}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="이름"
            className={inputClass}
          />
        ) : null}
      </fieldset>
      <div className="flex flex-col gap-2">
        <label htmlFor="j-position" className="text-sm font-semibold">
          맡은 일 <span className="font-normal text-ink-soft">(선택, 나중에 바꿀 수 있어요)</span>
        </label>
        <input id="j-position" value={position} maxLength={20} onChange={(e) => setPosition(e.target.value)} placeholder="예: 백엔드, 발표" className={inputClass} />
      </div>
      <p aria-live="polite" className="m-0 text-[13px] font-medium text-warn empty:hidden">
        {error}
      </p>
      <button type="submit" disabled={busy} className={`${primary} self-start`}>
        {busy ? "저장하는 중…" : "팀에 들어가기"}
      </button>
    </form>
  );
}
