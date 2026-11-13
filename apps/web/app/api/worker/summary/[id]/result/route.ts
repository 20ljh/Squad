import { NextResponse } from "next/server";
import { checkWorker, unauthorized } from "@/lib/worker-auth";
import { saveSummary } from "@/lib/llm/summarize";

type Ctx = { params: { id: string } };

// POST /api/worker/summary/:id/result — (워커) 모델이 돌려준 글(JSON) 올리기 { text, usage? }
// 200 저장 완료 / 422 { retry: true } 형식이 깨짐 → 워커가 1번만 다시 부름 / 409 그 사이 상태가 바뀜(취소 등)
export async function POST(request: Request, { params }: Ctx) {
  if (!checkWorker(request)) return unauthorized();
  const body = (await request.json().catch(() => ({}))) as { text?: unknown; usage?: { input_tokens?: number; output_tokens?: number } };
  if (typeof body.text !== "string") return NextResponse.json({ error: "text가 없어요." }, { status: 400 });

  const r = await saveSummary(params.id, body.text);
  if (r === "gone") return NextResponse.json({ error: "요약할 상태가 아니에요.", cancelled: true }, { status: 409 });
  if (r === "bad_json") return NextResponse.json({ error: "요약 결과 형식이 맞지 않아요.", retry: true }, { status: 422 });
  console.log(`요약 완료 ${params.id}: 입력 ${body.usage?.input_tokens ?? "?"} · 출력 ${body.usage?.output_tokens ?? "?"}토큰`);
  return NextResponse.json({ status: "done" });
}
