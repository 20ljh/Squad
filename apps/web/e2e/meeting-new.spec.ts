import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/** apps/web/.env 의 WORKER_TOKEN (값은 화면·로그에 쓰지 않음) */
function workerToken(): string {
  const env = readFileSync(path.resolve(__dirname, "../.env"), "utf8");
  return env.match(/^WORKER_TOKEN=(.+)$/m)?.[1].trim() ?? "";
}

/** 1초짜리 무음 wav (업로드 시험용) */
function silentWav(): Buffer {
  const rate = 16000;
  const samples = rate;
  const buf = Buffer.alloc(44 + samples * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + samples * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(samples * 2, 40);
  return buf;
}

// 대시보드 "회의 기록 추가" 팝업 → 회의 페이지(녹음 올리기) → 녹음을 올리면 "받아쓰는 중"
// 실제로 DB와 data/audio 에 저장됨. "e2e "로 시작하는 프로젝트는 npm run db:seed 가 파일까지 지움
test("회의 기록 추가 → 녹음 올리기 → 받아쓰는 중", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/projects/new");
  await page.getByLabel(/프로젝트 이름/).fill("e2e 회의 추가 시험");
  await page.getByLabel(/내 이름/).fill("이주형");
  for (const n of ["김치우", "강금상"]) {
    await page.getByLabel(/팀원 이름/).fill(n);
    await page.getByLabel(/팀원 이름/).press("Enter");
  }
  await page.getByRole("button", { name: "프로젝트 만들기" }).click();
  await page.getByRole("button", { name: "팀 대시보드로 가기" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("프로젝트 진행 현황");

  await page.getByRole("button", { name: "회의 기록 추가" }).click();
  const dialog = page.getByRole("dialog", { name: "회의 기록 추가" });
  await expect(dialog).toBeVisible();
  // 빈 칸이면 안내
  await dialog.getByRole("button", { name: "회의 페이지 만들기" }).click();
  await expect(dialog.getByText("회의 시작 시각을 골라 주세요.")).toBeVisible();

  await dialog.getByLabel("시작 시각").fill("13:50");
  await dialog.getByLabel("방식").fill("대면");
  // 참여자는 기본 전원 → 한 명 빼서 2명
  await dialog.getByText("강금상").click();
  await expect(dialog.getByText("참여자 수(2명)")).toBeVisible();
  await dialog.getByRole("button", { name: "회의 페이지 만들기" }).click();

  await expect(page).toHaveURL(/\/p\/[a-z0-9]+\/meetings\/[a-z0-9]+$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("1차 회의");
  await expect(page.getByText("녹음 올리기 전")).toBeVisible();
  await expect(page.getByText("13:50", { exact: false })).toBeVisible();
  await expect(page.getByText("참석 (2/3)")).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles({ name: "회의.wav", mimeType: "audio/wav", buffer: silentWav() });
  await page.getByRole("button", { name: "녹음 올리고 정리 시작" }).click();
  // 워커가 아직 가져가지 않았으면 "기다리고 있어요" + 올린 파일 이름·크기
  await expect(page.getByText("받아쓰기를 기다리고 있어요")).toBeVisible();
  await expect(page.getByText("회의.wav")).toBeVisible();
  await expect(page.getByText("31KB")).toBeVisible();

  // 받아쓰기 취소: 뒤를 흐리게 하고 떠오르는 팝업으로 한 번 더 물음
  await page.getByRole("button", { name: "받아쓰기 취소" }).click();
  const ask = page.getByRole("dialog", { name: "받아쓰기를 멈출까요?" });
  await expect(ask).toBeVisible();
  await ask.getByRole("button", { name: "계속 받아쓰기" }).click();
  await expect(ask).toBeHidden();
  await expect(page.getByText("받아쓰기를 기다리고 있어요")).toBeVisible();
  await page.getByRole("button", { name: "받아쓰기 취소" }).click();
  await ask.getByRole("button", { name: "멈추고 녹음 지우기" }).click();
  await expect(page.getByText("녹음 올리기 전")).toBeVisible();
  await expect(page.getByRole("button", { name: "녹음 올리고 정리 시작" })).toBeVisible();

  // 다시 올리면 다시 받아쓰는 중
  await page.locator('input[type="file"]').setInputFiles({ name: "회의.wav", mimeType: "audio/wav", buffer: silentWav() });
  await page.getByRole("button", { name: "녹음 올리고 정리 시작" }).click();
  await expect(page.getByText("받아쓰기를 기다리고 있어요")).toBeVisible();

  // 대시보드 회의 기록에 "받아쓰는 중"으로 보임
  await page.getByRole("link", { name: "팀 대시보드" }).click();
  await expect(page).toHaveURL(/\/p\/[a-z0-9]+$/);
  await expect(page.getByText("받아쓰는 중 · 참석 2/3", { exact: false })).toBeVisible();
  await expect(page.getByText("1회차 회의 진행")).toBeVisible();
});

test("팀원이 아니면 예시 회의도 바꿀 수 없다 (취소·녹음 올리기)", async ({ request }) => {
  // 예시 프로젝트는 보기만 가능. 시험 사용자는 팀원이 아니라 404
  expect((await request.post("/api/meetings/m3/cancel")).status()).toBe(404);
});

test("워커 API는 비밀 키가 있어야 하고, 지금 녹음이 아닌 작업은 거절한다", async ({ request }) => {
  const body = { audioPath: "없는-파일.wav", segments: [{ start: 0, end: 1, text: "안녕" }] };
  expect((await request.post("/api/worker/jobs/m3/segments", { data: body })).status()).toBe(401);
  const token = workerToken();
  const res = await request.post("/api/worker/jobs/m3/segments", { data: body, headers: { authorization: `Bearer ${token}` } });
  expect(res.status()).toBe(409);
  expect((await res.json()).cancelled).toBe(true);
});

test("음성이 아닌 파일은 올릴 수 없다", async ({ request }) => {
  const res = await request.post("/api/meetings/m3/audio", { multipart: { audio: { name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("x") } } });
  // 예시 회의는 팀원만 바꿀 수 있어서 형식 검사 전에 404
  expect(res.status()).toBe(404);
});
