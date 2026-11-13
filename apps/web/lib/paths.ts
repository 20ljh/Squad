// 화면 주소를 한 곳에서 만든다. 주소 구조가 바뀌면 여기만 고치면 됨

/** 예시 프로젝트 id — 메인의 "샘플 프로젝트 보기"가 여는 /p/sample (DB 시드로 넣음) */
export const SAMPLE_PROJECT_ID = "sample";

/** 받아쓰기·요약 시험 결과를 담은 프로젝트 — /p/rec-test/meetings/stt-test (주소로만 들어감) */
export const REC_TEST_PROJECT_ID = "rec-test";

export function projectPath(projectId: string): string {
  return `/p/${encodeURIComponent(projectId)}`;
}

export function meetingPath(projectId: string, meetingId: string): string {
  return `${projectPath(projectId)}/meetings/${encodeURIComponent(meetingId)}`;
}

export function newMeetingPath(projectId: string): string {
  return `${projectPath(projectId)}/meetings/new`;
}
