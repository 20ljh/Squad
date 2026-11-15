import { expect, test } from "@playwright/test";
import { pickDate } from "./pickers";

// 기본 프로젝트 설정(/projects/new) 입력 동작
test.describe("프로젝트 만들기 · 기본 설정", () => {
  test("필수 칸을 비우고 만들면 칸마다 안내가 보인다", async ({ page }) => {
    await page.goto("/projects/new");
    // 내 이름은 구글 이름으로 미리 채워짐 → 지우고 확인
    await expect(page.getByLabel(/내 이름/)).toHaveValue("이주형");
    await page.getByLabel(/내 이름/).fill("");
    await page.getByRole("button", { name: "프로젝트 만들기" }).click();
    await expect(page.getByText("프로젝트 이름을 입력해 주세요.")).toBeVisible();
    await expect(page.getByText("팀장인 내 이름을 입력해 주세요.")).toBeVisible();
  });

  test("팀원을 Enter로 추가하고, 같은 이름은 막고, 뺄 수 있다", async ({ page }) => {
    await page.goto("/projects/new");
    const input = page.getByLabel(/팀원 이름/);
    await input.fill("지현");
    await input.press("Enter");
    await expect(page.getByRole("button", { name: "지현 빼기" })).toBeVisible();

    await input.fill("지현");
    await page.getByRole("button", { name: "추가", exact: true }).click();
    await expect(page.getByText("'지현'은(는) 이미 들어 있어요.")).toBeVisible();

    await page.getByRole("button", { name: "지현 빼기" }).click();
    await expect(page.getByRole("button", { name: "지현 빼기" })).toHaveCount(0);
  });

  test("필수 칸을 채우고 만들면 DB에 저장되고, 초대 코드를 보여 준 뒤 팀 대시보드로 이동한다", async ({ page }) => {
    await page.goto("/projects/new");
    // 실제로 DB에 저장됨. "e2e "로 시작하는 프로젝트는 npm run db:seed 가 지움
    await page.getByLabel(/프로젝트 이름/).fill("e2e 시험 프로젝트");
    await page.getByLabel(/내 이름/).fill("하은");
    await page.getByLabel(/팀원 이름/).fill("민수");
    await page.getByLabel(/팀원 이름/).press("Enter");
    // 최종 마감일: 오늘부터 30일 뒤 → 대시보드 소제목 "최종 마감까지 D-30"
    const d = new Date(Date.now() + 30 * 86_400_000);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    await pickDate(page, /최종 마감일/, iso);
    await page.getByRole("button", { name: "프로젝트 만들기" }).click();

    // 초대 링크·코드 공유 (코드 원문은 여기서 한 번만)
    await expect(page.getByRole("heading", { name: "프로젝트를 만들었어요" })).toBeVisible();
    await expect(page.getByText(/^SQD-[A-Z0-9]{4}-[A-Z0-9]{4}$/)).toBeVisible();
    await page.getByRole("button", { name: "팀 대시보드로 가기" }).click();

    // 만든 프로젝트의 팀 대시보드로 이동: 예시 대시보드와 같은 구성, 숫자는 0·목록은 빈 상태
    await expect(page).toHaveURL(/\/p\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("프로젝트 진행 현황");
    await expect(page.getByText("e2e 시험 프로젝트", { exact: true })).toBeVisible();
    // 회의가 없으면 앞부분("n회차 회의 진행")은 빠지고, 가장 가까운 일정(최종 마감)만
    await expect(page.getByText("최종 마감까지 D-30", { exact: true })).toBeVisible();
    await expect(page.getByText("0회", { exact: true })).toBeVisible();
    await expect(page.getByText("하은", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "회의 기록 추가" })).toBeVisible();
    // 팀장 도구
    await expect(page.getByRole("button", { name: "팀원 초대" })).toBeVisible();
    await expect(page.getByText("아직 Notion이 연결되지 않았어요")).toBeVisible();
  });

  test("최종 마감일 달력에서 지난 날짜는 고를 수 없고, 고른 날짜는 지울 수 있다", async ({ page }) => {
    await page.goto("/projects/new");
    await page.getByLabel(/최종 마감일/).click();
    const cal = page.getByRole("dialog", { name: "날짜 고르기" });
    await expect(cal.getByRole("button", { name: "이전 달" })).toBeDisabled();
    const d = new Date(Date.now() - 86_400_000);
    if (d.getMonth() === new Date().getMonth()) {
      await expect(cal.getByRole("button", { name: new RegExp(`^${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 `) })).toBeDisabled();
    }
    await page.keyboard.press("Escape");
    const t = new Date(Date.now() + 7 * 86_400_000);
    const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
    await pickDate(page, /최종 마감일/, iso);
    await expect(page.getByLabel(/최종 마감일/)).toContainText(iso.replace(/-/g, "."));
    await page.getByLabel(/최종 마감일/).click();
    await page.getByRole("button", { name: "지우기" }).click();
    await expect(page.getByLabel(/최종 마감일/)).toContainText("정하지 않음");
  });
});
