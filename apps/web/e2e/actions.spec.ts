import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { USER_B, loadEnv } from "./auth.setup";

// 회의 결과의 "할 일" 체크와 의견 ☆(하이라이트) → 대시보드에 반영되는지
// 요약(유료 LLM)을 부르지 않으려고, 정리가 끝난 회의를 DB에 직접 넣어 씀. "e2e "로 시작하는 프로젝트는 시드가 지움

test("할 일을 체크하고 의견을 하이라이트에 올리면 대시보드가 바뀐다", async ({ page, browser }) => {
  // 사용자 A가 프로젝트를 만듦 (팀장)
  const created = await page.request.post("/api/projects", { data: { name: "e2e 할 일·하이라이트", leader: "이주형", members: ["김치우"] } });
  const { id: projectId } = (await created.json()) as { id: string };

  loadEnv();
  const db = new PrismaClient();
  let meetingId: string;
  try {
    const members = await db.member.findMany({ where: { projectId }, orderBy: { order: "asc" } });
    const [lee, kim] = members;
    const soon = new Date(Date.now() + 2 * 86_400_000);
    const m = await db.meeting.create({
      data: {
        projectId,
        title: "1차 회의 결과",
        shortTitle: "1차 회의",
        startedAt: new Date(),
        mode: "대면",
        status: "done",
        attendances: { create: members.map((x) => ({ memberId: x.id, present: true })) },
        agendaItems: {
          create: [
            {
              order: 1,
              title: "발표 역할 나누기",
              shortTitle: "발표 역할",
              opinions: { create: [{ order: 0, memberId: lee.id, quote: "발표는 제가 맡을게요.", gist: "발표 담당" }] },
              actionItems: { create: [{ title: "발표 자료 초안 만들기", memberId: kim.id, dueDate: soon }] },
            },
          ],
        },
      },
    });
    meetingId = m.id;
  } finally {
    await db.$disconnect();
  }

  // 대시보드: 진행중 1건, 하이라이트 없음
  await page.goto(`/p/${projectId}`);
  await expect(page.getByText("1건").first()).toBeVisible();
  await expect(page.getByText("아직 하이라이트가 없어요", { exact: false })).toBeVisible();

  // 회의 결과: 할 일 칸 → 체크
  await page.goto(`/p/${projectId}/meetings/${meetingId}`);
  await expect(page.getByRole("heading", { name: "할 일" })).toBeVisible();
  const box = page.getByRole("checkbox", { name: /발표 자료 초안 만들기/ });
  await expect(box).not.toBeChecked();
  // 화면은 먼저 바뀌고 저장은 뒤따름 → 저장 응답까지 기다림
  await Promise.all([page.waitForResponse((r) => r.url().includes("/api/action-items/") && r.ok()), box.check()]);
  await expect(page.getByText("모두 끝냈어요")).toBeVisible();

  // 의견 ☆ → 하이라이트
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/opinions/") && r.ok()),
    page.getByRole("button", { name: "대시보드 하이라이트에 올리기" }).click(),
  ]);
  await expect(page.getByRole("button", { name: "하이라이트에서 내리기" })).toHaveAttribute("aria-pressed", "true");

  // 대시보드에 반영: 진행중 0건, 하이라이트에 인용구
  await page.goto(`/p/${projectId}`);
  await expect(page.getByText("“발표는 제가 맡을게요.”")).toBeVisible();
  await expect(page.getByText("1차 회의 · 발표 역할")).toBeVisible();
  // 할 일을 끝냈으니 다음 일정에서도 빠짐
  await expect(page.getByText("발표 자료 초안 만들기까지", { exact: false })).toHaveCount(0);

  // 팀원이 아니면 체크·☆ API 모두 404
  const b = await browser.newContext({ storageState: USER_B });
  const bp = await b.newPage();
  const actionId = await (async () => {
    const db2 = new PrismaClient();
    try {
      return (await db2.actionItem.findFirstOrThrow({ where: { agendaItem: { meetingId } } })).id;
    } finally {
      await db2.$disconnect();
    }
  })();
  expect((await bp.request.patch(`/api/action-items/${actionId}`, { data: { done: false } })).status()).toBe(404);
  await b.close();
});

test("예시 회의는 할 일·☆을 바꿀 수 없다 (로그인 없이 보기만)", async ({ browser }) => {
  const ctx = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  await page.goto("/p/sample/meetings/m3");
  await expect(page.getByRole("button", { name: "대시보드 하이라이트에 올리기" })).toHaveCount(0);
  await ctx.close();
});
