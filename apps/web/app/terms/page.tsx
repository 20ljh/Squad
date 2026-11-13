import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { BRAND, pageTitle } from "@/lib/brand";

export const metadata: Metadata = { title: pageTitle("이용 약관") };

// 이용 약관 (/terms) — 졸업작품 시연 서비스라는 점과 녹음 동의 책임을 짧게
export default function TermsPage() {
  return (
    <LegalPage
      title="이용 약관"
      updated="2026년 11월 13일"
      intro={`${BRAND.name}는 대학 조별과제·캡스톤 팀의 회의를 정리하는 무료 서비스예요. 졸업작품으로 운영하고 있어서 언제든 바뀌거나 멈출 수 있어요.`}
      sections={[
        {
          title: "녹음 올리기",
          body: <p>회의를 녹음하고 올리기 전에 함께 회의한 사람 모두에게 동의를 받아 주세요. 동의 없이 녹음한 파일은 올리지 마세요.</p>,
        },
        {
          title: "정리 결과",
          body: <p>받아쓰기와 요약은 자동으로 만들어져서 틀린 내용이 있을 수 있어요. 중요한 결정은 팀이 직접 확인해 주세요.</p>,
        },
        {
          title: "서비스 운영",
          body: (
            <ul>
              <li>무료이며, 미리 알리지 않고 기능이 바뀌거나 서비스가 멈출 수 있어요.</li>
              <li>중요한 기록은 Notion 내보내기나 Markdown 복사로 따로 보관해 주세요.</li>
              <li>다른 사람의 계정을 쓰거나 서비스를 방해하는 이용은 막을 수 있어요.</li>
            </ul>
          ),
        },
        {
          title: "개인정보",
          body: (
            <p>
              받는 정보와 쓰는 곳은 <a href="/privacy" className="text-accent-strong underline">개인정보 처리 안내</a>에 적어 두었어요.
            </p>
          ),
        },
      ]}
    />
  );
}
