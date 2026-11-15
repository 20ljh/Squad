"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Avatar } from "@/components/ui/Avatar";

// 팀장의 "팀 대시보드 관리" 버튼 + 팝업
// - 팀원: 맡은 일 고치기(PATCH /api/members/:id), 팀원 삭제(DELETE, 팀장 자신은 불가)
// - 프로젝트 전체 삭제(DELETE /api/projects/:id) → 메인으로

export type ManageMember = {
  id: string;
  name: string;
  position: string;
  initial: string;
  color: string;
  leader: boolean;
  linked: boolean;
};

type Confirm = { kind: "member"; member: ManageMember } | { kind: "project" };

function GearIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

function PositionInput({ member }: { member: ManageMember }) {
  const router = useRouter();
  const [value, setValue] = useState(member.position);
  const [saved, setSaved] = useState(member.position);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const changed = value.trim() !== saved;

  async function save() {
    if (!changed) return;
    setState("saving");
    const res = await fetch(`/api/members/${encodeURIComponent(member.id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ position: value }),
    }).catch(() => null);
    if (!res?.ok) {
      setState("error");
      return;
    }
    setSaved(value.trim());
    setState("saved");
    router.refresh();
  }

  return (
    // 모바일에서는 둘째 줄 전체 너비, 넓은 화면에서는 이름 옆
    <div className="order-last flex w-full items-center gap-2 sm:order-none sm:w-auto sm:min-w-0 sm:flex-1">
      <input
        aria-label={`${member.name} 맡은 일`}
        value={value}
        maxLength={20}
        placeholder="맡은 일 (예: 백엔드)"
        onChange={(e) => {
          setValue(e.target.value);
          setState("idle");
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void save();
          }
        }}
        className="h-11 min-w-0 flex-1 rounded-sm border border-ink-soft/50 bg-white px-3 text-[15px] transition-colors duration-150 placeholder:text-ink-soft hover:border-ink-soft"
      />
      <button
        type="button"
        onClick={save}
        disabled={!changed || state === "saving"}
        className="min-h-11 shrink-0 rounded-sm px-3 text-sm font-semibold text-accent-strong transition-colors duration-150 hover:bg-surface-alt disabled:text-ink-soft/50 disabled:hover:bg-transparent"
      >
        {state === "saving"
          ? "저장 중…"
          : state === "saved" && !changed
            ? "저장됨"
            : "저장"}
      </button>
      {state === "error" ? (
        <span role="alert" className="sr-only">
          저장하지 못했어요
        </span>
      ) : null}
    </div>
  );
}

export function TeamManageButton({
  projectId,
  projectName,
  members,
}: {
  projectId: string;
  projectName: string;
  members: ManageMember[];
}) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  async function doDelete() {
    if (!confirm) return;
    setBusy(true);
    setError(null);
    const url =
      confirm.kind === "member"
        ? `/api/members/${encodeURIComponent(confirm.member.id)}`
        : `/api/projects/${encodeURIComponent(projectId)}`;
    const res = await fetch(url, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => ({}))) as
        { error?: string } | undefined;
      setError(data?.error ?? "삭제하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
      return;
    }
    if (confirm.kind === "project") {
      router.push("/");
      router.refresh();
      return;
    }
    setConfirm(null);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-12 items-center gap-2 rounded-sm border border-ink-soft/50 bg-white px-5 text-[15px] font-semibold text-ink transition-colors duration-150 hover:border-accent hover:text-accent-strong"
      >
        <GearIcon />팀 대시보드 관리
      </button>

      <dialog
        ref={ref}
        aria-labelledby="manage-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!confirm) setOpen(false);
        }}
        className="m-auto w-[calc(100%-32px)] max-w-[560px] rounded-lg border border-ink-soft/30 bg-white p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        {/* 열렸을 때만 내용을 그림 (닫혀 있을 때 팀원 이름 등이 페이지에 남지 않게) */}
        {open ? (
          <div className="flex flex-col gap-6 p-6 md:p-7">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h2
                  id="manage-title"
                  className="m-0 font-display text-xl font-semibold"
                >
                  팀 대시보드 관리
                </h2>
                <p className="m-0 text-[14px] text-ink-soft">{projectName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="-mr-2 -mt-2 flex h-11 w-11 items-center justify-center rounded-sm text-ink-soft transition-colors duration-150 hover:bg-surface-alt hover:text-ink"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <section
              aria-labelledby="manage-members"
              className="flex flex-col gap-3"
            >
              <h3 id="manage-members" className="m-0 text-base font-semibold">
                팀원{" "}
                <span className="font-normal text-ink-soft">
                  {members.length}명
                </span>
              </h3>
              <ul className="m-0 flex list-none flex-col divide-y divide-line rounded-lg border border-line p-0">
                {members.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2 sm:w-28 sm:flex-none">
                      <Avatar
                        member={{
                          id: m.id,
                          name: m.name,
                          role: m.position,
                          initial: m.initial,
                          color: m.color,
                        }}
                        size={28}
                      />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[15px] font-semibold">
                          {m.name}
                        </span>
                        <span className="text-xs text-ink-soft">
                          {m.leader
                            ? "팀장"
                            : m.linked
                              ? "참여 완료"
                              : "참여 전"}
                        </span>
                      </span>
                    </span>
                    <PositionInput member={m} />
                    {m.leader ? (
                      <span className="w-14 shrink-0" aria-hidden="true" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setConfirm({ kind: "member", member: m });
                        }}
                        className="min-h-11 w-14 shrink-0 rounded-sm text-sm font-semibold text-warn transition-colors duration-150 hover:bg-warn-soft"
                      >
                        삭제
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              <p className="m-0 text-[13px] text-ink-soft">
                팀원을 삭제해도 회의 기록은 남아요. 그 팀원의 의견과 업무는
                &lsquo;알 수 없음&rsquo;으로 바뀌어요.
              </p>
            </section>

            {/* 제목과 설명을 붙여 왼쪽에, 버튼은 오른쪽 */}
            <section
              aria-labelledby="manage-danger"
              className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 id="manage-danger" className="m-0 text-base font-semibold">
                  프로젝트 삭제
                </h3>
                <p className="m-0 text-[14px] text-ink-soft">
                  회의, 요약, 녹음 파일이 모두 지워지고 되돌릴 수 없어요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setConfirm({ kind: "project" });
                }}
                className="min-h-11 shrink-0 rounded-sm border border-warn px-4 text-sm font-semibold text-warn transition-colors duration-150 hover:bg-warn hover:text-white"
              >
                프로젝트 삭제
              </button>
            </section>
          </div>
        ) : null}
      </dialog>

      <ConfirmDialog
        open={confirm !== null}
        title="정말 삭제할까요?"
        body={
          confirm?.kind === "member"
            ? `${confirm.member.name} 팀원을 삭제하면\n이 프로젝트에서 내보내져요.`
            : "이 프로젝트를 삭제하면\n포함된 회의와 요약도 함께 삭제돼요."
        }
        confirmLabel={
          confirm?.kind === "member" ? "팀원 삭제" : "프로젝트 삭제"
        }
        busy={busy}
        error={error}
        onConfirm={doDelete}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
