import Anthropic from "@anthropic-ai/sdk";
import { db } from "../db";

// 회의 요약: 화자 매핑이 끝난 원문을 LLM에 한 번 보내 안건·의견·결정·일정·할 일을 받아 DB에 저장
// 시험(apps/web/scripts/summarize-poc.ts)에서 정한 대로 Haiku 5.5 + 노력 단계 high + JSON 스키마 강제 (회의 1건 약 7원)
// 결과는 DB에 저장해 다시 부르지 않음 (CLAUDE.md 11절). 파싱에 실패하면 1번만 다시 시도

const MODEL = process.env.LLM_MODEL ?? "claude-haiku-5-5";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 마인드맵 칸에 맞춘 글자 수 (모델이 가끔 넘어서 저장할 때 자름)
const LIMIT = { shortTitle: 12, gist: 15, decisionShort: 14 };

const SYSTEM = `너는 대학 조별과제 팀의 회의를 정리하는 도우미다.
입력은 음성 인식(STT)으로 만든 회의 원문이고, 각 줄은 "[분:초] 이름: 말" 형식이다.

원문에 대해 알아 둘 점
- 받아쓰기 오류가 섞여 있다. 비슷한 소리로 잘못 적힌 말은 문맥으로 바로잡아 이해하라.
- 앞뒤와 전혀 이어지지 않는 문장은 잘못 들은 것일 수 있으니 무시하라.
- 말한 사람 구분도 가끔 틀린다. 문장이 사람 경계에서 잘려 있으면 앞뒤를 이어서 읽어라.

정리 규칙
- 원문에 근거가 있는 것만 쓴다. 담당자·마감·결정을 지어내지 마라.
- 안건은 회의에서 실제로 다룬 주제 단위로 나눈다(보통 2~5개).
- opinions: 안건마다 사람별 핵심 의견. speaker는 원문에 나온 이름을 그대로 쓴다.
  quote는 원문 말투를 살려 오류만 고친 한두 문장, gist는 15자 이내 요지.
- decision: 그 안건에서 합의된 결론. 합의가 없으면 null. short는 14자 이내.
  owner는 원문에 나온 이름, "전원", 또는 정해지지 않았으면 null.
- 마감·일정의 날짜(dueDate, date)는 회의 날짜(meetingDate)를 기준으로 하루로 정해질 때만 YYYY-MM-DD로 쓴다.
  예) "5월 14일", "이번 주 일요일", "다음 주 목요일"은 날짜로 바꾼다.
  "주말까지", "다음 회의 전", "빨리"처럼 어느 날인지 말하지 않았으면 추측하지 말고 null.
  dueText에는 원문의 마감 표현을 짧게 남긴다(예: "자정", "주말"). 날짜만으로 충분하면 null.
- actionItems: 누가 무엇을 언제까지 하기로 했는지. 결정과 겹쳐도 따로 적는다.
- schedules: 날짜나 기한이 나온 일정.
- shortTitle(안건)은 12자 이내.
- 모든 문장은 한국어, 사용자에게 보여 줄 말투(~하기로 함, ~까지 공유)로 쓴다.`;

const nullableString = { type: ["string", "null"] } as const;
const due = { dueDate: nullableString, dueText: nullableString } as const;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "agenda", "actionItems", "schedules"],
  properties: {
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
              properties: { speaker: { type: "string" }, quote: { type: "string" }, gist: { type: "string" } },
            },
          },
          decision: {
            anyOf: [
              { type: "null" },
              {
                type: "object",
                additionalProperties: false,
                required: ["text", "short", "owner", "dueDate", "dueText"],
                properties: { text: { type: "string" }, short: { type: "string" }, owner: nullableString, ...due },
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
        required: ["title", "owner", "dueDate", "dueText"],
        properties: { title: { type: "string" }, owner: nullableString, ...due },
      },
    },
    schedules: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "owner", "dueDate", "dueText"],
        properties: { label: { type: "string" }, owner: nullableString, ...due },
      },
    },
  },
} as const;

type Due = { dueDate: string | null; dueText: string | null };
type Result = {
  summary: string;
  agenda: {
    title: string;
    shortTitle: string;
    opinions: { speaker: string; quote: string; gist: string }[];
    decision: ({ text: string; short: string; owner: string | null } & Due) | null;
  }[];
  actionItems: ({ title: string; owner: string | null } & Due)[];
  schedules: ({ label: string; owner: string | null } & Due)[];
};

function kstIso(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function clock(sec: number): string {
  const s = Math.floor(sec);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** "YYYY-MM-DD"가 실제 날짜면 한국 시간 0시 Date, 아니면 null */
function toDate(iso: string | null): Date | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00+09:00`);
  return Number.isNaN(d.getTime()) || kstIso(d) !== iso ? null : d;
}

/** 날짜가 있으면 "자정"처럼 날짜에 덧붙일 짧은 말만 남김 ("일요일 자정" → "자정", 긴 원문 표현은 뺌) */
function extraDueText(dueDate: string | null, dueText: string | null): string | null {
  const t = dueText?.trim();
  if (!t) return null;
  if (!toDate(dueDate)) return t;
  const rest = t.replace(/(이번 ?주|다음 ?주|주말)?\s*[월화수목금토일]요일\s*/g, "").replace(/\d{1,2}월\s*\d{1,2}일/g, "").replace(/[()]/g, "").trim();
  return rest && [...rest].length <= 6 ? rest : null;
}

function cut(s: string, n: number): string {
  const chars = [...s.trim()];
  return chars.length <= n ? chars.join("") : chars.slice(0, n).join("");
}

async function callLlm(userText: string): Promise<{ result: Result; usage: Anthropic.Usage }> {
  const client = new Anthropic();
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      messages: [{ role: "user", content: userText }],
      output_config: { format: { type: "json_schema", schema: SCHEMA }, effort: "high" },
    });
    const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("");
    try {
      return { result: JSON.parse(text) as Result, usage: res.usage };
    } catch (err) {
      lastError = err; // 형식이 깨졌으면 1번만 다시
    }
  }
  throw new Error(`요약 결과를 읽지 못했어요: ${String(lastError)}`);
}

/** 회의 하나를 요약해 저장하고 상태를 done으로. 실패하면 화자 확인 단계로 되돌리고 이유를 남김 */
export async function summarizeMeeting(meetingId: string): Promise<void> {
  const m = await db.meeting.findUniqueOrThrow({
    where: { id: meetingId },
    include: {
      project: { include: { members: true } },
      speakerLabels: true,
      segments: { orderBy: { startSec: "asc" } },
    },
  });
  if (m.status !== "summarizing") return;

  const memberById = Object.fromEntries(m.project.members.map((x) => [x.id, x]));
  const labelById = Object.fromEntries(m.speakerLabels.map((l) => [l.id, l]));
  // 원문 속 이름: 매핑된 화자는 팀원 이름, 모르는 화자는 "화자1" 그대로
  const nameOfLabel = (labelId: string | null) => {
    const l = labelId ? labelById[labelId] : undefined;
    if (!l) return "알 수 없음";
    return (l.memberId && memberById[l.memberId]?.name) || l.label;
  };
  const transcript = m.segments.map((s) => `[${clock(s.startSec)}] ${nameOfLabel(s.speakerLabelId)}: ${s.text}`).join("\n");
  const date = kstIso(m.startedAt);
  const [y, mo, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  const names = [...new Set(m.segments.map((s) => nameOfLabel(s.speakerLabelId)))];
  const userText = `meetingDate: ${date} (${weekday}요일)\n참석자: ${names.join(", ")}\n\n<transcript>\n${transcript}\n</transcript>`;

  try {
    const { result, usage } = await callLlm(userText);
    console.log(`요약 완료 ${meetingId}: 입력 ${usage.input_tokens} · 출력 ${usage.output_tokens}토큰`);

    // 이름 → 팀원 / 화자 라벨
    const memberByName = Object.fromEntries(m.project.members.map((x) => [x.name, x.id]));
    const labelByName: Record<string, string> = {};
    for (const l of m.speakerLabels) labelByName[nameOfLabel(l.id)] = l.id;
    const owner = (name: string | null) => {
      if (!name) return { ownerMemberId: null, ownerLabel: null };
      const id = memberByName[name];
      return id ? { ownerMemberId: id, ownerLabel: null } : { ownerMemberId: null, ownerLabel: name };
    };

    await db.$transaction(async (tx) => {
      const still = await tx.meeting.updateMany({
        where: { id: meetingId, status: "summarizing" },
        // 제목은 만들 때 정한 "n차 회의 결과" 그대로
        data: { status: "done", summary: result.summary, failReason: null },
      });
      if (still.count === 0) return;
      await tx.agendaItem.deleteMany({ where: { meetingId } });
      await tx.scheduleItem.deleteMany({ where: { meetingId } });
      for (const [i, a] of result.agenda.entries()) {
        const d = a.decision;
        const created = await tx.agendaItem.create({
          data: {
            meetingId,
            order: i + 1,
            title: a.title.trim(),
            shortTitle: cut(a.shortTitle, LIMIT.shortTitle),
            decisionText: d?.text.trim() ?? null,
            decisionShort: d ? cut(d.short, LIMIT.decisionShort) : null,
            ...owner(d?.owner ?? null),
            dueDate: toDate(d?.dueDate ?? null),
            // 날짜가 있으면 dueText는 "자정"처럼 짧은 덧말만 남김 (긴 원문 표현은 날짜와 겹쳐 보여서 뺌)
            dueText: extraDueText(d?.dueDate ?? null, d?.dueText ?? null),
            opinions: {
              create: a.opinions.map((o, k) => ({
                order: k,
                memberId: memberByName[o.speaker] ?? null,
                speakerLabelId: labelByName[o.speaker] ?? null,
                quote: o.quote.trim(),
                gist: cut(o.gist, LIMIT.gist),
              })),
            },
          },
          select: { id: true },
        });
        // 할 일은 첫 안건에 묶어 둠 (안건을 특정하지 않는 스키마라서). 대시보드 집계용
        if (i === 0) {
          for (const t of result.actionItems) {
            await tx.actionItem.create({
              data: { agendaItemId: created.id, title: t.title.trim(), memberId: memberByName[t.owner ?? ""] ?? null, dueDate: toDate(t.dueDate) },
            });
          }
        }
      }
      await tx.scheduleItem.createMany({
        data: result.schedules.map((s, i) => ({
          meetingId,
          order: i,
          label: s.label.trim(),
          dueDate: toDate(s.dueDate),
          dueText: toDate(s.dueDate) ? null : s.dueText?.trim() || "날짜 미정",
          ownerLabel: s.owner,
        })),
      });
    });
  } catch (err) {
    console.error("요약 실패", meetingId, err);
    const reason =
      err instanceof Anthropic.APIError
        ? `요약 서비스에 연결하지 못했어요(${err.status ?? "연결 오류"}). 잠시 뒤 다시 시도해 주세요.`
        : "요약하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
    await db.meeting.updateMany({ where: { id: meetingId, status: "summarizing" }, data: { status: "mapping", failReason: reason } });
  }
}
