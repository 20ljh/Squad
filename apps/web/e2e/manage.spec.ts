import { expect, test } from "@playwright/test";
import { USER_B } from "./auth.setup";

// 팀장의 "팀 대시보드 관리": 맡은 일 고치기, 팀원 삭제, 프로젝트 삭제. 팀장이 아니면 막힘

test("팀장은 팀원의 맡은 일을 고치고, 팀원과 프로젝트를 삭제할 수 있다", async ({ page, browser }) => {
  const created = await page.request.post("/api/projects", { data: { name: "e2e 관리", leader: "이주형", members: ["김치우", "강금상"] } });
  const { id } = (await created.json()) as { id: string };

  // 팀원이 아니면 프로젝트 삭제 404
  const b = await browser.newContext({ storageState: USER_B });
  expect((await (await b.newPage()).request.delete(`/api/projects/${id}`)).status()).toBe(404);
  await b.close();

  await page.goto(`/p/${id}`);
  await page.getByRole("button", { name: "팀 대시보드 관리" }).click();
  const dlg = page.getByRole("dialog", { name: "팀 대시보드 관리" });
  await expect(dlg.getByText("팀원 3명")).toBeVisible();

  // 맡은 일 고치기 → 저장 → 대시보드 참여 표에 반영
  await dlg.getByLabel("김치우 맡은 일").fill("백엔드");
  await Promise.all([page.waitForResponse((r) => r.url().includes("/api/members/") && r.ok()), dlg.getByLabel("김치우 맡은 일").press("Enter")]);
  await expect(dlg.getByRole("button", { name: "저장됨" })).toBeVisible();

  // 팀장 자신은 삭제 버튼이 없음 (팀원 2명만)
  await expect(dlg.getByRole("button", { name: "삭제", exact: true })).toHaveCount(2);

  // 팀원 삭제: 확인 팝업 → 삭제
  await dlg.getByRole("listitem").filter({ hasText: "강금상" }).getByRole("button", { name: "삭제", exact: true }).click();
  const confirm = page.getByRole("dialog", { name: "정말 삭제할까요?" });
  await expect(confirm.getByText("강금상 팀원을 삭제하면")).toBeVisible();
  await confirm.getByRole("button", { name: "팀원 삭제" }).click();
  await expect(dlg.getByText("팀원 2명")).toBeVisible();

  // 프로젝트 삭제 → 메인으로, 프로젝트 주소는 404
  await dlg.getByRole("button", { name: "프로젝트 삭제" }).click();
  await expect(confirm.getByText("포함된 회의와 요약도 함께 삭제돼요.")).toBeVisible();
  await confirm.getByRole("button", { name: "프로젝트 삭제" }).click();
  await expect(page).toHaveURL("/");
  expect((await page.goto(`/p/${id}`))?.status()).toBe(404);
});

test("예시 프로젝트에는 팀 대시보드 관리 버튼이 없다", async ({ page }) => {
  await page.goto("/p/sample");
  await expect(page.getByRole("button", { name: "팀 대시보드 관리" })).toHaveCount(0);
});
