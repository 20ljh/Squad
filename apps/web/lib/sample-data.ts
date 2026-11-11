import type { Dashboard, Meeting, Member } from "./types";
import { SAMPLE_PROJECT_ID, meetingPath } from "./paths";
import { sttTestMeeting } from "./sample-stt-meeting";

// 목업과 동일한 예시 데이터. 실제 연결 시 DB 조회 결과로 교체합니다.

export const members: Member[] = [
  { id: "jihyun", name: "지현", role: "UI/UX", initial: "지", color: "#C1573D" },
  { id: "minsu", name: "민수", role: "백엔드", initial: "민", color: "#3E7FB0" },
  { id: "haeun", name: "하은", role: "기획/PM", initial: "하", color: "#7A5AC7" },
  { id: "taeyun", name: "태윤", role: "프론트", initial: "태", color: "#B98A1E" },
];

export const sampleMeeting: Meeting = {
  id: "m3",
  teamName: "마켓세이프 · 캡스톤 프로젝트팀",
  title: "3차 정기회의 결과",
  shortTitle: "3차 회의",
  date: "2026-09-22",
  timeRange: "19:00–20:15",
  mode: "Discord 음성채널",
  transcriptDuration: "42:18",
  members,
  attendeeIds: ["jihyun", "minsu", "haeun", "taeyun"],
  agenda: [
    {
      id: "a1",
      order: 1,
      title: "UI 디자인 시안 선택",
      shortTitle: "UI 디자인 시안",
      opinions: [
        { memberId: "jihyun", quote: "카드형 B안이 정보 위계가 명확해서 가격이랑 상태를 한눈에 볼 수 있어요.", gist: "정보 위계 명확한 B안" },
        { memberId: "taeyun", quote: "B안이 컴포넌트 재사용성도 높아서 구현 난이도가 낮아요.", gist: "재사용성 높아 구현 쉬움" },
        { memberId: "haeun", quote: "다들 동의하면 B안으로 최종 확정하죠.", gist: "B안으로 확정 제안" },
      ],
      decision: { text: "Figma B안 채택 · 스타일가이드 문서화", short: "Figma B안 채택", ownerLabel: "지현", dueLabel: "10/3(토)" },
    },
    {
      id: "a2",
      order: 2,
      title: "백엔드 API 설계 방향",
      shortTitle: "API 설계 방향",
      opinions: [
        { memberId: "minsu", quote: "REST가 학습 곡선도 낮고 우리 일정에 맞아요.", gist: "REST가 일정에 맞음" },
        { memberId: "haeun", quote: "GraphQL은 지금 팀 규모엔 오버스펙 같아요.", gist: "GraphQL은 오버스펙" },
      ],
      decision: { text: "REST 방식 확정 · API 명세서 초안 작성", short: "REST 방식 확정", ownerLabel: "민수", dueLabel: "10/12(월)" },
    },
    {
      id: "a3",
      order: 3,
      title: "발표 일정 조율",
      shortTitle: "발표 일정 조율",
      opinions: [
        { memberId: "haeun", quote: "중간발표 전에 프로토타입 데모가 꼭 필요해요.", gist: "데모 프로토타입 필요" },
        { memberId: "jihyun", quote: "10/5까지는 목업이라도 돌아가는 화면을 만들어야죠.", gist: "10/5까지 목업 완성" },
      ],
      decision: { text: "10/5(월) 중간발표 · 데모 프로토타입 완성 목표", short: "10/5 중간발표 확정", ownerLabel: "전원", dueLabel: "10/5(월)" },
    },
  ],
  schedules: [
    { id: "s1", date: "2026-10-03", label: "스타일가이드 문서화 마감", ownerLabel: "지현" },
    { id: "s2", date: "2026-10-05", label: "중간발표 · 프로토타입 데모", ownerLabel: "전원" },
    { id: "s3", date: "2026-10-12", label: "API 명세서 초안 마감", ownerLabel: "민수" },
  ],
};

export const sampleDashboard: Dashboard = {
  teamName: "마켓세이프 · 캡스톤 프로젝트팀",
  headline: "프로젝트 진행 현황",
  subline: "3회차 회의 진행 · 중간발표까지 D-13",
  members,
  kpis: [
    { label: "진행중 액션아이템", value: "5건", hint: "이번 주 마감 2건" },
    { label: "마감 임박", value: "2건", hint: "3일 이내", tone: "warn" },
    { label: "누적 회의", value: "3회", hint: "총 2시간 17분 녹음" },
  ],
  participation: [
    { memberId: "jihyun", actionDone: 2, actionTotal: 2, attendDone: 3, attendTotal: 3 },
    { memberId: "minsu", actionDone: 1, actionTotal: 2, attendDone: 3, attendTotal: 3 },
    { memberId: "haeun", actionDone: 3, actionTotal: 3, attendDone: 3, attendTotal: 3 },
    { memberId: "taeyun", actionDone: 1, actionTotal: 1, attendDone: 2, attendTotal: 3 },
  ],
  rounds: [
    {
      id: "m1", title: "1차 정기회의", shortLabel: "1차", dateLabel: "9/8(화)", attendDone: 4, attendTotal: 4,
      readBy: ["jihyun", "minsu", "haeun", "taeyun"], absent: [],
    },
    {
      id: "m2", title: "2차 정기회의", shortLabel: "2차", dateLabel: "9/15(화)", attendDone: 3, attendTotal: 4,
      readBy: ["jihyun", "minsu", "haeun"], absent: ["taeyun"],
    },
    {
      id: "m3", title: "3차 정기회의", shortLabel: "3차", dateLabel: "9/22(화)", attendDone: 4, attendTotal: 4,
      readBy: ["jihyun"], absent: [],
    },
  ],
  highlights: [
    { text: "카드형 B안이 정보 위계가 명확해서 가격이랑 상태를 한눈에 볼 수 있어요.", meetingTag: "3차 회의 · UI 시안" },
    { text: "REST가 학습 곡선도 낮고 우리 일정에 맞아요.", meetingTag: "3차 회의 · API 설계" },
    { text: "발표 전에 실제 결제 흐름까지는 목업으로 꼭 보여줘야 해요.", meetingTag: "2차 회의 · 발표 준비" },
  ],
  sampleSearch: {
    question: "API 방식 왜 REST로 정했어?",
    answer:
      "3차 회의(9/22)에서 민수가 제안했어요: \"REST가 학습 곡선도 낮고 일정에 맞다\"는 이유로, 하은도 \"GraphQL은 오버스펙\"이라며 동의해 REST 방식으로 최종 확정했습니다.",
    linkLabel: "3차 회의 · 안건 02 바로가기",
    href: `${meetingPath(SAMPLE_PROJECT_ID, "m3")}#summary`,
  },
};

/** 샘플 데이터 조회 — 실제로는 DB/API 호출로 교체. 없는 프로젝트·회의는 null */
export function getMeeting(projectId: string, meetingId: string): Meeting | null {
  if (projectId !== SAMPLE_PROJECT_ID) return null;
  if (meetingId === sttTestMeeting.id) return sttTestMeeting; // 받아쓰기·요약 시험 결과 (주소로만 들어감)
  return meetingId === sampleMeeting.id ? sampleMeeting : null;
}

export function getDashboard(projectId: string): Dashboard | null {
  return projectId === SAMPLE_PROJECT_ID ? sampleDashboard : null;
}
