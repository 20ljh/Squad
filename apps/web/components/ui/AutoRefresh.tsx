"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 서버 화면을 몇 초마다 새로 읽음 (승인 대기 화면 등. 실시간 연결 없이 상태 변화를 보여 줌)
export function AutoRefresh({ ms }: { ms: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), ms);
    return () => clearInterval(t);
  }, [ms, router]);
  return null;
}
