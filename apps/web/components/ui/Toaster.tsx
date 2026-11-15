"use client";

import { useEffect, useRef, useState } from "react";

// 화면 아래 가운데에 잠깐 떴다 사라지는 알림 (예: "녹음을 올렸어요")
// 어디서든 showToast("문구")를 부르면 됨. 레이아웃(app/layout.tsx)에 <Toaster />를 한 번 둠
// 화면이 새로 그려져도(router.refresh) 사라지지 않도록 컴포넌트 밖에서 이벤트로 전달

const EVENT = "app-toast";
const SHOW_MS = 3200;

export function showToast(message: string) {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: message }));
}

export function Toaster() {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    const on = (e: Event) => {
      const text = (e as CustomEvent<string>).detail;
      window.clearTimeout(timer.current);
      setMessage(text);
      setVisible(true);
      timer.current = window.setTimeout(() => setVisible(false), SHOW_MS);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4" aria-live="polite" role="status">
      {message ? (
        <div
          className={`flex max-w-[480px] items-center gap-2.5 rounded-lg bg-ink px-5 py-3.5 text-[15px] text-white shadow-soft transition-[opacity,transform] duration-200 ${
            visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12.5l2.8 2.8L16 10" />
          </svg>
          {message}
        </div>
      ) : null}
    </div>
  );
}
