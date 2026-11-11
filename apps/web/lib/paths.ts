// 화면 주소를 한 곳에서 만든다. 주소 구조가 바뀌면 여기만 고치면 됨

/** 예시 프로젝트 id — 메인의 "샘플 프로젝트 보기"가 여는 /p/sample (DB 연결 전까지 유일한 프로젝트) */
export const SAMPLE_PROJECT_ID = "sample";

export function projectPath(projectId: string): string {
  return `/p/${encodeURIComponent(projectId)}`;
}

export function meetingPath(projectId: string, meetingId: string): string {
  return `${projectPath(projectId)}/meetings/${encodeURIComponent(meetingId)}`;
}
