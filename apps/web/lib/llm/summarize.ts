import { db } from "../db";

// 회의 요약: 화자 매핑이 끝난 원문을 LLM에 한 번 보내 안건·의견·결정·일정·할 일을 받아 DB에 저장
// 시험(apps/web/scripts/summarize-poc.ts)에서 정한 대로 Haiku 5.5 + 노력 단계 high + JSON 스키마 강제 (회의 1건 약 7원)
// 결과는 DB에 저장해 다시 부르지 않음 (CLAUDE.md 11절). 파싱에 실패하면 1번만 다시 시도
//
// Anthropic API 호출은 웹 서버가 아니라 개발 PC의 워커가 함 (2026-11-13: 배포 VM이 있는 홍콩은 Anthropic API 미지원 지역)
//   1) 워커가 /api/worker/summary/claim 으로 summaryRequest()가 만든 요청 본문을 받아
//   2) Anthropic Messages API에 그대로 보내고
//   3) 받은 글을 /api/worker/summary/:id/result 로 올리면 saveSummary()가 검사·저장
// 프롬프트·스키마·저장 규칙은 모두 이 파일 한 곳에 둠 (워커는 전달만)

const MODEL = process.env.LLM_MODEL ?? "claude-haiku-5-5";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 마인드맵 칸 글자 수. 모델에게는 짧게(12·15·14자) 쓰라고 하고, 넘겨도 마인드맵이 두 줄까지 그리므로
// 저장할 때는 두 줄 분량까지 두고 그보다 길 때만 단어 경계에서 "…"로 자름
const LIMIT = { shortTitle: 22, gist: 30, decisionShort: 28 };

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
  quote는 원문 말투를 살려 오류만 고친 한두 문장, gist는 20자 안팎의 요지.
  highlight: 회의 전체에서 방향을 정했거나 가장 인상적인 발언 1~2개만 true, 나머지는 false.
- decision: 그 안건에서 합의된 결론. 합의가 없으면 null. short는 18자 안팎.
  owner는 원문에 나온 이름, "전원", 또는 정해지지 않았으면 null.
- 마감·일정의 날짜(dueDate, date)는 회의 날짜(meetingDate)를 기준으로 하루로 정해질 때만 YYYY-MM-DD로 쓴다.
  예) "5월 14일", "이번 주 일요일", "다음 주 목요일"은 날짜로 바꾼다.
  "주말까지", "다음 회의 전", "빨리"처럼 어느 날인지 말하지 않았으면 추측하지 말고 null.
  dueText에는 원문의 마감 표현을 짧게 남긴다(예: "자정", "주말"). 날짜만으로 충분하면 null.
- actionItems: 누가 무엇을 언제까지 하기로 했는지. 결정과 겹쳐도 따로 적는다.
- schedules: 날짜나 기한이 나온 일정.
- shortTitle(안건)은 14자 안팎.
- gist·short·shortTitle은 마인드맵 칸에 들어가는 짧은 말이다. 글자 수를 맞추려고 단어 중간에서 끊지 마라.
  길면 더 짧은 표현으로 바꿔 쓰고, 끝은 완결된 말로 맺어라. 예) "2명씩 1·2차로 나눠 발표", "다음 회의 전 주제 확인".
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
              required: ["speaker", "quote", "gist", "highlight"],
              properties: { speaker: { type: "string" }, quote: { type: "string" }, gist: { type: "string" }, highlight: { type: "boolean" } },
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
    opinions: { speaker: string; quote: string; gist: string; highlight?: boolean }[];
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
  if (chars.length <= n) return chars.join("");
  // 단어 중간에서 자르지 않게 마지막 띄어쓰기 앞까지 (너무 짧아지면 글자 단위로)
  const head = chars.slice(0, n - 1).join("");
  const sp = head.lastIndexOf(" ");
  return `${(sp >= n / 2 ? head.slice(0, sp) : head).trimEnd()}…`;
}

async function loadMeeting(meetingId: string) {
  return db.meeting.findUnique({
    where: { id: meetingId },
    include: {
      project: { include: { members: true } },
      speakerLabels: true,
      segments: { orderBy: { startSec: "asc" } },
    },
  });
}

type LoadedMeeting = NonNullable<Awaited<ReturnType<typeof loadMeeting>>>;

/** 원문 속 이름: 매핑된 화자는 팀원 이름, 모르는 화자는 "화자1" 그대로 */
function namer(m: LoadedMeeting) {
  const memberById = Object.fromEntries(m.project.members.map((x) => [x.id, x]));
  const labelById = Object.fromEntries(m.speakerLabels.map((l) => [l.id, l]));
  return (labelId: string | null) => {
    const l = labelId ? labelById[labelId] : undefined;
    if (!l) return "알 수 없음";
    return (l.memberId && memberById[l.memberId]?.name) || l.label;
  };
}

/** 워커가 Anthropic Messages API에 그대로 보낼 요청 본문. 요약할 회의가 아니면 null */
export async function summaryRequest(meetingId: string): Promise<Record<string, unknown> | null> {
  const m = await loadMeeting(meetingId);
  if (!m || m.status !== "summarizing") return null;
  const nameOfLabel = namer(m);
  const transcript = m.segments.map((s) => `[${clock(s.startSec)}] ${nameOfLabel(s.speakerLabelId)}: ${s.text}`).join("\n");
  const date = kstIso(m.startedAt);
  const [y, mo, d] = date.split("-").map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()];
  const names = [...new Set(m.segments.map((s) => nameOfLabel(s.speakerLabelId)))];
  const userText = `meetingDate: ${date} (${weekday}요일)\n참석자: ${names.join(", ")}\n\n<transcript>\n${transcript}\n</transcript>`;
  return {
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [{ role: "user", content: userText }],
    output_config: { format: { type: "json_schema", schema: SCHEMA }, effort: "high" },
  };
}

/** 요약 실패: 화자 확인 단계로 되돌리고 이유를 남김 (사용자가 다시 확정하면 다시 요약) */
export async function failSummary(meetingId: string, reason: string): Promise<void> {
  await db.meeting.updateMany({ where: { id: meetingId, status: "summarizing" }, data: { status: "mapping", failReason: reason, summaryStartedAt: null } });
}

/**
 * 워커가 받아 온 모델 응답 글(JSON)을 검사해 저장하고 상태를 done으로.
 * "bad_json"이면 워커가 1번만 다시 부름. "gone"이면 그 사이 상태가 바뀐 회의
 */
export async function saveSummary(meetingId: string, text: string): Promise<"saved" | "bad_json" | "gone"> {
  let result: Result;
  try {
    result = JSON.parse(text) as Result;
  } catch {
    return "bad_json";
  }
  if (typeof result?.summary !== "string" || !Array.isArray(result.agenda) || !Array.isArray(result.actionItems) || !Array.isArray(result.schedules)) {
    return "bad_json";
  }
  const m = await loadMeeting(meetingId);
  if (!m || m.status !== "summarizing") return "gone";
  const nameOfLabel = namer(m);

  try {
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
        data: { status: "done", summary: result.summary, failReason: null, summaryStartedAt: null },
      });
      if (still.count === 0) return;
      await tx.agendaItem.deleteMany({ where: { meetingId } });
      await tx.scheduleItem.deleteMany({ where: { meetingId } });
      // 모델이 고른 핵심 발언은 하이라이트로 (회의마다 최대 2개, 팀원이 ☆로 바꿀 수 있음)
      let highlightsLeft = 2;
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
                pinned: o.highlight === true && highlightsLeft-- > 0,
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
    return "saved";
  } catch (err) {
    // 모양은 맞지만 값이 이상한 경우 등 → 형식 오류로 보고 워커가 1번 더 시도
    console.error("요약 저장 실패", meetingId, err);
    return "bad_json";
  }
}
