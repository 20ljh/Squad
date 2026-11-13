import { defineConfig, devices } from "@playwright/test";

// 화면 점검용 Playwright 설정.
// 실행: npm run test:e2e (개발 서버가 떠 있으면 재사용, 없으면 자동으로 띄움)
export default defineConfig({
  testDir: "./e2e",
  // 시험용 로그인 사용자 만들기 (e2e/auth.setup.ts). 기본은 사용자 A로 로그인한 상태
  globalSetup: "./e2e/auth.setup.ts",
  outputDir: "./test-results",
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    ...devices["Desktop Chrome"],
    // 등장 애니메이션(fade-up) 도중에 찍히면 화면이 흐리게 나오므로 끔 (globals.css가 이 설정을 따름)
    reducedMotion: "reduce",
    storageState: "./.e2e-auth/a.json",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
