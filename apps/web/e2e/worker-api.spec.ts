import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

// STT 워커 API 흐름을 GPU 없이 확인: 테스트가 워커 역할을 함
// 할 일 가져가기 → 녹음 내려받기 → 받아쓴 문장 올리기(화면에 실시간) → 최종 결과 → "화자 확인" 단계
// 실제로 DB에 저장됨. "e2e "로 시작하는 프로젝트는 npm run db:seed 가 지움

function workerToken(): string {
  const env = readFileSync(path.resolve(__dirname, "../.env"), "utf8");
  return env.match(/^WORKER_TOKEN=(.+)$/m)?.[1].trim() ?? "";
}

test("워커가 가져가 처리하면 회의 페이지가 실시간 줄 → 화자 확인으로 바뀐다", async ({ page, request }) => {
  const auth = { authorization: `Bearer ${workerToken()}` };
  const audio = Buffer.from("RIFF e2e worker test audio");

  const proj = await (await request.post("/api/projects", { data: { name: "e2e 워커 API", course: "", leader: "이주형", members: ["김치우"] } })).json();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/p/${proj.id}`);
  await page.getByRole("button", { name: "회의 기록 추가" }).click();
  const d = page.getByRole("dialog");
  await d.getByLabel("시작 시각").fill("13:50");
  await d.getByLabel("방식").fill("대면");
  await d.getByRole("button", { name: "회의 페이지 만들기" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "회의.wav", mimeType: "audio/wav", buffer: audio });
  await page.getByRole("button", { name: "녹음 올리고 정리 시작" }).click();
  await expect(page.getByText("받아쓰기를 기다리고 있어요")).toBeVisible();
  const meetingId = page.url().split("/").pop()!;

  // 1) 가져가기 (키 없으면 401)
  expect((await request.post("/api/worker/claim")).status()).toBe(401);
  // 다른 테스트가 동시에 올린 녹음을 가져가지 않게 이 회의만 지정
  const claim = await request.post("/api/worker/claim", { headers: auth, data: { meetingId } });
  expect(claim.status()).toBe(200);
  const job = await claim.json();
  expect(job.meetingId).toBe(meetingId);
  expect(job.speakerCount).toBe(2);
  // 같은 작업은 다른 워커가 다시 가져가지 않음
  expect((await request.post("/api/worker/claim", { headers: auth, data: { meetingId } })).status()).toBe(204);

  // 2) 녹음 내려받기 = 올린 내용 그대로
  const dl = await request.get(`/api/worker/jobs/${meetingId}/audio?audioPath=${encodeURIComponent(job.audioPath)}`, { headers: auth });
  expect(Buffer.from(await dl.body()).equals(audio)).toBe(true);

  // 3) 받아쓴 문장 올리기 → 화면에 실시간으로
  const seg = await request.post(`/api/worker/jobs/${meetingId}/segments`, {
    headers: auth,
    data: { audioPath: job.audioPath, durationSec: 60, segments: [{ start: 6, end: 9, text: "저희 이제 역할 나눠야 될 거 같아요." }] },
  });
  expect(seg.status()).toBe(200);
  await expect(page.getByText("저희 이제 역할 나눠야 될 거 같아요.")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("녹음을 받아쓰고 있어요")).toBeVisible();

  // 4) 최종 결과 → 화자 확인 단계, 시간은 시작 + 녹음 길이
  const res = await request.post(`/api/worker/jobs/${meetingId}/result`, {
    headers: auth,
    data: {
      audioPath: job.audioPath,
      durationSec: 60,
      utterances: [
        { speaker: "화자1", start: 6, end: 9, text: "저희 이제 역할 나눠야 될 거 같아요." },
        { speaker: "화자2", start: 10, end: 12, text: "제가 2차를 할게요." },
      ],
    },
  });
  expect(res.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "누가 말했는지 확인해 주세요" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("13:50–13:51")).toBeVisible();
  await expect(page.getByText("참석 (2/2)")).toBeVisible();

  // 화자 확인 화면: 화자마다 대표 발화 + 참석자 중 고르기. 안 고르고 누르면 안내
  // (실제로 "요약 시작"을 누르면 유료 LLM을 부르므로 테스트에서는 누르지 않음 — CLAUDE.md 11절)
  await expect(page.getByRole("heading", { name: "화자1", level: 3 })).toBeVisible();
  await expect(page.getByText("“제가 2차를 할게요.”")).toBeVisible();
  await page.getByRole("button", { name: "확인하고 요약 시작" }).click();
  await expect(page.getByText(/모르면 "모르겠음"을 고르면 돼요/)).toBeVisible();
  await page.getByRole("group", { name: "화자1은(는) 누구인가요?" }).getByRole("radio", { name: "이주형" }).check({ force: true });
  await expect(page.getByRole("group", { name: "화자1은(는) 누구인가요?" }).getByRole("radio", { name: "이주형" })).toBeChecked();
  // 화자를 다 고르지 않았거나 다른 프로젝트 팀원 id면 서버도 거절 (요약을 시작하지 않음)
  expect((await request.post(`/api/meetings/${meetingId}/speakers`, { data: { mapping: {} } })).status()).toBe(400);

  // 끝난 작업에 다시 결과를 올리면 거절
  const again = await request.post(`/api/worker/jobs/${meetingId}/segments`, { headers: auth, data: { audioPath: job.audioPath, segments: [] } });
  expect(again.status()).toBe(409);
});

// 요약 워커 API: 키가 있어야 하고, 요약할 상태가 아닌 회의는 가져가거나 저장할 수 없음 (실제 Claude 호출은 하지 않음)
test("요약 워커 API는 키가 필요하고, 요약 중이 아닌 회의는 거절한다", async ({ request }) => {
  const auth = { authorization: `Bearer ${workerToken()}` };
  expect((await request.post("/api/worker/summary/claim", { data: {} })).status()).toBe(401);
  // 예시 회의 m3는 이미 정리 완료 → 가져갈 것 없음, 결과를 올려도 409
  expect((await request.post("/api/worker/summary/claim", { headers: auth, data: { meetingId: "m3" } })).status()).toBe(204);
  const res = await request.post("/api/worker/summary/m3/result", { headers: auth, data: { text: "{}" } });
  expect([409, 422]).toContain(res.status());
});
