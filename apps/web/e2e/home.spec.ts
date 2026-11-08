import { expect, test } from "@playwright/test";

// 메인(/) 초대 코드 입력 동작
test.describe("메인 · 초대 코드로 참여", () => {
  test("빈 값으로 누르면 안내 문구가 보인다", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "참여" }).click();
    await expect(page.getByText("초대 코드를 입력해 주세요.")).toBeVisible();
    await expect(page).toHaveURL("/");
  });

  test("형식이 틀린 코드는 막는다", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/팀장에게 받은 코드/).fill("코드 12");
    await page.getByRole("button", { name: "참여" }).click();
    await expect(page.getByText(/영문·숫자·하이픈/)).toBeVisible();
  });

  test("올바른 코드는 대문자로 바꿔 참여 요청 주소로 이동한다", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel(/팀장에게 받은 코드/).fill(" sqd-7k4p ");
    await page.getByRole("button", { name: "참여" }).click();
    await expect(page).toHaveURL("/join/SQD-7K4P");
  });
});
