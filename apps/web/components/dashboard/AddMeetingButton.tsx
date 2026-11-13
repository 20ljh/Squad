"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Member } from "@/lib/types";
import { meetingPath } from "@/lib/paths";

// 대시보드의 "회의 기록 추가" 버튼 + 팝업
// 팝업 칸은 회의 결과 페이지 맨 위 정보 줄과 같음: 회의 일자 · 시작 시각 · 방식 · 참여자
// 만들면 회의 페이지(녹음 올리기 단계)로 이동

// lib/meeting-create.ts 의 MODE_SUGGESTIONS 와 같은 목록 (서버 모듈을 브라우저로 가져오지 않으려고 따로 둠)
const MODE_SUGGESTIONS = ["대면", "Discord 음성채널", "Zoom", "Google Meet"];

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

const inputClass =
  "h-12 w-full min-w-0 rounded-sm border border-ink-soft/50 bg-white px-3.5 text-base text-ink transition-colors duration-150 placeholder:text-ink-soft hover:border-ink-soft";

export function AddMeetingButton({ projectId, members }: { projectId: string; members: Member[] }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [mode, setMode] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      // 열 때마다 기본값: 오늘, 팀원 전원 참석
      setDate(todayIso());
      setTime("");
      setMode("");
      setAttendees(members.map((m) => m.id));
      setError(null);
      setSaving(false);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open, members]);

  function toggle(id: string) {
    setAttendees((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return setError("회의 일자를 골라 주세요.");
    if (!time) return setError("회의 시작 시각을 골라 주세요.");
    if (!mode.trim()) return setError("회의 방식을 입력해 주세요. 예: 대면, Discord 음성채널");
    if (attendees.length === 0) return setError("참석한 팀원을 한 명 이상 골라 주세요.");
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/meetings`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date, time, mode, attendeeIds: attendees }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok || !data.id) {
        setError(data.error ?? "회의를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요.");
        setSaving(false);
        return;
      }
      router.push(meetingPath(projectId, data.id));
    } catch {
      setError("서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-12 items-center gap-2 rounded-sm bg-accent-strong px-6 text-base font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
      >
        <PlusIcon />
        회의 기록 추가
      </button>

      <dialog
        ref={ref}
        aria-labelledby="add-meeting-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!saving) setOpen(false);
        }}
        className="m-auto w-[calc(100%-32px)] max-w-[520px] rounded-lg border border-ink-soft/30 bg-white p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-5 p-6 md:p-7">
          <div className="flex flex-col gap-1">
            <h2 id="add-meeting-title" className="m-0 font-display text-xl font-bold">
              회의 기록 추가
            </h2>
            <p className="m-0 text-[14px] text-ink-soft">회의 정보를 넣으면 녹음을 올릴 수 있는 회의 페이지가 만들어져요.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label htmlFor="m-date" className="text-sm font-semibold">
                회의 일자
              </label>
              <input id="m-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="m-time" className="text-sm font-semibold">
                시작 시각
              </label>
              <input id="m-time" type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="m-mode" className="text-sm font-semibold">
              방식
            </label>
            <input
              id="m-mode"
              type="text"
              list="m-mode-list"
              maxLength={20}
              autoComplete="off"
              placeholder="예: 대면, Discord 음성채널"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className={inputClass}
            />
            <datalist id="m-mode-list">
              {MODE_SUGGESTIONS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="mb-2 p-0 text-sm font-semibold">
              참여자 <span className="font-normal text-ink-soft">({attendees.length}/{members.length})</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const on = attendees.includes(m.id);
                return (
                  <label
                    key={m.id}
                    className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border py-1 pl-1.5 pr-4 text-[15px] font-medium transition-colors duration-150 ${
                      on ? "border-accent-strong bg-accent-soft text-accent-deep" : "border-line bg-white text-ink-soft"
                    }`}
                  >
                    <input type="checkbox" checked={on} onChange={() => toggle(m.id)} className="sr-only" />
                    <span
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold text-white"
                      style={{ background: m.color, opacity: on ? 1 : 0.35 }}
                      aria-hidden="true"
                    >
                      {m.initial}
                    </span>
                    {m.name}
                  </label>
                );
              })}
            </div>
            <p className="m-0 text-[13px] text-ink-soft">녹음을 참여자 수({attendees.length}명)만큼의 목소리로 나눠 받아써요.</p>
          </fieldset>

          <p aria-live="polite" className="m-0 rounded-sm bg-warn-soft px-4 py-3 text-sm text-warn empty:hidden">
            {error}
          </p>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="h-12 rounded-sm border border-ink-soft/30 bg-white px-5 text-[15px] font-semibold text-ink transition-colors duration-150 hover:border-ink-soft"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-12 rounded-sm bg-accent-strong px-6 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-accent-deep disabled:opacity-60"
            >
              {saving ? "만드는 중…" : "회의 페이지 만들기"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
