import { expect, test } from "@playwright/test";
import { USER_B } from "./auth.setup";

// 로그인·권한·초대 참여 흐름
// 사용자 A(기본 로그인)가 프로젝트를 만들고, 사용자 B가 초대 링크로 참여 요청 → A가 수락 → B가 이름을 골라 들어감

test("로그인하지 않으면 프로젝트·회의는 로그인 화면으로, 예시 프로젝트는 그대로 보인다", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  const res = await page.request.post("/api/projects", { data: { name: "e2e 로그인 없음", leader: "가" } });
  expect(res.status()).toBe(401);
  await page.goto("/projects/new");
  await expect(page).toHaveURL(/\/login\?next=%2Fprojects%2Fnew/);
  await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();
  await page.goto("/p/sample");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("프로젝트 진행 현황");
  await page.goto("/");
  await expect(page.getByRole("link", { name: "구글 계정으로 로그인" })).toBeVisible();
  await ctx.close();
});

test("초대 링크로 참여 요청 → 팀장 수락 → 이름 고르기 → 팀 대시보드", async ({ page, browser }) => {
  // A: 프로젝트 만들기 (응답에 초대 코드 원문)
  const created = await page.request.post("/api/projects", { data: { name: "e2e 참여 흐름", course: "", leader: "이주형", members: ["김치우"] } });
  expect(created.status()).toBe(201);
  const { id, inviteCode } = (await created.json()) as { id: string; inviteCode: string };
  expect(inviteCode).toMatch(/^SQD-[A-Z0-9]{4}-[A-Z0-9]{4}$/);

  // B: 팀원이 아니면 프로젝트가 없는 것처럼 404
  const b = await browser.newContext({ storageState: USER_B });
  const bp = await b.newPage();
  expect((await bp.goto(`/p/${id}`))?.status()).toBe(404);
  expect((await bp.request.post(`/api/projects/${id}/meetings`, { data: {} })).status()).toBe(404);

  // B: 틀린 코드
  await bp.goto("/join/SQD-2222-2222");
  await expect(bp.getByRole("heading", { name: "초대 코드가 맞지 않아요" })).toBeVisible();

  // B: 초대 링크 → 확인 메시지 보내기 → 승인 대기
  await bp.goto(`/join/${inviteCode}`);
  await expect(bp.getByRole("heading", { name: "프로젝트에 참여하기" })).toBeVisible();
  await bp.getByLabel("팀장에게 보낼 확인 메시지").fill("3조 김치우입니다");
  await bp.getByRole("button", { name: "참여 요청 보내기" }).click();
  await expect(bp.getByRole("heading", { name: "팀장의 수락을 기다리고 있어요" })).toBeVisible();

  // A: 대시보드에서 요청을 보고 수락
  await page.goto(`/p/${id}`);
  await expect(page.getByRole("heading", { name: "참여 요청 1건" })).toBeVisible();
  await expect(page.getByText("“3조 김치우입니다”")).toBeVisible();
  // B는 팀장이 아니라 수락할 수 없음
  const reqId = await (async () => {
    const r = await bp.request.post(`/api/join/${inviteCode}`, { data: { message: "다시" } });
    return ((await r.json()) as { id: string }).id;
  })();
  expect((await bp.request.post(`/api/join-requests/${reqId}/approve`)).status()).toBe(404);
  await page.getByRole("button", { name: "수락" }).click();
  await expect(page.getByRole("heading", { name: "참여 요청 1건" })).toHaveCount(0);

  // B: 자동 새로고침으로 이름 고르기 화면 → 미리 넣은 "김치우" 고르기 → 대시보드
  await expect(bp.getByRole("heading", { name: "수락됐어요" })).toBeVisible({ timeout: 10_000 });
  await expect(bp.getByRole("radio", { name: "김치우" })).toBeChecked();
  await bp.getByLabel("맡은 일").fill("백엔드");
  await bp.getByRole("button", { name: "팀에 들어가기" }).click();
  await expect(bp).toHaveURL(`/p/${id}`);
  // B는 팀원이지만 팀장 도구(팀원 초대·Notion 연결)는 보이지 않음
  await expect(bp.getByRole("button", { name: "회의 기록 추가" })).toBeVisible();
  await expect(bp.getByRole("button", { name: "팀원 초대" })).toHaveCount(0);
  await expect(bp.getByRole("heading", { name: "Notion 연결" })).toHaveCount(0);

  // 메인 "내 프로젝트"에 팀원으로 보임
  await bp.goto("/");
  await expect(bp.getByRole("link", { name: /e2e 참여 흐름/ })).toContainText("팀원");
  await b.close();

  // A: 초대 코드 새로 만들면 이전 코드는 무효
  await page.goto(`/p/${id}`);
  await page.getByRole("button", { name: "팀원 초대" }).click();
  await page.getByRole("button", { name: "새 초대 코드 만들기" }).click();
  await expect(page.getByText("새 초대 링크를 팀원에게 보내 주세요.")).toBeVisible();
  await page.goto(`/join/${inviteCode}`);
  await expect(page.getByRole("heading", { name: "초대 코드가 맞지 않아요" })).toBeVisible();
});
