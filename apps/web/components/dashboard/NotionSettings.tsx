"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { NotionStatus } from "@/lib/notion-project";
import { BRAND } from "@/lib/brand";

// 팀장에게만 보이는 "Notion 연결" 칸 (대시보드 #notion)
// 연결 전 → "Notion 연결하기" / 연결 후 페이지를 아직 안 골랐으면 → 페이지 고르기 / 다 됐으면 → 내보낼 곳 표시·바꾸기·연결 끊기

const FLASH: Record<string, { text: string; tone: "ok" | "warn" }> = {
  connected: { text: "Notion을 연결했어요. 회의를 내보낼 페이지를 골라 주세요.", tone: "ok" },
  cancelled: { text: "Notion 연결을 취소했어요.", tone: "warn" },
  state: { text: "연결 시간이 지났어요. 다시 시도해 주세요.", tone: "warn" },
  failed: { text: "Notion과 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.", tone: "warn" },
  config: { text: "서버에 Notion 연동 설정이 아직 없어요. 관리자에게 알려 주세요.", tone: "warn" },
};

const secondary =
  "min-h-11 rounded-sm border border-ink-soft/50 bg-white px-4 text-[14px] font-semibold text-ink transition-colors duration-150 hover:border-accent hover:text-accent-strong disabled:opacity-60";

function NotionMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M9 16V8l6 8V8" strokeLinecap="round" />
    </svg>
  );
}

export function NotionSettings({ projectId, status, flash }: { projectId: string; status: NotionStatus; flash?: string }) {
  const router = useRouter();
  const [pages, setPages] = useState<{ id: string; title: string }[] | null>(null);
  const [picking, setPicking] = useState(status.connected && !status.pageId);
  const [selected, setSelected] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // "연결했어요, 페이지를 골라 주세요" 안내는 페이지를 정한 뒤에는 감춤
  const note = flash && !(flash === "connected" && status.pageId) ? FLASH[flash] : undefined;
  const api = `/api/projects/${encodeURIComponent(projectId)}/notion`;

  async function loadPages() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(api);
      const data = (await res.json().catch(() => ({}))) as { pages?: { id: string; title: string }[]; error?: string };
      if (!res.ok || !data.pages) setError(data.error ?? "페이지 목록을 가져오지 못했어요.");
      else {
        setPages(data.pages);
        setSelected(status.pageId ?? data.pages[0]?.id ?? "");
      }
    } catch {
      setError("서버에 연결하지 못했어요.");
    }
    setBusy(false);
  }

  async function save() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const res = await fetch(api, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pageId: selected }) }).catch(() => null);
    const data = (await res?.json().catch(() => ({}))) as { error?: string } | undefined;
    if (!res?.ok) setError(data?.error ?? "저장하지 못했어요.");
    else {
      setPicking(false);
      router.replace(`${window.location.pathname}#notion`); // 주소에 남은 ?notion= 안내 지우기
      router.refresh();
    }
    setBusy(false);
  }

  async function disconnect() {
    if (!window.confirm("Notion 연결을 끊을까요? 이미 내보낸 페이지는 Notion에 그대로 남아요.")) return;
    setBusy(true);
    await fetch(api, { method: "DELETE" }).catch(() => null);
    setBusy(false);
    setPages(null);
    router.refresh();
  }

  // 페이지 고르기 화면을 열 때 목록을 불러옴
  useEffect(() => {
    if (picking && pages === null) void loadPages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picking]);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line bg-white p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-ink">
          <NotionMark />
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          {!status.connected ? (
            <>
              <p className="m-0 text-base font-semibold">아직 Notion이 연결되지 않았어요</p>
              <p className="m-0 text-[14px] leading-[1.6] text-ink-soft">
                연결하면 회의 결과 페이지에서 버튼 한 번으로 팀 Notion에 회의록을 만들 수 있어요. Notion 화면에서 회의록을 넣을 페이지를 함께 골라 주세요.
              </p>
            </>
          ) : (
            <>
              <p className="m-0 text-base font-semibold">{status.workspace ?? "Notion"} 워크스페이스에 연결됐어요</p>
              <p className="m-0 text-[14px] leading-[1.6] text-ink-soft">
                {status.pageTitle ? (
                  <>
                    회의록은 <strong className="text-ink">{status.pageTitle}</strong> 페이지 안의 &lsquo;{BRAND.name} 회의록&rsquo; 표에 한 줄씩 쌓여요(일시·방식·참석 칸 포함).
                  </>
                ) : (
                  "회의록을 넣을 페이지를 골라 주세요."
                )}
              </p>
            </>
          )}
        </div>
      </div>

      {note ? (
        <p role="status" className={`m-0 rounded-sm px-4 py-3 text-[14px] ${note.tone === "ok" ? "bg-accent-soft text-accent-deep" : "bg-warn-soft text-warn"}`}>
          {note.text}
        </p>
      ) : null}

      {status.connected && picking ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="notion-page" className="text-sm font-semibold">
            회의록을 넣을 페이지
          </label>
          {pages && pages.length === 0 ? (
            <p className="m-0 text-[14px] text-ink-soft">
              연동이 볼 수 있는 페이지가 없어요. &lsquo;Notion 다시 연결&rsquo;을 눌러 Notion 화면에서 페이지를 공유해 주세요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <select
                id="notion-page"
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                disabled={!pages}
                className="h-11 min-w-0 flex-1 rounded-sm border border-ink-soft/50 bg-white px-3 text-base"
              >
                {pages ? pages.map((p) => <option key={p.id} value={p.id}>{p.title}</option>) : <option>불러오는 중…</option>}
              </select>
              <button type="button" onClick={save} disabled={busy || !selected} className="min-h-11 rounded-sm bg-accent-strong px-5 text-[14px] font-bold text-white transition-colors duration-150 hover:bg-accent-deep disabled:opacity-60">
                이 페이지로 정하기
              </button>
            </div>
          )}
        </div>
      ) : null}

      <p aria-live="polite" className="m-0 text-[13px] font-medium text-warn empty:hidden">
        {error}
      </p>

      <div className="flex flex-wrap gap-2">
        {!status.connected ? (
          <a href={`/api/notion/connect?projectId=${encodeURIComponent(projectId)}`} className="inline-flex min-h-12 items-center rounded-sm bg-accent-strong px-5 text-[15px] font-bold text-white no-underline transition-colors duration-150 hover:bg-accent-deep">
            Notion 연결하기
          </a>
        ) : (
          <>
            {!picking ? (
              <button type="button" onClick={() => setPicking(true)} disabled={busy} className={secondary}>
                페이지 바꾸기
              </button>
            ) : null}
            <a href={`/api/notion/connect?projectId=${encodeURIComponent(projectId)}`} className={`${secondary} inline-flex items-center no-underline`}>
              Notion 다시 연결
            </a>
            <button type="button" onClick={disconnect} disabled={busy} className={`${secondary} hover:border-warn hover:text-warn`}>
              연결 끊기
            </button>
          </>
        )}
      </div>
    </div>
  );
}
