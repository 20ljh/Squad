"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Member, MeetingRound } from "@/lib/types";
import { Avatar } from "@/components/ui/Avatar";
import { SectionHeading } from "@/components/ui/SectionHeading";

// 대시보드 "회의 기록과 참석 현황"
// - 회의마다 제목(결과 페이지 링크)·날짜·참석 인원, 오른쪽에 참석한 팀원
// - 팀장은 오른쪽 위 "회의 기록 관리" → 줄마다 왼쪽에 빨간 삭제 버튼(제목은 오른쪽으로 밀림) → 확인 팝업 → DELETE /api/meetings/:id

type Props = {
  rounds: MeetingRound[];
  members: Member[];
  /** 회의 id → 결과 페이지 주소. 결과가 없는 회의는 빠져 있고 링크 없이 표시 */
  hrefs?: Record<string, string>;
  /** 팀장이면 회의 기록을 지울 수 있음 (예시 프로젝트는 false) */
  canManage?: boolean;
};

export function MeetingHistory({ rounds, members, hrefs = {}, canManage = false }: Props) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [managing, setManaging] = useState(false);
  const [target, setTarget] = useState<MeetingRound | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (target && !d.open) d.showModal();
    if (!target && d.open) d.close();
  }, [target]);

  async function remove() {
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/meetings/${encodeURIComponent(target.id)}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      }
      setTarget(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제하지 못했어요.");
    }
    setBusy(false);
  }

  const heading = (
    <div className="flex items-center justify-between gap-3">
      <SectionHeading id="history-title" title="회의 기록과 참석 현황" />
      {canManage && rounds.length > 0 ? (
        <button
          type="button"
          onClick={() => setManaging((m) => !m)}
          aria-pressed={managing}
          // "팀원 초대" 버튼과 같은 모양(흰 바탕·테두리·굵은 글씨), 크기는 제목 줄에 맞춰 작게. 관리 중엔 파란 테두리·글자
          className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm border bg-white px-4 text-sm font-semibold transition-colors duration-150 ${
            managing ? "border-accent-strong text-accent-strong" : "border-ink-soft/50 text-ink hover:border-accent hover:text-accent-strong"
          }`}
        >
          {managing ? null : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4" />
            </svg>
          )}
          {managing ? "완료" : "회의 기록 관리"}
        </button>
      ) : null}
    </div>
  );

  if (rounds.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        {heading}
        <p className="m-0 rounded-lg border border-line bg-white px-5 py-6 text-center text-[15px] text-ink-soft md:px-6">
          아직 회의가 없어요. 회의를 추가하면 회의마다 누가 참석했는지 여기에서 볼 수 있어요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {heading}
      <div className="rounded-lg border border-line bg-white px-5 md:px-6">
        <ul className="m-0 list-none divide-y divide-line p-0">
          {rounds.map((r) => {
            const date = (
              <span className="text-[13px] font-normal tabular-nums text-ink-soft">
                {r.dateLabel} | 참석 {r.attendDone}/{r.attendTotal}
              </span>
            );
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                <div className="flex min-w-0 items-center">
                  {/* 관리 중일 때만 왼쪽에 빨간 삭제 버튼이 나오고, 제목·날짜는 오른쪽으로 밀림 */}
                  <div
                    className={`overflow-hidden transition-[width,opacity] duration-150 ${managing ? "w-14 opacity-100" : "w-0 opacity-0"}`}
                    aria-hidden={!managing}
                  >
                    <button
                      type="button"
                      tabIndex={managing ? 0 : -1}
                      onClick={() => setTarget(r)}
                      aria-label={`${r.title} 삭제`}
                      className="flex h-11 w-11 items-center justify-center rounded-full"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warn text-white transition-colors duration-150 hover:bg-warn/85">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
                          <path d="M5 12h14" />
                        </svg>
                      </span>
                    </button>
                  </div>
                  {/* 제목과 날짜를 한 덩어리로. 링크는 두 줄 전체를 감싸서 누르는 영역 44px 이상 */}
                  {hrefs[r.id] && !managing ? (
                    <Link href={hrefs[r.id]} className="group flex min-h-11 min-w-[150px] flex-col justify-center gap-0.5 no-underline">
                      <span className="inline-flex items-center gap-1 text-[17px] font-semibold leading-snug text-accent-strong transition-colors duration-150 group-hover:text-accent-deep">
                        {r.title}
                        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      {date}
                    </Link>
                  ) : (
                    <div className="flex min-h-11 min-w-[150px] flex-col justify-center gap-0.5">
                      <span className={`text-[17px] font-semibold leading-snug ${hrefs[r.id] ? "text-accent-strong" : ""}`}>{r.title}</span>
                      {date}
                    </div>
                  )}
                </div>
                <div className="ml-auto flex gap-2">
                  {/* 참석한 팀원만 보여 줌 (열람 기록은 아직 모으지 않음) */}
                  {members
                    .filter((m) => !r.absent.includes(m.id))
                    .map((m) => (
                      <span key={m.id} aria-label={`${m.name}, 참석`}>
                        <Avatar member={m} size={28} title={`${m.name}, 참석`} />
                      </span>
                    ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* 삭제 확인 팝업: 가운데 정렬 제목·설명, 아래 회색 취소 / 빨간 삭제 */}
      <dialog
        ref={dialog}
        aria-labelledby="delete-meeting-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!busy) setTarget(null);
        }}
        className="m-auto w-[calc(100%-32px)] max-w-[360px] rounded-lg border border-ink-soft/30 bg-white p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        <div className="flex flex-col gap-5 p-6 text-center">
          <div className="flex flex-col gap-2">
            <h2 id="delete-meeting-title" className="m-0 font-display text-xl font-semibold">
              정말 삭제할까요?
            </h2>
            <p className="m-0 text-[15px] leading-[1.6] text-ink-soft">
              {target ? <span className="block font-semibold text-ink">{target.title}</span> : null}이 회의 기록을 삭제하면
              <br />
              포함된 요약도 함께 삭제돼요.
            </p>
          </div>
          <p aria-live="polite" className="m-0 text-[13px] font-medium text-warn empty:hidden">
            {error}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTarget(null)}
              disabled={busy}
              className="min-h-12 rounded-sm bg-surface-alt text-[15px] font-semibold text-ink transition-colors duration-150 hover:bg-line disabled:opacity-60"
            >
              취소
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="min-h-12 rounded-sm bg-warn text-[15px] font-semibold text-white transition-colors duration-150 hover:bg-warn/90 disabled:opacity-60"
            >
              {busy ? "삭제하는 중…" : "회의 삭제"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
