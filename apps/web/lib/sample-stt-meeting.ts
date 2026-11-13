import type { Meeting, Member } from "./types";

// 받아쓰기·요약 시험 결과를 회의 결과 화면에 그대로 얹어 보는 시험용 데이터. prisma/seed.ts 가 rec-test 프로젝트로 DB에 넣음.
// 원본: 실제 팀 회의 녹음(5분 50초) → faster-whisper + pyannote(화자 4명) → Haiku 5.5 요약(노력 단계 high).
// 화자는 아직 팀원과 매핑 전이라 "화자1~4"로 둠. 마인드맵 글자 수를 넘은 요지 1개만 줄였음.
// 회의 날짜는 녹음 파일의 기록 시각(2026-05-07 13:57, 목)을 씀. "일요일 자정"은 그 기준으로 5/10,
// "주말까지"는 어느 주말인지 말하지 않아 날짜 미정으로 둠.

const speakers: Member[] = [
  { id: "s1", name: "화자1", role: "매핑 전", initial: "1", color: "#C1573D" },
  { id: "s2", name: "화자2", role: "매핑 전", initial: "2", color: "#3E7FB0" },
  { id: "s3", name: "화자3", role: "매핑 전", initial: "3", color: "#7A5AC7" },
  { id: "s4", name: "화자4", role: "매핑 전", initial: "4", color: "#B98A1E" },
];

export const STT_TEST_MEETING_ID = "stt-test";

export const sttTestMeeting: Meeting = {
  id: STT_TEST_MEETING_ID,
  teamName: "받아쓰기·요약 시험 · 실제 팀 회의 녹음",
  title: "발표 역할·일정 회의 결과",
  shortTitle: "발표 역할 회의",
  date: "2026-05-07",
  timeRange: "약 6분",
  mode: "대면 (휴대폰 녹음)",
  transcriptDuration: "5:50",
  members: speakers,
  attendeeIds: ["s1", "s2", "s3", "s4"],
  agenda: [
    {
      id: "a1",
      order: 1,
      title: "발표 역할 분담",
      shortTitle: "발표 역할 분담",
      opinions: [
        { memberId: "s1", quote: "발표를 두 번 해야 되니까 1차 2명, 2차 2명으로 나눠서 하면 괜찮지 않을까요.", gist: "1차·2차 2명씩 나누자" },
        { memberId: "s2", quote: "그러면 제가 같이 1차, 2차, 3차? 혹시 다른 분은 어떠세요.", gist: "역할 나눠 맡을 의향 묻기" },
        { memberId: "s3", quote: "제가 2차를 할게요.", gist: "2차 발표 맡겠다고 함" },
      ],
      decision: { text: "발표를 1차·2차 2명씩 나누고, 화자3이 2차 발표를 맡기로 함", short: "2명씩 나눠 1·2차 발표", ownerLabel: "화자3", dueLabel: "기한 없음" },
    },
    {
      id: "a2",
      order: 2,
      title: "2차 발표 주제",
      shortTitle: "2차 발표 주제",
      opinions: [
        { memberId: "s2", quote: "다음 회의가 다가와서 혹시 생각해 놓은 주제 있으신지요.", gist: "2차 주제 있는지 확인" },
        { memberId: "s1", quote: "없으시면 이번 주말까지 한번 찾아보고 올리는 걸로 하고요.", gist: "주말까지 찾아 올리자" },
      ],
      decision: { text: "각자 2차 발표 주제를 일요일 자정까지 생각해 보기로 함", short: "2차 주제 각자 준비", ownerLabel: "전원", dueLabel: "5/10(일) 자정" },
    },
    {
      id: "a3",
      order: 3,
      title: "PPT 초안·일정",
      shortTitle: "PPT 초안·일정",
      opinions: [
        { memberId: "s1", quote: "PPT 초안을 일단 제가 만들어 볼게요. 다음 주 목요일까지 드리는 거 괜찮을까요.", gist: "초안 5/14까지 공유" },
        { memberId: "s4", quote: "딱 축제 끝나고 그때부터요.", gist: "축제 끝난 뒤부터 가능" },
      ],
      decision: { text: "화자1이 PPT 초안을 다음 주 목요일(5월 14일)까지 공유하기로 함", short: "PPT 초안 공유", ownerLabel: "화자1", dueLabel: "5/14(목)" },
    },
    {
      id: "a4",
      order: 4,
      title: "대본 준비",
      shortTitle: "대본 준비",
      opinions: [
        { memberId: "s1", quote: "빠른 시간 내로 디자인이랑 대본 같은 거 정해서 답변 드리고 예상 질문도 만들어서.", gist: "대본·예상 질문 빠르게 준비" },
      ],
      decision: { text: "주말까지 의견을 나눠 대본을 수정하고 확정하기로 함", short: "주말까지 대본 확정", ownerLabel: "전원", dueLabel: "주말(날짜 미정)" },
    },
  ],
  schedules: [
    { id: "s1", date: "2026-05-10", label: "2차 발표 주제 생각해 오기", ownerLabel: "전원" },
    { id: "s2", date: "2026-05-14", label: "PPT 초안 공유", ownerLabel: "화자1" },
    { id: "s3", date: null, dueText: "주말", label: "대본 수정·확정", ownerLabel: "전원" },
  ],
};
