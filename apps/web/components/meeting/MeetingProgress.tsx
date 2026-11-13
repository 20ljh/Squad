"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Meeting } from "@/lib/types";
import { SpeakerMapping } from "./SpeakerMapping";

// 회의 페이지의 처리 단계 (결과가 나오기 전)
// draft·failed → 녹음 올리기 / transcribing·mapping·summarizing → 진행 상황 (몇 초마다 새로 읽음)

type Status = "draft" | "transcribing" | "mapping" | "summarizing" | "failed";

const STEPS = [
  { key: "upload", label: "녹음 올리기" },
  { key: "transcribing", label: "받아쓰기·화자 나누기" },
  { key: "mapping", label: "화자 확인" },
  { key: "summarizing", label: "요약" },
] as const;

function stepIndex(status: Status): number {
  if (status === "transcribing") return 1;
  if (status === "mapping") return 2;
  if (status === "summarizing") return 3;
  return 0;
}

function Steps({ status }: { status: Status }) {
  const current = stepIndex(status);
  return (
    <ol className="m-0 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-4" aria-label="처리 단계">
      {STEPS.map((s, i) => {
        const state = i < current ? "done" : i === current ? "now" : "todo";
        return (
          <li
            key={s.key}
            aria-current={state === "now" ? "step" : undefined}
            className={`flex items-center gap-2 rounded-sm border px-3 py-2.5 text-[13px] font-semibold ${
              state === "now" ? "border-accent-strong bg-accent-soft text-accent-strong" : state === "done" ? "border-line bg-white text-ink" : "border-line bg-white text-ink-soft"
            }`}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                state === "now" ? "bg-accent-strong text-white" : state === "done" ? "bg-accent-soft text-accent-strong" : "bg-surface-alt text-ink-soft"
              }`}
              aria-hidden="true"
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}

const ACCEPT = ".m4a,.mp3,.wav,.webm,.ogg,.aac,.flac,.mp4,audio/*";

function UploadPanel({ meetingId, speakerCount, failed, failReason }: { meetingId: string; speakerCount?: number; failed: boolean; failReason?: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(failed ? (failReason ?? "녹음을 처리하지 못했어요. 파일을 확인하고 다시 올려 주세요.") : null);
  const [dragging, setDragging] = useState(false);

  function pick(f: File | undefined | null) {
    if (!f) return;
    setFile(f);
    setMessage(null);
  }

  function upload() {
    if (!file) {
      setMessage("올릴 녹음 파일을 골라 주세요.");
      return;
    }
    // 큰 파일이라 올라가는 정도를 보여 주려고 XMLHttpRequest 사용 (fetch는 업로드 진행률을 못 줌)
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append("audio", file);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        router.refresh();
        return;
      }
      let error = "녹음을 올리지 못했어요. 잠시 뒤 다시 시도해 주세요.";
      try {
        error = (JSON.parse(xhr.responseText) as { error?: string }).error ?? error;
      } catch {
        // 서버가 JSON이 아닌 응답을 준 경우 기본 문구
      }
      setMessage(error);
      setProgress(null);
    };
    xhr.onerror = () => {
      setMessage("서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");
      setProgress(null);
    };
    xhr.open("POST", `/api/meetings/${encodeURIComponent(meetingId)}/audio`);
    xhr.send(form);
    setProgress(0);
    setMessage(null);
  }

  const uploading = progress !== null;
  const sizeMb = file ? (file.size / 1024 / 1024).toFixed(1) : null;

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-line bg-white p-5 md:p-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pick(e.dataTransfer.files[0]);
        }}
        className={`flex flex-col items-center gap-3 rounded-sm border-2 border-dashed px-5 py-8 text-center transition-colors duration-150 ${
          dragging ? "border-accent-strong bg-accent-soft" : "border-ink-soft/40 bg-surface-alt"
        }`}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-accent-strong" aria-hidden="true">
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v4M8 22h8" />
        </svg>
        <p className="m-0 text-[15px] font-semibold">
          {file ? `${file.name} (${sizeMb}MB)` : "회의 녹음 파일을 여기에 끌어다 놓거나 골라 주세요"}
        </p>
        <p className="m-0 text-[13px] text-ink-soft">m4a, mp3, wav 등 · 300MB까지</p>
        <label className="inline-flex min-h-11 cursor-pointer items-center rounded-sm border border-ink-soft/30 bg-white px-5 text-[15px] font-semibold text-ink transition-colors duration-150 hover:border-ink-soft">
          {file ? "다른 파일 고르기" : "파일 고르기"}
          <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pick(e.target.files?.[0])} disabled={uploading} />
        </label>
      </div>

      <ul className="m-0 flex list-disc flex-col gap-1 pl-5 text-[13px] leading-[1.6] text-ink-soft marker:text-ink-soft">
        <li>참석한 {speakerCount ?? "팀원"}명의 목소리로 나눠서 받아써요. 녹음에 다른 사람 목소리가 섞이면 정확도가 떨어져요.</li>
        <li>휴대폰을 테이블 가운데에 두고 녹음하면 가장 잘 받아써요. 시끄러운 곳에서는 정확도가 크게 떨어져요.</li>
        <li>녹음은 요약을 만드는 데만 쓰고, 팀원만 볼 수 있어요.</li>
      </ul>

      {uploading ? (
        <div className="flex flex-col gap-2" aria-live="polite">
          <div className="h-2 overflow-hidden rounded-full bg-surface-alt" role="progressbar" aria-valuenow={progress ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label="올리는 중">
            <div className="h-full bg-accent-strong transition-[width] duration-150" style={{ width: `${progress}%` }} />
          </div>
          <p className="m-0 text-[13px] tabular-nums text-ink-soft">{progress === 100 ? "저장하는 중…" : `올리는 중… ${progress}%`}</p>
        </div>
      ) : null}

      <p aria-live="polite" className="m-0 rounded-sm bg-warn-soft px-4 py-3 text-sm text-warn empty:hidden">
        {message}
      </p>

      <button
        type="button"
        onClick={upload}
        disabled={uploading}
        className="h-12 self-end rounded-sm bg-accent-strong px-7 text-base font-bold text-white transition-colors duration-150 hover:bg-accent-deep disabled:opacity-60"
      >
        {uploading ? "올리는 중…" : "녹음 올리고 정리 시작"}
      </button>
    </div>
  );
}

type Processing = NonNullable<Meeting["processing"]>;

const WAITING: Record<"mapping" | "summarizing", { title: string; body: string }> = {
  mapping: {
    title: "누가 말했는지 확인해 주세요",
    body: "받아쓰기가 끝났어요. 화자1·화자2…가 어떤 팀원인지 고르면 요약을 시작해요.",
  },
  summarizing: {
    title: "회의 내용을 정리하고 있어요",
    body: "안건·의견·결정·일정을 뽑고 있어요. 보통 1분 안에 끝나요. 이 페이지는 끝나면 저절로 바뀌어요.",
  },
};

/** 초 → "03:25" (1시간 넘으면 "1:03:25") */
function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function sizeLabel(bytes: number | null): string {
  if (bytes == null) return "";
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.max(1, Math.round(bytes / 1024))}KB`;
}

/** 받아쓰는 중 취소: 뒤를 흐리게 하고 떠오르는 팝업으로 한 번 더 묻고, 확인하면 녹음을 지우고 "녹음 올리기"로 */
function CancelTranscribing({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    setBusy(false);
    ref.current?.showModal();
  }

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${encodeURIComponent(meetingId)}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "멈추지 못했어요. 잠시 뒤 다시 시도해 주세요.");
        setBusy(false);
        return;
      }
      ref.current?.close();
      router.refresh();
    } catch {
      setError("서버에 연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.");
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="h-11 rounded-sm border border-ink-soft/30 bg-white px-5 text-[15px] font-semibold text-ink transition-colors duration-150 hover:border-ink-soft"
      >
        받아쓰기 취소
      </button>
      <dialog
        ref={ref}
        aria-labelledby="cancel-title"
        aria-describedby="cancel-desc"
        onCancel={(e) => {
          if (busy) e.preventDefault();
        }}
        className="m-auto w-[calc(100%-32px)] max-w-[360px] rounded-lg border border-line bg-white p-0 text-ink shadow-soft backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        <div className="flex flex-col gap-2 px-6 pb-5 pt-7 text-center">
          <h2 id="cancel-title" className="m-0 font-display text-lg font-bold">
            받아쓰기를 멈출까요?
          </h2>
          <p id="cancel-desc" className="m-0 text-[15px] leading-[1.6] text-ink-soft">
            올린 녹음과 지금까지 받아쓴 내용이 지워지고, 녹음을 처음부터 다시 올려야 해요.
          </p>
          <p aria-live="polite" className="m-0 text-sm text-warn empty:hidden">
            {error}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 px-4 pb-4">
          <button
            type="button"
            autoFocus
            onClick={() => ref.current?.close()}
            disabled={busy}
            className="h-12 rounded-sm bg-surface-alt text-[15px] font-semibold text-ink transition-colors duration-150 hover:bg-line"
          >
            계속 받아쓰기
          </button>
          <button
            type="button"
            onClick={cancel}
            disabled={busy}
            className="h-12 rounded-sm bg-warn text-[15px] font-bold text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "멈추는 중…" : "멈추고 녹음 지우기"}
          </button>
        </div>
      </dialog>
    </>
  );
}

/** 받아쓰는 중: 올린 파일 + 진행 막대 + 받아쓴 문장을 시간과 함께 한 줄씩 */
function TranscribingPanel({ meetingId, p }: { meetingId: string; p: Processing }) {
  const listRef = useRef<HTMLOListElement>(null);
  const last = p.lines[p.lines.length - 1];
  const done = last && p.durationSec ? Math.min(100, Math.round((last.start / p.durationSec) * 100)) : 0;

  // 새 줄이 생기면 목록 맨 아래로 (사용자가 위로 올려 읽는 중이면 그대로 둠)
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 120) el.scrollTop = el.scrollHeight;
  }, [p.lines.length]);

  return (
    <div className="flex flex-col gap-5 rounded-lg border border-line bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-3 rounded-sm bg-surface-alt px-4 py-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-accent-strong" aria-hidden="true">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
        {/* 좁은 화면에서는 파일 정보가 한 줄을 다 쓰고 취소 버튼은 아래 줄로 */}
        <div className="min-w-[200px] flex-1">
          <p className="m-0 truncate text-[15px] font-semibold" title={p.audioName ?? undefined}>
            {p.audioName ?? "올린 녹음"}
          </p>
          <p className="m-0 text-[13px] tabular-nums text-ink-soft">
            {[sizeLabel(p.audioSize), p.durationSec ? `길이 ${clock(p.durationSec)}` : null].filter(Boolean).join(" · ")}
          </p>
        </div>
        <CancelTranscribing meetingId={meetingId} />
      </div>

      <div className="flex flex-col gap-2" aria-live="polite">
        <div className="flex items-center gap-3">
          <span className="h-5 w-5 shrink-0 animate-spin rounded-full border-[3px] border-accent-soft border-t-accent-strong" aria-hidden="true" />
          <p className="m-0 font-display text-[17px] font-bold">
            {!p.started ? "받아쓰기를 기다리고 있어요" : last ? "녹음을 받아쓰고 있어요" : "녹음을 받아쓰기 시작했어요"}
          </p>
          {p.started && last && p.durationSec ? (
            <p className="m-0 ml-auto text-[13px] tabular-nums text-ink-soft">
              {clock(last.start)} / {clock(p.durationSec)}
            </p>
          ) : null}
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-alt" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={100} aria-label="받아쓴 정도">
          <div className="h-full bg-accent-strong transition-[width] duration-150" style={{ width: `${done}%` }} />
        </div>
        <p className="m-0 text-[13px] leading-[1.6] text-ink-soft">
          {!p.started
            ? "받아쓰기 컴퓨터가 녹음을 가져가면 바로 시작해요. 오래 걸리면 받아쓰기 컴퓨터(STT 워커)가 켜져 있는지 확인해 주세요."
            : "받아쓴 문장이 아래에 한 줄씩 나타나요. 누가 말했는지는 받아쓰기가 끝난 뒤 나눠요. 이 페이지는 끝나면 저절로 바뀌어요."}
        </p>
      </div>

      {p.lines.length > 0 ? (
        <ol
          ref={listRef}
          aria-label={`지금까지 받아쓴 문장 ${p.lines.length}줄`}
          className="m-0 flex max-h-[360px] list-none flex-col gap-2 overflow-y-auto rounded-sm border border-line p-3 md:p-4"
        >
          {p.lines.map((l, i) => (
            <li key={`${l.start}-${i}`} className="flex gap-3 text-[15px] leading-[1.6]">
              <span className="shrink-0 pt-px font-display text-[13px] tabular-nums text-accent-strong">{clock(l.start)}</span>
              <span className="min-w-0">{l.text}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function WaitingPanel({ status }: { status: "mapping" | "summarizing" }) {
  const w = WAITING[status];
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-white px-6 py-10 text-center" aria-live="polite">
      {status !== "mapping" ? <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-accent-soft border-t-accent-strong" aria-hidden="true" /> : null}
      <p className="m-0 font-display text-lg font-bold">{w.title}</p>
      <p className="m-0 max-w-[520px] text-[15px] leading-[1.6] text-ink-soft">{w.body}</p>
    </div>
  );
}

/** 기다리는 단계에서는 몇 초마다 다시 읽어, 새로 받아쓴 줄이나 바뀐 상태를 화면에 반영 */
function AutoRefresh({ ms }: { ms: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), ms);
    return () => clearInterval(t);
  }, [ms, router]);
  return null;
}

export function MeetingProgress({
  meetingId,
  status,
  speakerCount,
  processing,
  failReason,
  mapping,
}: {
  meetingId: string;
  status: Status;
  speakerCount?: number;
  processing?: Processing;
  failReason?: string | null;
  mapping?: Meeting["mapping"];
}) {
  return (
    <section aria-labelledby="progress-title" className="flex flex-col gap-4">
      <h2 id="progress-title" className="m-0 font-display text-[22px] font-bold">
        {status === "draft" || status === "failed" ? "회의 녹음 올리기" : status === "mapping" ? "누가 말했는지 확인해 주세요" : "정리하는 중"}
      </h2>
      <Steps status={status} />
      {status === "draft" || status === "failed" ? (
        <UploadPanel meetingId={meetingId} speakerCount={speakerCount} failed={status === "failed"} failReason={failReason} />
      ) : status === "transcribing" ? (
        <>
          <AutoRefresh ms={3000} />
          <TranscribingPanel meetingId={meetingId} p={processing ?? { audioName: null, audioSize: null, durationSec: null, started: false, lines: [] }} />
        </>
      ) : status === "mapping" && mapping ? (
        <SpeakerMapping meetingId={meetingId} data={mapping} failReason={failReason} />
      ) : (
        <>
          {status === "summarizing" ? <AutoRefresh ms={3000} /> : null}
          <WaitingPanel status={status === "mapping" ? "mapping" : "summarizing"} />
        </>
      )}
    </section>
  );
}
