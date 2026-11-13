import { db } from "./db";
import { BRAND } from "./brand";
import { formatFullDate } from "./format";
import type { Meeting } from "./types";
import { toKstIso } from "./meetings";

// 회의 결과 → 내보내기용 문서 (Notion 블록과 Markdown이 같은 내용을 쓰도록 한 곳에서 만듦)
// 순서: 회의 정보 → 요약 → 안건별 의견·결정 → 할 일 → 일정

export type ExportBlock = {
  type: "h2" | "h3" | "p" | "bullet" | "todo" | "quote" | "divider";
  text: string;
  /** 앞에 굵게 붙는 말 ("결정 ", "지현: ") */
  lead?: string;
  checked?: boolean;
};

export type ExportDoc = { title: string; blocks: ExportBlock[] };

function dateLabel(iso: string | null, dueText?: string): string {
  if (iso) {
    const [, m, d] = iso.split("-").map(Number);
    return `${m}월 ${d}일${dueText ? ` ${dueText}` : ""}`;
  }
  return dueText ? `${dueText} (날짜 미정)` : "날짜 미정";
}

/** getMeeting 결과(화면 모양) + DB의 요약·할 일로 문서를 만듦 */
export async function buildMeetingDoc(meeting: Meeting): Promise<ExportDoc> {
  const extra = await db.meeting.findUnique({
    where: { id: meeting.id },
    select: {
      summary: true,
      agendaItems: { select: { actionItems: { select: { title: true, dueDate: true, done: true, member: { select: { name: true } } } } } },
    },
  });
  const names = Object.fromEntries(meeting.members.map((m) => [m.id, m.name]));
  const attendees = meeting.attendeeIds.map((id) => names[id]).filter(Boolean);
  const teamSize = meeting.members.filter((m) => !m.id.startsWith("speaker:")).length;

  const blocks: ExportBlock[] = [
    { type: "p", lead: "일시 ", text: `${formatFullDate(meeting.date)} ${meeting.timeRange}` },
    { type: "p", lead: "방식 ", text: meeting.mode },
    { type: "p", lead: "참석 ", text: `${attendees.length}/${teamSize}명 · ${attendees.join(", ")}` },
  ];

  if (extra?.summary) blocks.push({ type: "h2", text: "요약" }, { type: "p", text: extra.summary });

  if (meeting.agenda.length) {
    blocks.push({ type: "h2", text: "안건별 논의와 결정" });
    for (const a of meeting.agenda) {
      blocks.push({ type: "h3", text: `${a.order}. ${a.title}` });
      for (const o of a.opinions) blocks.push({ type: "bullet", lead: `${names[o.memberId] ?? "알 수 없음"}: `, text: o.quote });
      if (a.decision) {
        const meta = [a.decision.ownerLabel && `담당 ${a.decision.ownerLabel}`, a.decision.dueLabel && `마감 ${a.decision.dueLabel}`].filter(Boolean).join(" · ");
        blocks.push({ type: "quote", lead: "결정 ", text: meta ? `${a.decision.text} (${meta})` : a.decision.text });
      }
    }
  }

  const actions = (extra?.agendaItems ?? []).flatMap((a) => a.actionItems);
  if (actions.length) {
    blocks.push({ type: "h2", text: "할 일" });
    for (const t of actions) {
      const due = t.dueDate ? dateLabel(toKstIso(t.dueDate)) : null; // 날짜는 한국 시간 기준
      const meta = [t.member?.name, due && `${due}까지`].filter(Boolean).join(" · ");
      blocks.push({ type: "todo", text: meta ? `${t.title} — ${meta}` : t.title, checked: t.done });
    }
  }

  if (meeting.schedules.length) {
    blocks.push({ type: "h2", text: "회의 중 언급된 일정" });
    for (const s of meeting.schedules) {
      blocks.push({ type: "bullet", lead: `${dateLabel(s.date, s.dueText)} `, text: s.ownerLabel ? `${s.label} (${s.ownerLabel})` : s.label });
    }
  }

  blocks.push({ type: "divider", text: "" }, { type: "p", text: `${BRAND.name}로 회의 녹음을 정리한 페이지예요.` });
  return { title: `${meeting.title} · ${meeting.date}`, blocks };
}

/** 같은 문서를 Markdown으로 (Notion을 연결하지 않아도 복사해서 붙여 넣을 수 있게) */
export function toMarkdown(doc: ExportDoc): string {
  const lines: string[] = [`# ${doc.title}`, ""];
  for (const b of doc.blocks) {
    const body = `${b.lead ? `**${b.lead.trim()}** ` : ""}${b.text}`;
    switch (b.type) {
      case "h2":
        lines.push("", `## ${b.text}`, "");
        break;
      case "h3":
        lines.push("", `### ${b.text}`, "");
        break;
      case "bullet":
        lines.push(`- ${body}`);
        break;
      case "todo":
        lines.push(`- [${b.checked ? "x" : " "}] ${body}`);
        break;
      case "quote":
        lines.push("", `> ${body}`, "");
        break;
      case "divider":
        lines.push("", "---", "");
        break;
      default:
        lines.push(body, "");
    }
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}
