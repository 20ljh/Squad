import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { summarizeMeeting } from "@/lib/llm/summarize";

type Ctx = { params: { id: string } };

// POST /api/meetings/:id/speakers — 화자 ↔ 팀원 매핑 확정 후 요약 시작
// 본문: { mapping: { [speakerLabelId]: memberId | null } }  null = 모르겠음("화자1"로 남김)
// 저장하면 상태가 summarizing 이 되고, 요약(LLM 1회)은 응답을 보낸 뒤 서버에서 이어서 진행 → 회의 페이지가 몇 초마다 확인
// 로그인 전(11/16 제출본)이라 팀원 확인은 없음. 로그인을 붙이면 세션 사용자가 이 프로젝트 팀원인지 확인할 것
export async function POST(request: Request, { params }: Ctx) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }
  const mapping = body.mapping;
  if (typeof mapping !== "object" || mapping === null) return NextResponse.json({ error: "화자마다 팀원을 골라 주세요." }, { status: 400 });

  const m = await db.meeting.findUnique({
    where: { id: params.id },
    select: { id: true, projectId: true, status: true, speakerLabels: { select: { id: true } } },
  });
  if (!m) return NextResponse.json({ error: "회의를 찾을 수 없어요." }, { status: 404 });
  if (m.status !== "mapping") return NextResponse.json({ error: "화자 확인 단계가 아니에요. 새로고침해 주세요." }, { status: 409 });

  const members = await db.member.findMany({ where: { projectId: m.projectId }, select: { id: true } });
  const memberIds = new Set(members.map((x) => x.id));
  const entries = m.speakerLabels.map((l) => [l.id, (mapping as Record<string, unknown>)[l.id]] as const);
  // 화자마다 팀원 id 또는 null(모르겠음)을 꼭 보내야 함 (빠진 화자가 있으면 요약을 시작하지 않음)
  if (entries.length === 0 || entries.some(([, v]) => v === undefined)) {
    return NextResponse.json({ error: "화자마다 누구인지 골라 주세요. 모르면 \"모르겠음\"을 고르면 돼요." }, { status: 400 });
  }
  // 다른 프로젝트 팀원 id는 받지 않음 (claude/DB.md 5절)
  if (entries.some(([, v]) => v !== null && v !== undefined && (typeof v !== "string" || !memberIds.has(v)))) {
    return NextResponse.json({ error: "고른 팀원이 이 프로젝트에 없어요. 새로고침 후 다시 골라 주세요." }, { status: 400 });
  }

  const now = new Date();
  const ok = await db.$transaction(async (tx) => {
    const moved = await tx.meeting.updateMany({ where: { id: m.id, status: "mapping" }, data: { status: "summarizing", failReason: null } });
    if (moved.count === 0) return false;
    for (const [labelId, memberId] of entries) {
      await tx.speakerLabel.update({ where: { id: labelId }, data: { memberId: typeof memberId === "string" ? memberId : null, confirmedAt: now } });
    }
    return true;
  });
  if (!ok) return NextResponse.json({ error: "이미 요약을 시작했어요. 새로고침해 주세요." }, { status: 409 });

  // 응답은 바로 보내고 요약은 이어서 (Docker의 Node 서버에서 계속 실행됨, 서버리스 아님)
  void summarizeMeeting(m.id);
  return NextResponse.json({ status: "summarizing" }, { status: 202 });
}
