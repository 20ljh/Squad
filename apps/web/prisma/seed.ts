/**
 * 예시 데이터를 DB에 넣음. 여러 번 실행해도 같은 결과(예시 프로젝트를 지우고 다시 만듦).
 * 실행: npm run db:seed
 *
 * - sample   : 마켓세이프 예시 프로젝트 + 3차 회의(m3). 화면 기준 스크린샷과 같은 내용
 * - rec-test : 받아쓰기·요약 시험 결과(stt-test). 실제 팀 회의 녹음 → STT → Haiku 요약
 * 원본은 lib/sample-data.ts, lib/sample-stt-meeting.ts 의 화면 모양 데이터이고, 여기서 DB 모양으로 바꿈.
 */
import { createHash, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { deleteAudio } from "../lib/audio-store";
import { sampleMeeting } from "../lib/sample-data";
import { sttTestMeeting } from "../lib/sample-stt-meeting";
import { REC_TEST_PROJECT_ID, SAMPLE_PROJECT_ID } from "../lib/paths";
import type { Meeting } from "../lib/types";

const db = new PrismaClient();

/** 한국 시간 "2026-09-22", "19:00" → Date */
function kst(date: string, time = "00:00"): Date {
  return new Date(`${date}T${time}:00+09:00`);
}

/** 화면의 마감 표시("10/3(토)", "5/10(일) 자정", "주말(날짜 미정)", "기한 없음") → dueDate·dueText */
function parseDue(label: string, year: number): { dueDate: Date | null; dueText: string | null } {
  if (label === "기한 없음") return { dueDate: null, dueText: null };
  const m = label.match(/^(\d{1,2})\/(\d{1,2})\([일월화수목금토]\)\s*(.*)$/);
  if (m) {
    const iso = `${year}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
    return { dueDate: kst(iso), dueText: m[3] || null };
  }
  return { dueDate: null, dueText: label.replace(/\(날짜 미정\)$/, "") };
}

type MeetingMeta = {
  projectId: string;
  /** 화면 데이터의 팀원 id → DB 팀원 id */
  memberIds: Record<string, string>;
  start: string;
  end: string | null;
  durationSec: number;
};

async function createMeeting(v: Meeting, meta: MeetingMeta) {
  const year = Number(v.date.slice(0, 4));
  await db.meeting.create({
    data: {
      id: v.id,
      projectId: meta.projectId,
      title: v.title,
      shortTitle: v.shortTitle,
      startedAt: kst(v.date, meta.start),
      endedAt: meta.end ? kst(v.date, meta.end) : null,
      mode: v.mode,
      durationSec: meta.durationSec,
      speakerCount: v.attendeeIds.length,
      status: "done",
      attendances: {
        create: Object.values(meta.memberIds).map((memberId) => ({
          memberId,
          present: v.attendeeIds.some((a) => meta.memberIds[a] === memberId),
        })),
      },
      agendaItems: {
        create: v.agenda.map((a) => {
          const due = a.decision ? parseDue(a.decision.dueLabel, year) : { dueDate: null, dueText: null };
          const owner = a.decision ? v.members.find((p) => p.name === a.decision?.ownerLabel) : undefined;
          return {
            order: a.order,
            title: a.title,
            shortTitle: a.shortTitle,
            decisionText: a.decision?.text ?? null,
            decisionShort: a.decision?.short ?? null,
            ownerMemberId: owner ? meta.memberIds[owner.id] : null,
            ownerLabel: owner ? null : (a.decision?.ownerLabel ?? null),
            ...due,
            opinions: {
              create: a.opinions.map((o, i) => ({ order: i, memberId: meta.memberIds[o.memberId], quote: o.quote, gist: o.gist })),
            },
          };
        }),
      },
      schedules: {
        create: v.schedules.map((s, i) => ({
          order: i,
          label: s.label,
          dueDate: s.date ? kst(s.date) : null,
          dueText: s.dueText ?? null,
          ownerLabel: s.ownerLabel,
        })),
      },
    },
  });
}

async function createProject(id: string, name: string, course: string, v: Meeting, idPrefix: string) {
  // 예시 프로젝트엔 참여할 일이 없어 초대 코드 없이 무작위 값만 넣음 (실제 코드는 HMAC으로 저장, schema.prisma 참고)
  const inviteCodeHash = createHash("sha256").update(randomBytes(32)).digest("hex");
  const memberIds = Object.fromEntries(v.members.map((p) => [p.id, `${idPrefix}${p.id}`]));
  await db.project.create({
    data: {
      id,
      name,
      course,
      inviteCodeHash,
      inviteCodeIssuedAt: new Date(),
      members: {
        create: v.members.map((p, i) => ({
          id: memberIds[p.id],
          name: p.name,
          position: p.role,
          initial: p.initial,
          color: p.color,
          role: i === 0 ? "leader" : "member",
          order: i,
        })),
      },
    },
  });
  return memberIds;
}

async function main() {
  await db.project.deleteMany({ where: { id: { in: [SAMPLE_PROJECT_ID, REC_TEST_PROJECT_ID] } } });
  // 화면 점검(e2e)이 만든 시험 프로젝트도 정리 (올린 녹음 파일도 함께 지움)
  const e2eAudio = await db.meeting.findMany({ where: { project: { name: { startsWith: "e2e " } }, audioPath: { not: null } }, select: { audioPath: true } });
  for (const m of e2eAudio) await deleteAudio(m.audioPath);
  await db.project.deleteMany({ where: { name: { startsWith: "e2e " } } });

  const sampleIds = await createProject(SAMPLE_PROJECT_ID, "마켓세이프", "캡스톤 프로젝트팀", sampleMeeting, "");
  await createMeeting(sampleMeeting, {
    projectId: SAMPLE_PROJECT_ID,
    memberIds: sampleIds,
    start: "19:00",
    end: "20:15",
    durationSec: 42 * 60 + 18,
  });

  const recIds = await createProject(REC_TEST_PROJECT_ID, "받아쓰기·요약 시험", "실제 팀 회의 녹음", sttTestMeeting, "rec-");
  // 녹음 파일의 기록 시각(13:57)이 녹음이 끝난 때라고 보고, 길이(5분 50초)만큼 앞을 시작으로 둠
  await createMeeting(sttTestMeeting, {
    projectId: REC_TEST_PROJECT_ID,
    memberIds: recIds,
    start: "13:51",
    end: "13:57",
    durationSec: 5 * 60 + 50,
  });

  const counts = await Promise.all([db.project.count(), db.meeting.count(), db.agendaItem.count(), db.opinion.count()]);
  console.log(`넣었어요: 프로젝트 ${counts[0]} · 회의 ${counts[1]} · 안건 ${counts[2]} · 의견 ${counts[3]}`);
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
