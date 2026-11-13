import { NextResponse } from "next/server";
import { checkWorker, unauthorized } from "@/lib/worker-auth";
import { failSummary } from "@/lib/llm/summarize";

type Ctx = { params: { id: string } };

// POST /api/worker/summary/:id/fail — (워커) 요약 실패 { httpStatus?: Anthropic 응답 코드, kind?: "bad_json" | "network" }
// 회의를 화자 확인 단계로 되돌리고 사용자에게 보여 줄 이유를 남김 (확정을 다시 누르면 다시 요약)
export async function POST(request: Request, { params }: Ctx) {
  if (!checkWorker(request)) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { httpStatus?: unknown; kind?: unknown };
  const code = typeof body.httpStatus === "number" ? body.httpStatus : null;
  const reason =
    body.kind === "bad_json"
      ? "요약 결과를 읽지 못했어요. 다시 시도해 주세요."
      : code
        ? `요약 서비스에 연결하지 못했어요(${code}). 잠시 뒤 다시 시도해 주세요.`
        : "요약 서비스에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.";
  await failSummary(params.id, reason);
  return NextResponse.json({ status: "mapping" });
}
