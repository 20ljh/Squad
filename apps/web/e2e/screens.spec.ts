import path from "node:path";
import { expect, test } from "@playwright/test";

// CLAUDE.md 14절의 화면 확인 규칙을 자동화한 테스트.
// - 각 화면을 1280px·390px로 띄워 전체 스크린샷을 남긴다
// - 390px에서 가로 스크롤(scrollWidth > 화면 너비)이 생기지 않는지 검사한다
//
// 스크린샷은 기본적으로 apps/web/screenshots/에 저장된다(커밋 안 함).
// 의도한 디자인 변경이라 기준 스크린샷을 갱신하려면:
//   UPDATE_SCREENS=1 npm run test:e2e   → docs/design/screens/에 덮어씀

const pages = [
  { name: "home", path: "/" },
  { name: "projects-new", path: "/projects/new" },
  { name: "meeting", path: "/meetings/sample" },
  { name: "dashboard", path: "/dashboard" },
] as const;

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
] as const;

const outDir = process.env.UPDATE_SCREENS
  ? path.resolve(__dirname, "../../../docs/design/screens")
  : path.resolve(__dirname, "../screenshots");

for (const p of pages) {
  for (const vp of viewports) {
    test(`${p.name} @ ${vp.width}px`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      const res = await page.goto(p.path);
      // 아직 만들지 않은(또는 저장소에 없는) 화면은 건너뜀
      test.skip(res?.status() === 404, `${p.path} 화면이 아직 없음`);
      // 웹폰트까지 로드된 뒤에 찍어야 기준 스크린샷과 비교가 의미 있음
      await page.evaluate(() => document.fonts.ready);

      await page.screenshot({
        path: path.join(outDir, `${p.name}-${vp.name}.png`),
        fullPage: true,
      });

      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth,
      );
      expect(scrollWidth, "페이지에 가로 스크롤이 생기면 안 됨").toBeLessThanOrEqual(
        vp.width,
      );
    });
  }
}
