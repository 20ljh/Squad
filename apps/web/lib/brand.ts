// 서비스 이름: Squad (2026-11 확정).
// 화면·메타데이터에 이름을 직접 쓰지 말고 반드시 이 상수를 가져다 쓰세요. 이름이 바뀌면 여기만 고치면 됩니다.
export const BRAND = {
  name: "Squad",
  description: "조별과제 회의를 정리해 Notion으로 보내주는 회의 기록 도구",
} as const;

export function pageTitle(title?: string) {
  return title ? `${title} | ${BRAND.name}` : BRAND.name;
}
