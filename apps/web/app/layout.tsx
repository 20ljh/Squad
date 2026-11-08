import type { Metadata } from "next";
import { BRAND } from "@/lib/brand";
// 폰트는 Wanted Sans 가변 폰트 하나로 통일. npm 패키지로 self-host 합니다(외부 CDN 없이 학교 클라우드에서도 그대로 동작).
// split 방식이라 페이지에 쓰인 글자 묶음만 내려받음. 굵기 400~1000을 모두 지원
import "wanted-sans/fonts/webfonts/variable/split/WantedSansVariable.css";
import "./globals.css";

export const metadata: Metadata = {
  title: BRAND.name,
  description: BRAND.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
