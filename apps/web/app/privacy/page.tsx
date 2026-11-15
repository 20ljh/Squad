import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";
import { BRAND, pageTitle } from "@/lib/brand";

export const metadata: Metadata = { title: pageTitle("개인정보 처리 안내") };

// 개인정보 처리 안내 (/privacy) — 실제로 저장·전송하는 것만 적음 (claude/DB.md 5절과 맞출 것)
export default function PrivacyPage() {
  return (
    <LegalPage
      title="개인정보 처리 안내"
      updated="2026년 11월 13일"
      intro={`${BRAND.name}는 단국대학교 소프트웨어학과 졸업작품으로 만든 무료 서비스예요. 회의를 정리하는 데 꼭 필요한 정보만 받고, 광고나 판매에 쓰지 않아요.`}
      sections={[
        {
          title: "받는 정보",
          body: (
            <ul>
              <li>구글 로그인: 이름, 이메일, 구글 계정 ID. 구글 비밀번호와 그 밖의 구글 데이터는 받지 않아요.</li>
              <li>프로젝트 정보: 프로젝트 이름, 팀원 이름과 맡은 일, 참여 요청 때 쓴 확인 메시지</li>
              <li>회의 녹음 파일과, 녹음을 받아쓴 원문(말한 시각, 말한 사람 포함), 요약 결과</li>
              <li>Notion을 연결한 경우 Notion이 준 접근 토큰(암호화해서 보관)과 워크스페이스 이름</li>
            </ul>
          ),
        },
        {
          title: "쓰는 곳",
          body: (
            <ul>
              <li>받아쓰기와 화자 나누기는 서비스가 직접 운영하는 컴퓨터에서 해요. 녹음이 외부 받아쓰기 서비스로 나가지 않아요.</li>
              <li>요약은 Anthropic의 Claude API로 받아쓴 원문을 보내 만들어요. Anthropic은 API로 받은 데이터를 모델 학습에 쓰지 않아요.</li>
              <li>Notion으로 내보내기를 누르면, 팀장이 고른 Notion 페이지 아래에 회의록 페이지를 만들어요.</li>
            </ul>
          ),
        },
        {
          title: "보는 사람",
          body: <p>회의 녹음, 원문, 요약은 그 프로젝트의 팀원(팀장이 수락한 사람)만 볼 수 있어요.</p>,
        },
        {
          title: "보관과 삭제",
          body: (
            <ul>
              <li>로그인 정보는 브라우저 쿠키에 무작위 값으로 두고, 서버에는 되돌릴 수 없는 해시만 저장해요. 30일이 지나면 다시 로그인해야 해요.</li>
              <li>초대 코드는 원문을 저장하지 않아요.</li>
              <li>프로젝트를 지우면 그 안의 회의, 녹음, 원문, 요약이 함께 지워져요. 삭제를 원하면 아래 연락처로 알려 주세요.</li>
            </ul>
          ),
        },
        {
          title: "연락처",
          body: <p>GitHub 저장소(https://github.com/20ljh/Squad)의 Issues로 알려 주세요.</p>,
        },
      ]}
    />
  );
}
