"use client";

import Link from "next/link";
import { useState } from "react";
import { RecoveryCodeDialog } from "./RecoveryCodeDialog";

// 기본 프로젝트 설정 폼 (/projects/new)
// 지금은 화면만 있는 예시: 입력 검사까지 하고, 실제 생성(POST /api/projects)은 DB 단계에서 연결.

const MAX_MEMBERS = 10;
const MAX_NAME = 20;

type Errors = Partial<Record<"name" | "leader" | "member", string>>;

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

// 보안 안내: 모바일에서는 폼 안(만들기 버튼 위), PC에서는 오른쪽 안내 영역에 보여줌
export function SafetyNote({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-sm border border-ink-soft/30 bg-surface-alt p-4 ${className}`}>
      <span className="mt-0.5 shrink-0 text-accent-strong">
        <LockIcon />
      </span>
      <p className="m-0 text-sm leading-[1.6] text-ink">
        <strong className="block font-semibold">링크가 퍼져도 안전해요.</strong>
        팀원은 초대 링크로 들어와 확인 메시지를 보내고, 팀장인 내가 메시지를 보고
        수락해야 들어올 수 있어요.
      </p>
    </div>
  );
}

const inputClass =
  "h-12 w-full min-w-0 rounded-sm border border-ink-soft/50 bg-white px-3.5 text-base text-ink transition-colors duration-150 placeholder:text-ink-soft hover:border-ink-soft aria-[invalid=true]:border-warn sm:px-4";

function Label({ htmlFor, children, hint, required }: { htmlFor: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-semibold">
      {children}
      {hint ? <span className="ml-1 font-normal text-ink-soft">({hint})</span> : null}
      {required ? (
        <>
          <span className="ml-1 text-warn" aria-hidden="true">
            *
          </span>
          <span className="sr-only">(필수)</span>
        </>
      ) : null}
    </label>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return (
    <p id={id} aria-live="polite" className="m-0 text-[13px] font-medium text-warn empty:hidden">
      {message}
    </p>
  );
}

export function ProjectNewForm() {
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [leader, setLeader] = useState("");
  const [memberInput, setMemberInput] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function addMember() {
    const n = memberInput.trim();
    if (!n) {
      setErrors((e) => ({ ...e, member: "추가할 팀원 이름을 입력해 주세요." }));
      return;
    }
    if (n.length > MAX_NAME) {
      setErrors((e) => ({ ...e, member: `이름은 ${MAX_NAME}자까지 쓸 수 있어요.` }));
      return;
    }
    if (n === leader.trim() || members.includes(n)) {
      setErrors((e) => ({ ...e, member: `'${n}'은(는) 이미 들어 있어요.` }));
      return;
    }
    if (members.length >= MAX_MEMBERS) {
      setErrors((e) => ({ ...e, member: `팀원은 ${MAX_MEMBERS}명까지 미리 넣을 수 있어요.` }));
      return;
    }
    setMembers((m) => [...m, n]);
    setMemberInput("");
    setErrors((e) => ({ ...e, member: undefined }));
  }

  function removeMember(n: string) {
    setMembers((m) => m.filter((x) => x !== n));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = "프로젝트 이름을 입력해 주세요.";
    if (!leader.trim()) next.leader = "팀장인 내 이름을 입력해 주세요.";
    setErrors(next);
    if (next.name || next.leader) {
      setNotice(null);
      return;
    }
    // 입력이 맞으면 복구 코드 팝업부터 (주의 → 코드 → 확인). 실제 생성은 팝업의 코드 단계에서 일어남
    setNotice(null);
    setDialogOpen(true);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6 rounded-lg border border-ink-soft/30 bg-white p-5 md:p-8">
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="p-name" required>
            프로젝트 이름
          </Label>
          <input
            id="p-name"
            type="text"
            autoComplete="off"
            maxLength={40}
            placeholder="예: 마켓셰이프"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={errors.name ? true : undefined}
            aria-describedby="p-name-error"
            className={inputClass}
          />
          <FieldError id="p-name-error" message={errors.name} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="p-course" hint="선택">
            과목·팀 이름
          </Label>
          <input
            id="p-course"
            type="text"
            autoComplete="off"
            maxLength={40}
            placeholder="예: 캡스톤디자인 · 3조"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* PC에서 위의 "프로젝트 이름" 칸과 같은 두 칸 격자를 써서 칸 길이를 맞춤 */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="p-leader" hint="팀장" required>
            내 이름
          </Label>
          <input
            id="p-leader"
            type="text"
            autoComplete="off"
            maxLength={MAX_NAME}
            placeholder="예: 하은"
            value={leader}
            onChange={(e) => setLeader(e.target.value)}
            aria-invalid={errors.leader ? true : undefined}
            aria-describedby="p-leader-error"
            className={inputClass}
          />
          <FieldError id="p-leader-error" message={errors.leader} />
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-ink-soft/30 pt-6">
        <Label htmlFor="p-member" hint="선택">
          팀원 이름
        </Label>
        {members.length > 0 ? (
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0" aria-label="미리 넣은 팀원">
            {members.map((m) => (
              <li key={m} className="flex items-center gap-1 rounded-full bg-accent-soft py-1 pl-3.5 pr-1 text-sm font-medium text-accent-deep">
                {m}
                <button
                  type="button"
                  onClick={() => removeMember(m)}
                  aria-label={`${m} 빼기`}
                  className="flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-150 hover:bg-white"
                >
                  <XIcon />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {/* PC: 입력칸은 왼쪽 칸(프로젝트 이름과 같은 길이), "추가" 버튼은 오른쪽 칸 시작선(과목·팀 이름 칸과 같은 위치) */}
        <div className="flex gap-2 md:grid md:grid-cols-2 md:gap-5">
          <input
            id="p-member"
            type="text"
            autoComplete="off"
            maxLength={MAX_NAME}
            placeholder="이름 입력 후 추가"
            value={memberInput}
            onChange={(e) => setMemberInput(e.target.value)}
            onKeyDown={(e) => {
              // 한글 조합 중 Enter는 무시해야 마지막 글자가 두 번 들어가지 않음
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addMember();
              }
            }}
            aria-invalid={errors.member ? true : undefined}
            aria-describedby="p-member-help p-member-error"
            className={inputClass}
          />
          <button
            type="button"
            onClick={addMember}
            className="h-12 shrink-0 rounded-sm bg-accent-soft px-5 text-[15px] font-semibold text-accent-deep transition-colors duration-150 hover:bg-line md:justify-self-start"
          >
            추가
          </button>
        </div>
        <FieldError id="p-member-error" message={errors.member} />
        <p id="p-member-help" className="m-0 text-[13px] leading-[1.6] text-ink-soft">
          미리 넣어두면 팀원이 참여할 때 이름을 고르기만 하면 돼요. 비워두고 나중에 추가해도 돼요.
        </p>
      </div>

      <SafetyNote className="md:hidden" />

      {/* 안내 문구는 버튼 줄과 분리해서, 문구 길이와 상관없이 버튼 크기가 그대로 유지되게 함 */}
      <div className="flex flex-col gap-3">
        <p aria-live="polite" className="m-0 rounded-sm bg-accent-soft px-4 py-3 text-sm text-accent-deep empty:hidden">
          {notice}
        </p>
        <div className="flex flex-col gap-3 md:flex-row-reverse md:items-center">
          <button
            type="submit"
            className="flex h-12 shrink-0 items-center justify-center whitespace-nowrap rounded-sm bg-accent-strong px-7 text-base font-bold text-white transition-colors duration-150 hover:bg-accent-deep"
          >
            프로젝트 만들기
          </button>
          <Link
            href="/"
            className="flex h-12 shrink-0 items-center justify-center whitespace-nowrap rounded-sm border border-ink-soft/30 bg-white px-6 text-[15px] font-semibold text-ink no-underline transition-colors duration-150 hover:border-ink-soft"
          >
            취소
          </Link>
        </div>
      </div>

      <RecoveryCodeDialog
        open={dialogOpen}
        onCancel={() => setDialogOpen(false)}
        onDone={() => {
          setDialogOpen(false);
          // TODO: 생성 완료·초대 공유 화면으로 이동
          setNotice("프로젝트를 만들었어요(예시). 다음 단계에서 초대 공유 화면으로 이어져요.");
        }}
      />
    </form>
  );
}
