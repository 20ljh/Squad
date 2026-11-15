"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Meeting, Member } from "@/lib/types";

// "녹음·원문" 탭: 녹음을 다시 듣고, 받아쓴 원문을 시간에 맞춰 따라감
// - 재생 중인 줄을 강조하고, 원문 칸(따로 스크롤)이 그 줄을 따라 내려감
// - 사용자가 원문을 직접 스크롤하면 몇 초 동안은 따라가지 않음 (읽는 걸 방해하지 않게)
// - 줄을 누르면 녹음이 그 시간으로 이동해 재생

type Record = NonNullable<Meeting["record"]>;

const PAUSE_FOLLOW_MS = 4000;

function clock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function TranscriptPlayer({ meetingId, record, members }: { meetingId: string; record: Record; members: Member[] }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const userScrollUntil = useRef(0);
  const programmatic = useRef(false);
  const [current, setCurrent] = useState(-1);
  const [audioError, setAudioError] = useState(false);
  const byId = useMemo(() => Object.fromEntries(members.map((m) => [m.id, m])), [members]);

  // 재생 시각 → 지금 말하는 줄 (시작 시각이 지난 마지막 줄)
  function lineAt(t: number): number {
    let lo = 0;
    let hi = record.lines.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (record.lines[mid].start <= t + 0.05) {
        ans = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return ans;
  }

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setCurrent(lineAt(a.currentTime));
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("seeked", onTime);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("seeked", onTime);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [record.lines]);

  // 지금 줄이 바뀌면 원문 칸 안에서만 스크롤 (페이지 전체는 움직이지 않음)
  useEffect(() => {
    const list = listRef.current;
    const item = itemRefs.current[current];
    if (!list || !item || Date.now() < userScrollUntil.current) return;
    const top = item.offsetTop - list.offsetTop - list.clientHeight / 3;
    programmatic.current = true;
    list.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    window.setTimeout(() => (programmatic.current = false), 600);
  }, [current]);

  function seek(i: number) {
    const a = audioRef.current;
    if (!a) return;
    userScrollUntil.current = 0; // 줄을 눌렀으면 바로 다시 따라감
    a.currentTime = record.lines[i].start;
    setCurrent(i);
    void a.play().catch(() => undefined);
  }

  if (record.lines.length === 0 && !record.hasAudio) {
    return (
      <p className="m-0 rounded-lg border border-line bg-white px-5 py-6 text-center text-[15px] text-ink-soft">
        이 회의에는 녹음과 원문이 없어요. 녹음을 올려 정리한 회의에서 다시 듣고 원문을 볼 수 있어요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {record.hasAudio ? (
        <div className="sticky top-[60px] z-10 flex flex-col gap-2 rounded-lg border border-line bg-white p-4 shadow-soft md:p-5">
          <audio
            ref={audioRef}
            controls
            preload="metadata"
            src={`/api/meetings/${encodeURIComponent(meetingId)}/audio/file`}
            onError={() => setAudioError(true)}
            className="w-full"
            aria-label="회의 녹음"
          >
            이 브라우저에서는 녹음을 재생할 수 없어요.
          </audio>
          <p aria-live="polite" className="m-0 text-[13px] text-ink-soft">
            {audioError
              ? "녹음을 불러오지 못했어요. 보관 기간이 지나 지워졌거나 파일을 찾을 수 없어요."
              : "원문 줄을 누르면 그 부분부터 들을 수 있어요."}
          </p>
        </div>
      ) : (
        <p className="m-0 rounded-sm bg-surface-alt px-4 py-3 text-[13px] text-ink-soft">녹음 파일이 없어서 원문만 보여 드려요.</p>
      )}

      <ol
        ref={listRef}
        aria-label={`회의 원문 ${record.lines.length}줄`}
        onScroll={() => {
          if (!programmatic.current) userScrollUntil.current = Date.now() + PAUSE_FOLLOW_MS;
        }}
        className="m-0 flex max-h-[60vh] list-none flex-col gap-1 overflow-y-auto rounded-lg border border-line bg-white p-2 md:p-3"
      >
        {record.lines.map((l, i) => {
          const m = byId[l.memberId];
          const on = i === current;
          return (
            <li
              key={i}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
            >
              <button
                type="button"
                onClick={() => seek(i)}
                disabled={!record.hasAudio}
                aria-current={on ? "true" : undefined}
                className={`flex w-full gap-3 rounded-sm px-3 py-2.5 text-left transition-colors duration-150 disabled:cursor-default ${
                  on ? "bg-accent-soft" : "hover:bg-surface-alt disabled:hover:bg-transparent"
                }`}
              >
                <span className={`w-12 shrink-0 pt-0.5 font-display text-[13px] tabular-nums ${on ? "font-semibold text-accent-strong" : "text-accent-strong"}`}>
                  {clock(l.start)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:gap-3">
                  <span className="flex h-6 w-20 shrink-0 items-center gap-1.5 self-start text-[14px] font-semibold">
                    <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: m?.color ?? "var(--ink-soft)" }} aria-hidden="true" />
                    {m?.name ?? "알 수 없음"}
                  </span>
                  <span className="min-w-0 text-[15px] leading-[1.6] text-ink">{l.text}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
