import { expect, type Locator, type Page } from "@playwright/test";

// 달력(날짜)·휠(시각) 고르기 도우미. 실제 사용자처럼 칸을 눌러 열고 고름

/** 날짜 칸을 열고 iso("YYYY-MM-DD")가 있는 달까지 넘긴 뒤 그날을 누름 */
export async function pickDate(scope: Page | Locator, label: string | RegExp, iso: string) {
  await scope.getByLabel(label).click();
  const cal = scope.getByRole("dialog", { name: "날짜 고르기" });
  const [y, m, d] = iso.split("-").map(Number);
  const day = cal.getByRole("button", { name: new RegExp(`^${y}년 ${m}월 ${d}일 `) });
  for (let i = 0; i < 40 && !(await day.count()); i++) {
    await cal.getByRole("button", { name: "다음 달" }).click();
  }
  await day.click();
  await expect(cal).toHaveCount(0);
}

/** 시각 칸을 열고 휠에서 시·분을 눌러 고른 뒤 확인 ("13:50") */
export async function pickTime(scope: Page | Locator, label: string | RegExp, hhmm: string) {
  await scope.getByLabel(label).click();
  const panel = scope.getByRole("dialog", { name: "시각 고르기" });
  const [h, mm] = hhmm.split(":");
  await panel.getByRole("listbox", { name: "시" }).getByRole("option", { name: `${h}시` }).click();
  await panel.getByRole("listbox", { name: "분" }).getByRole("option", { name: `${mm}분` }).click();
  await panel.getByRole("button", { name: "확인" }).click();
  await expect(scope.getByLabel(label)).toContainText(hhmm);
}
