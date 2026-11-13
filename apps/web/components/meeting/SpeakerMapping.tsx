"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Meeting } from "@/lib/types";

// 화자 확인: "화자1·화자2…"가 어떤 팀원인지 고르고 요약 시작
// 화자마다 대표 발화를 보여 주고, 참석한 팀원 중에서 고름 (모르면 "모르겠음" → 요약에 "화자1"로 남음)

type Mapping = NonNullable<Meeting["mapping"]>;

function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function duration(sec: number): string {
  return sec >= 60 ? `${Math.floor(sec / 60)}분 ${sec % 60}초` : `${sec}초`;
}

const UNKNOWN = "unknown";

export function SpeakerMapping({ meetingId, data, failReason }: { meetingId: string; data: Mapping; failReason?: string | null }) {
  const router = useRouter();
  // 처음엔 아무도 고르지 않음 (이미 고른 적이 있으면 그 값)
  const [choice, setChoice] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.speakers.filter((s) => s.memberId).map((s) => [s.id, s.memberId as string])),
  );
  const [error, setError] = useState<string | null>(failReason ?? null);
  const [saving, setSaving] = useState(false);

  // 요약이 실패해 화자 확인으로 돌아오면 같은 화면이 다시 그려짐 → 버튼을 풀고 실패 이유를 보여 줌
  useEffect(() => {
    setSaving(false);
    if (failReason) setError(failReason);
  }, [failReason]);

  const missing = data.speakers.filter((s) => !choice[s.id]);
  const used = Object.values(choice).filter((v) => v !== UNKNOWN);
  const dup = used.filter((v, i) => used.indexOf(v) !== i);

  async function submit() {
    if (missing.length) {
      setError(`${missing.map((s) => s.label).join(", ")}이(가) 누구인지 골라 주세요. 모르면 "모르겠음"을 고르면 돼요.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const mapping = Object.fromEntries(data.speakers.map((s) => [s.id, choice[s.id] === UNKNOWN ? null : choice[s.id]]));
      const res = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/speakers`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mapping }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
        setSaving(false);
        return;
      }
      router.refresh();
      // 정상이면 "요약 중" 화면으로 바뀌어 이 버튼은 사라짐. 그대로 남아 있으면 다시 누를 수 있게
      window.setTimeout(() => setSaving(false), 4000);
    } catch {
      setError("서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="m-0 text-[15px] leading-[1.6] text-ink-soft">
        받아쓰기가 끝났어요. 화자마다 대표 발화를 보고 누구인지 골라 주세요. 고른 이름으로 의견·담당자를 정리해요.
      </p>

      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {data.speakers.map((s) => (
          <li key={s.id} className="flex flex-col gap-4 rounded-lg border border-line bg-white p-5 md:p-6">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="m-0 font-display text-lg font-bold">{s.label}</h3>
              <p className="m-0 text-[13px] tabular-nums text-ink-soft">
                {s.count}번 말함 · 약 {duration(s.seconds)}
              </p>
            </div>
            <ul className="m-0 flex list-none flex-col gap-2 rounded-sm bg-surface-alt p-3 md:p-4">
              {s.samples.map((x, i) => (
                <li key={i} className="flex gap-3 text-[15px] leading-[1.6]">
                  <span className="shrink-0 pt-px font-display text-[13px] tabular-nums text-accent-strong">{clock(x.start)}</span>
                  <span className="min-w-0">“{x.text}”</span>
                </li>
              ))}
            </ul>
            <fieldset className="m-0 border-0 p-0">
              <legend className="mb-2 p-0 text-sm font-semibold">{s.label}은(는) 누구인가요?</legend>
              <div className="flex flex-wrap gap-2">
                {[...data.candidates.map((c) => ({ id: c.id, name: c.name, initial: c.initial, color: c.color })), { id: UNKNOWN, name: "모르겠음", initial: "?", color: "" }].map((c) => {
                  const on = choice[s.id] === c.id;
                  return (
                    <label
                      key={c.id}
                      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border py-1 pl-1.5 pr-4 text-[15px] font-medium transition-colors duration-150 ${
                        on ? "border-accent-strong bg-accent-soft text-accent-deep" : "border-line bg-white text-ink hover:border-ink-soft/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`speaker-${s.id}`}
                        value={c.id}
                        checked={on}
                        onChange={() => setChoice((x) => ({ ...x, [s.id]: c.id }))}
                        className="sr-only"
                      />
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold ${c.color ? "text-white" : "bg-surface-alt text-ink-soft"}`}
                        style={c.color ? { background: c.color } : undefined}
                        aria-hidden="true"
                      >
                        {c.initial}
                      </span>
                      {c.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          </li>
        ))}
      </ul>

      <details className="rounded-lg border border-line bg-white px-5 py-4 md:px-6">
        <summary className="min-h-11 cursor-pointer content-center text-[15px] font-semibold">전체 원문 보기 ({data.transcript.length}줄)</summary>
        <ol className="m-0 mt-3 flex max-h-[420px] list-none flex-col gap-2 overflow-y-auto p-0">
          {data.transcript.map((t, i) => (
            <li key={i} className="flex gap-3 text-[15px] leading-[1.6]">
              <span className="shrink-0 pt-px font-display text-[13px] tabular-nums text-accent-strong">{clock(t.start)}</span>
              <span className="shrink-0 font-semibold">{t.label}</span>
              <span className="min-w-0">{t.text}</span>
            </li>
          ))}
        </ol>
      </details>

      {dup.length ? (
        <p className="m-0 text-[13px] text-ink-soft">한 사람을 두 화자에 골랐어요. 한 사람의 목소리가 둘로 나뉘었다면 그대로 두어도 돼요.</p>
      ) : null}
      <p aria-live="polite" className="m-0 rounded-sm bg-warn-soft px-4 py-3 text-sm text-warn empty:hidden">
        {error}
      </p>
      <button
        type="button"
        onClick={submit}
        disabled={saving}
        className="h-12 self-end rounded-sm bg-accent-strong px-7 text-base font-bold text-white transition-colors duration-150 hover:bg-accent-deep disabled:opacity-60"
      >
        {saving ? "시작하는 중…" : "확인하고 요약 시작"}
      </button>
    </div>
  );
}
