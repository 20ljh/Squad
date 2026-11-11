"use client";

import { useEffect, useRef, useState } from "react";

// 복구 코드 팝업 (프로젝트 만들기 직후)
// 1) 주의 단계: 복구 코드가 왜 중요한지 먼저 알려줌. 여기서는 "돌아가기"로 취소 가능
// 2) 코드 단계: (실제로는 이 시점에 프로젝트가 만들어지고) 복구 코드를 한 번만 보여줌.
//    "적어 뒀어요"를 체크하고 확인해야 닫히며, Esc나 바깥 클릭으로는 닫히지 않음
// 지금은 DB가 없어 코드를 브라우저에서 임의로 만든 예시 값으로 보여줌.

type Step = "notice" | "code";

type Props = {
  open: boolean;
  /** 주의 단계에서 "돌아가기" */
  onCancel: () => void;
  /** 코드 단계에서 최종 확인 */
  onDone: () => void;
};

// 헷갈리는 글자(0/O, 1/I/L)를 뺀 문자로 4자리 × 4묶음
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function makeExampleCode() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]);
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

function WarnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l9.5 17h-19L12 3z" />
      <path d="M12 10v4M12 17.5v.01" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M17 6l3 3M15 8l2 2" />
    </svg>
  );
}

const cautions = [
  "계정 없이 쓰기 때문에, 팀장 권한은 지금 이 기기(브라우저)에 저장돼요.",
  "이 기기를 잃어버리거나 브라우저 기록을 지우면, 복구 코드로만 팀장 권한을 되찾을 수 있어요.",
  "복구 코드는 다음 화면에서 한 번만 보여줘요. 다시 볼 수 없어요.",
  "팀원에게 보내는 초대 코드와 달라요. 복구 코드는 다른 사람에게 알려주지 마세요.",
];

export function RecoveryCodeDialog({ open, onCancel, onDone }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const [step, setStep] = useState<Step>("notice");
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setStep("notice");
      setSaved(false);
      setCopyMsg("");
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  function showCode() {
    // TODO: DB 단계에서 POST /api/projects 호출 → 응답의 복구 코드 원문을 표시
    setCode(makeExampleCode());
    setStep("code");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopyMsg("복사했어요");
    } catch {
      setCopyMsg("복사하지 못했어요. 코드를 직접 적어 주세요.");
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="recovery-title"
      aria-describedby="recovery-desc"
      // Esc: 주의 단계에서는 "돌아가기"와 같고, 코드 단계에서는 막음 (확인 전 닫히면 코드를 영영 못 봄)
      onCancel={(e) => {
        e.preventDefault();
        if (step === "notice") onCancel();
      }}
      className="m-auto w-[calc(100%-32px)] max-w-[480px] rounded-lg border border-ink-soft/30 bg-white p-0 text-ink backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
    >
      {step === "notice" ? (
        <div className="flex flex-col gap-5 p-6 md:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warn-soft text-warn">
              <WarnIcon />
            </span>
            <h2 id="recovery-title" className="m-0 font-display text-xl font-bold">
              복구 코드를 꼭 보관해 주세요
            </h2>
          </div>
          <ul id="recovery-desc" className="m-0 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-[1.6] marker:text-ink-soft">
            {cautions.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="h-12 rounded-sm border border-ink-soft/30 bg-white px-5 text-[15px] font-semibold text-ink transition-colors duration-150 hover:border-ink-soft"
            >
              돌아가기
            </button>
            <button
              type="button"
              onClick={showCode}
              autoFocus
              className="h-12 rounded-sm bg-accent-strong px-6 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
            >
              확인하고 코드 보기
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5 p-6 md:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
              <KeyIcon />
            </span>
            <h2 id="recovery-title" className="m-0 font-display text-xl font-bold">
              복구 코드
            </h2>
          </div>
          <p id="recovery-desc" className="m-0 text-[15px] leading-[1.6] text-ink-soft">
            지금 이 화면에서만 보여줘요. 메모장이나 사진 등 안전한 곳에 적어 두세요.
          </p>

          <div className="flex flex-col gap-2">
            <p
              className="m-0 select-all whitespace-nowrap rounded-sm border border-ink-soft/30 bg-surface-alt px-3 py-4 text-center font-display text-[19px] font-semibold tabular-nums tracking-[.04em] sm:text-2xl sm:tracking-[.08em]"
              aria-label={`복구 코드 ${code.split("").join(" ")}`}
            >
              {code}
            </p>
            <div className="flex items-center justify-between gap-3">
              <span aria-live="polite" className="text-[13px] text-ink-soft">
                {copyMsg}
              </span>
              <button
                type="button"
                onClick={copy}
                className="h-10 rounded-sm border border-ink-soft/30 bg-white px-4 text-sm font-semibold text-ink transition-colors duration-150 hover:border-ink-soft"
              >
                복사하기
              </button>
            </div>
            <p className="m-0 text-xs text-ink-soft">예시 화면이라 실제로 저장되지 않는 임시 코드예요.</p>
          </div>

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-sm border border-ink-soft/30 px-4 py-3 text-[15px]">
            <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="h-5 w-5 accent-accent-strong" />
            복구 코드를 안전한 곳에 적어 뒀어요
          </label>

          <button
            type="button"
            onClick={onDone}
            disabled={!saved}
            className="h-12 rounded-sm bg-accent-strong px-6 text-[15px] font-bold text-white transition-colors duration-150 hover:bg-accent-deep disabled:cursor-not-allowed disabled:bg-line disabled:text-ink-soft"
          >
            확인
          </button>
        </div>
      )}
    </dialog>
  );
}
