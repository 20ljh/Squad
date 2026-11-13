import { expect, test } from "@playwright/test";

// 기본 프로젝트 설정(/projects/new) 입력 동작
test.describe("프로젝트 만들기 · 기본 설정", () => {
  test("필수 칸을 비우고 만들면 칸마다 안내가 보인다", async ({ page }) => {
    await page.goto("/projects/new");
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

  test("필수 칸을 채우면 복구 코드 팝업: 주의 → 코드 → 적어 뒀어요 체크 후 확인 → DB에 저장되고 프로젝트 메인으로", async ({ page }) => {
    await page.goto("/projects/new");
    // 실제로 DB에 저장됨. "e2e "로 시작하는 프로젝트는 npm run db:seed 가 지움
    await page.getByLabel(/프로젝트 이름/).fill("e2e 시험 프로젝트");
    await page.getByLabel(/내 이름/).fill("하은");
    await page.getByLabel(/팀원 이름/).fill("민수");
    await page.getByLabel(/팀원 이름/).press("Enter");
    // 최종 마감일: 오늘부터 30일 뒤 → 대시보드 소제목 "최종 마감까지 D-30"
    const d = new Date(Date.now() + 30 * 86_400_000);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    await page.getByLabel(/최종 마감일/).fill(iso);
    await page.getByRole("button", { name: "프로젝트 만들기" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "복구 코드를 꼭 보관해 주세요" })).toBeVisible();
    await dialog.getByRole("button", { name: "확인하고 코드 보기" }).click();

    await expect(dialog.getByRole("heading", { name: "복구 코드" })).toBeVisible();
    await expect(dialog.getByText(/^[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/)).toBeVisible();

    // 코드 단계에서는 Esc로 닫히지 않음
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();

    const done = dialog.getByRole("button", { name: "확인", exact: true });
    await expect(done).toBeDisabled();
    await dialog.getByLabel("복구 코드를 안전한 곳에 적어 뒀어요").check();
    await done.click();
    await expect(dialog).toBeHidden();

    // 만든 프로젝트의 팀 대시보드로 이동: 예시 대시보드와 같은 구성, 숫자는 0·목록은 빈 상태
    await expect(page).toHaveURL(/\/p\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("프로젝트 진행 현황");
    await expect(page.getByText("e2e 시험 프로젝트", { exact: true })).toBeVisible();
    // 회의가 없으면 앞부분("n회차 회의 진행")은 빠지고, 가장 가까운 일정(최종 마감)만
    await expect(page.getByText("최종 마감까지 D-30", { exact: true })).toBeVisible();
    await expect(page.getByText("0회", { exact: true })).toBeVisible();
    await expect(page.getByText("하은", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "회의 기록 추가" })).toBeVisible();
  });

  test("지난 날짜를 최종 마감일로 고르면 안내가 보인다", async ({ page }) => {
    await page.goto("/projects/new");
    await page.getByLabel(/프로젝트 이름/).fill("마켓셰이프");
    await page.getByLabel(/내 이름/).fill("하은");
    await page.getByLabel(/최종 마감일/).fill("2020-01-01");
    await page.getByRole("button", { name: "프로젝트 만들기" }).click();
    await expect(page.getByText("최종 마감일은 오늘이거나 이후 날짜로 골라 주세요.")).toBeVisible();
    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("주의 단계에서는 돌아가기로 취소할 수 있다", async ({ page }) => {
    await page.goto("/projects/new");
    await page.getByLabel(/프로젝트 이름/).fill("마켓셰이프");
    await page.getByLabel(/내 이름/).fill("하은");
    await page.getByRole("button", { name: "프로젝트 만들기" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "돌아가기" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  });
});
