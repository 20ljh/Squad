import { expect, test } from "@playwright/test";

// 화면끼리 이어지는지: 메인 → 프로젝트 메인(대시보드) → 회의 결과 → 다시 프로젝트 메인
test.describe("화면 연결", () => {
  test("메인에서 샘플 프로젝트를 거쳐 회의 결과까지 이동한다", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.getByRole("link", { name: "샘플 프로젝트 보기" }).click();
    await expect(page).toHaveURL("/p/sample");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("프로젝트 진행 현황");

    // 회의 기록에서 결과가 있는 회의만 링크
    await page.getByRole("link", { name: "3차 정기회의" }).click();
    await expect(page).toHaveURL("/p/sample/meetings/m3");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("3차 정기회의 결과");

    await page.getByRole("link", { name: "팀 대시보드" }).click();
    await expect(page).toHaveURL("/p/sample");
  });

  test("회의 결과는 요약·녹음·원문 탭으로 나뉜다 (녹음이 없는 예시 회의)", async ({ page }) => {
    await page.goto("/p/sample/meetings/m3");
    await expect(page.getByRole("tab", { name: "요약" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("heading", { name: "안건별 논의와 결정" })).toBeVisible();
    await page.getByRole("tab", { name: "녹음·원문" }).click();
    await expect(page).toHaveURL(/#transcript$/);
    await expect(page.getByRole("heading", { name: "안건별 논의와 결정" })).toBeHidden();
    await expect(page.getByText("이 회의에는 녹음과 원문이 없어요.", { exact: false })).toBeVisible();
    // 키보드: 왼쪽 화살표로 요약 탭
    await page.keyboard.press("ArrowLeft");
    await expect(page.getByRole("tab", { name: "요약" })).toHaveAttribute("aria-selected", "true");
  });

  test("결과가 없는 회의는 링크가 아니다", async ({ page }) => {
    await page.goto("/p/sample");
    await expect(page.getByRole("link", { name: "1차 정기회의" })).toHaveCount(0);
    await expect(page.getByText("1차 정기회의")).toBeVisible();
  });

  test("없는 프로젝트·회의 주소는 404", async ({ page }) => {
    expect((await page.goto("/p/nope"))?.status()).toBe(404);
    expect((await page.goto("/p/sample/meetings/nope"))?.status()).toBe(404);
    expect((await page.goto("/p/nope/meetings/m3"))?.status()).toBe(404);
  });

  test("예전 예시 주소는 새 주소로 넘어간다", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/p/sample");
    await page.goto("/meetings/sample");
    await expect(page).toHaveURL("/p/sample/meetings/m3");
    await page.goto("/p/sample/meetings/stt-test");
    await expect(page).toHaveURL("/p/rec-test/meetings/stt-test");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("발표 역할·일정 회의 결과");
  });
});
