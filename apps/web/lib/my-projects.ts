// 메인 화면 "이 기기의 내 프로젝트" 데이터.
// 계정이 없어서, 이 브라우저에 저장된 기기 토큰(httpOnly 쿠키)으로 연결된 프로젝트를 조회할 예정.

export type MyProject = {
  id: string;
  name: string;
  /** "캡스톤디자인 · 3조 · 회의 3회"처럼 이름 아래 한 줄 */
  meta: string;
  /** leader: 팀장 · member: 팀원 · pending: 참여 요청 후 승인 대기 */
  status: "leader" | "member" | "pending";
  href: string;
};

/** 프로젝트 만들기·참여 기능이 생기기 전까지는 실제 서비스처럼 항상 빈 목록 */
export function getMyProjects(): MyProject[] {
  return [];
}
