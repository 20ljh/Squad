// 화면에서 쓰는 뷰 모델. Prisma 모델(CLAUDE.md 5절)을 조회한 뒤 이 형태로 매핑해서 넘기면 됩니다.

export type Member = {
  id: string;
  name: string;
  role: string;
  /** 아바타에 들어갈 한 글자 */
  initial: string;
  /** 팀원 고유 색상(hex). 흰 글자와 4.5:1 이상 대비가 나는 중간 명도 색을 쓸 것 */
  color: string;
};

export type Opinion = {
  memberId: string;
  /** 원문 인용 — 안건 카드에 표시 */
  quote: string;
  /** 마인드맵 노드용 짧은 요지(15자 내외) */
  gist: string;
};

export type Decision = {
  text: string;
  /** 마인드맵 결정 노드용 짧은 문구 */
  short: string;
  ownerLabel: string;
  dueLabel: string;
};

export type AgendaItem = {
  id: string;
  order: number;
  title: string;
  /** 마인드맵 안건 노드용 짧은 제목 */
  shortTitle: string;
  opinions: Opinion[];
  decision: Decision | null;
};

export type ScheduleItem = {
  id: string;
  /** ISO 날짜 (YYYY-MM-DD). "주말까지"처럼 날짜를 하나로 정할 수 없으면 null */
  date: string | null;
  /** 원문의 마감 표현("주말", "일요일 자정"). 날짜가 없을 때 화면에 그대로 보여 줌 */
  dueText?: string;
  label: string;
  ownerLabel: string;
};

export type Meeting = {
  id: string;
  teamName: string;
  title: string;
  shortTitle: string;
  /** ISO 날짜 (YYYY-MM-DD) */
  date: string;
  timeRange: string;
  mode: string;
  transcriptDuration: string;
  members: Member[];
  attendeeIds: string[];
  agenda: AgendaItem[];
  schedules: ScheduleItem[];
};

export type Participation = {
  memberId: string;
  actionDone: number;
  actionTotal: number;
  attendDone: number;
  attendTotal: number;
};

export type MeetingRound = {
  id: string;
  title: string;
  shortLabel: string;
  /** 헤더의 "최근 회의" 버튼 문구. 없으면 "{shortLabel} 회의 결과" */
  resultLabel?: string;
  dateLabel: string;
  attendDone: number;
  attendTotal: number;
  /** 결과 페이지를 확인한 팀원 id */
  readBy: string[];
  /** 불참한 팀원 id */
  absent: string[];
};

export type Highlight = {
  text: string;
  meetingTag: string;
};

export type Kpi = {
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "warn" | "accent";
};

export type Dashboard = {
  teamName: string;
  headline: string;
  subline: string;
  members: Member[];
  kpis: Kpi[];
  participation: Participation[];
  rounds: MeetingRound[];
  highlights: Highlight[];
  /** 회의 기록 검색 예시 (예시 프로젝트만). 없으면 검색 칸이 "회의가 쌓이면" 안내를 보여 줌 */
  sampleSearch?: { question: string; answer: string; linkLabel: string; href: string };
};
