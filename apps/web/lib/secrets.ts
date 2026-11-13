import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

// 비밀값 다루기. 원문을 DB에 두지 않기 위한 도우미 (claude/DB.md 5절)

function authSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error("AUTH_SECRET이 없거나 너무 짧아요. apps/web/.env 에 32자 이상 무작위 값을 넣어 주세요.");
  }
  return s;
}

// 헷갈리는 글자(0·O, 1·I·L)를 뺀 대문자·숫자
const CODE_CHARS = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** 초대 코드 원문: "SQD-XXXX-XXXX" (무작위 8자, 약 8천억 가지) */
export function newInviteCode(): string {
  const pick = () => Array.from({ length: 4 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
  return `SQD-${pick()}-${pick()}`;
}

/** 초대 코드 → DB에 저장할 값. 서버 비밀값을 섞은 HMAC이라 DB만으로는 되돌릴 수 없음 */
export function inviteCodeHash(code: string): string {
  return createHmac("sha256", authSecret()).update(code.trim().toUpperCase()).digest("hex");
}

/** 워커 API 요청의 "Authorization: Bearer <WORKER_TOKEN>" 확인 (길이와 상관없이 같은 시간에 비교) */
export function isWorkerRequest(authorization: string | null): boolean {
  const expected = process.env.WORKER_TOKEN;
  if (!expected || expected.length < 32 || !authorization?.startsWith("Bearer ")) return false;
  const a = createHmac("sha256", "worker").update(authorization.slice(7)).digest();
  const b = createHmac("sha256", "worker").update(expected).digest();
  return timingSafeEqual(a, b);
}
