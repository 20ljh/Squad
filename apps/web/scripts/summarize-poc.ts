/**
 * 요약 시험: 화자가 붙은 회의 원문(.txt)을 LLM에 한 번 보내 결과 화면용 JSON을 받는다.
 *
 * 사용법 (apps/web 폴더에서):
 *   node --env-file=.env scripts/summarize-poc.ts ../../claude/samples/out/oss10_2_meeting-t0a.txt --date=2026-05-07 --effort=high
 *
 * - 결과는 원문 옆에 `<원문이름>.summary.json`으로 저장(응답 원본 + 토큰 사용량 포함).
 *   이미 있으면 다시 부르지 않음(유료 호출 방지). 다시 부르려면 --force
 * - 화자는 아직 팀원과 매핑 전이라 "화자1" 같은 라벨 그대로 귀속
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.LLM_MODEL ?? "claude-haiku-5-5";

const SYSTEM = `너는 대학 조별과제 팀의 회의를 정리하는 도우미다.
입력은 음성 인식(STT)으로 만든 회의 원문이고, 각 줄은 "[분:초] 화자N: 말" 형식이다.

원문에 대해 알아 둘 점
- 받아쓰기 오류가 섞여 있다. 비슷한 소리로 잘못 적힌 말은 문맥으로 바로잡아 이해하라.
- 앞뒤와 전혀 이어지지 않는 문장은 잘못 들은 것일 수 있으니 무시하라.
- 화자 구분도 가끔 틀린다. 문장이 화자 경계에서 잘려 있으면 앞뒤를 이어서 읽어라.

정리 규칙
- 원문에 근거가 있는 것만 쓴다. 담당자·마감·결정을 지어내지 마라.
- 안건은 회의에서 실제로 다룬 주제 단위로 나눈다(보통 2~5개).
- opinions: 안건마다 화자별 핵심 의견. quote는 원문 말투를 살려 오류만 고친 한두 문장, gist는 15자 이내 요지.
- decision: 그 안건에서 합의된 결론. 합의가 없으면 null. short는 14자 이내.
  owner는 "화자1" 같은 라벨, "전원", 또는 원문에 정해지지 않았으면 null.
  due는 원문에 나온 마감 표현 그대로(예: "일요일 자정", "다음 주 목요일(5월 14일)"), 없으면 null.
- actionItems: 누가 무엇을 언제까지 하기로 했는지. 결정과 겹쳐도 따로 적는다.
- schedules: 날짜나 기한이 나온 일정. dueText는 원문의 마감 표현 그대로.
  date는 회의 날짜(meetingDate)를 기준으로 하루로 정해지는 경우만 YYYY-MM-DD로 쓴다.
  예) "5월 14일", "이번 주 일요일", "다음 주 목요일"은 날짜로 바꾼다.
  "주말까지", "다음 회의 전", "빨리"처럼 어느 날인지 말하지 않았으면 추측하지 말고 null.
- shortTitle(안건)은 12자 이내, 회의 shortTitle은 8자 이내.
- 모든 문장은 한국어, 사용자에게 보여 줄 말투(~하기로 함, ~까지 공유)로 쓴다.
- corrections: 문맥으로 바로잡은 주요 받아쓰기 오류(원문 → 고친 말), 무시한 문장 포함. 최대 10개.`;

const nullableString = { type: ["string", "null"] } as const;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "shortTitle", "summary", "agenda", "actionItems", "schedules", "corrections"],
  properties: {
    title: { type: "string" },
    shortTitle: { type: "string" },
    summary: { type: "string", description: "회의 전체를 두세 문장으로" },
    agenda: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "shortTitle", "opinions", "decision"],
        properties: {
          title: { type: "string" },
          shortTitle: { type: "string" },
          opinions: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["speaker", "quote", "gist"],
              properties: {
                speaker: { type: "string" },
                quote: { type: "string" },
                gist: { type: "string" },
              },
            },
          },
          decision: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                required: ["text", "short", "owner", "due"],
                properties: {
                  text: { type: "string" },
                  short: { type: "string" },
                  owner: nullableString,
                  due: nullableString,
                },
              },
            ],
          },
        },
      },
    },
    actionItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "owner", "due"],
        properties: { title: { type: "string" }, owner: nullableString, due: nullableString },
      },
    },
    schedules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "date", "dueText", "owner"],
        properties: {
          label: { type: "string" },
          date: nullableString,
          dueText: { type: "string" },
          owner: nullableString,
        },
      },
    },
    corrections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heard", "meant"],
        properties: { heard: { type: "string" }, meant: { type: "string" } },
      },
    },
  },
} as const;

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const input = args.find((a) => !a.startsWith("--"));
  if (!input) {
    console.error("사용법: node --env-file=.env scripts/summarize-poc.ts <원문.txt> --date=YYYY-MM-DD [--effort=high] [--force]");
    process.exit(1);
  }
  // 노력 단계: 기본(medium)은 지정하지 않고, --effort=high 처럼 주면 결과 파일 이름에도 붙임
  const effortArg = args.find((a) => a.startsWith("--effort="))?.split("=")[1];
  const effort = effortArg === "low" || effortArg === "high" ? effortArg : undefined;
  const out = input.replace(/\.txt$/, "") + (effort ? `.summary-${effort}.json` : ".summary.json");
  if (existsSync(out) && !force) {
    console.log(`이미 결과가 있어 다시 부르지 않았어요: ${out} (다시 부르려면 --force)`);
    return;
  }

  const transcript = readFileSync(input, "utf-8").trim();
  const speakers = new Set(transcript.match(/화자\d+/g) ?? []);
  // 회의 날짜: 실제 서비스에선 회의를 만들 때 받는 값. 시험에선 --date=YYYY-MM-DD (녹음 파일의 기록 시각)
  const meetingDate = args.find((a) => a.startsWith("--date="))?.split("=")[1];
  if (!meetingDate || !/^\d{4}-\d{2}-\d{2}$/.test(meetingDate)) {
    console.error("회의 날짜를 --date=YYYY-MM-DD 로 알려 주세요");
    process.exit(1);
  }
  const weekday = "일월화수목금토"[new Date(`${meetingDate}T00:00:00Z`).getUTCDay()];
  const userText =
    `meetingDate: ${meetingDate} (${weekday}요일)\n화자 수: ${speakers.size}명 (팀원 매핑 전)\n\n<transcript>\n${transcript}\n</transcript>`;

  const client = new Anthropic();
  const started = Date.now();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: "user", content: userText }],
    output_config: { format: { type: "json_schema", schema: SCHEMA }, ...(effort ? { effort } : {}) },
  });
  const seconds = (Date.now() - started) / 1000;

  if (response.stop_reason !== "end_turn") {
    console.error(`응답이 정상적으로 끝나지 않았어요: stop_reason=${response.stop_reason}`);
  }
  const text = response.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
  const parsed: unknown = JSON.parse(text);

  writeFileSync(
    out,
    JSON.stringify(
      { model: response.model, seconds, usage: response.usage, stopReason: response.stop_reason, result: parsed },
      null,
      2,
    ),
    "utf-8",
  );
  console.log(`저장: ${out}`);
  console.log(`시간 ${seconds.toFixed(1)}초 · 입력 ${response.usage.input_tokens}토큰 · 출력 ${response.usage.output_tokens}토큰`);
}

main().catch((err: unknown) => {
  if (err instanceof Anthropic.APIError) {
    console.error(`API 오류 ${err.status}: ${err.message}`);
  } else {
    console.error(err);
  }
  process.exit(1);
});
