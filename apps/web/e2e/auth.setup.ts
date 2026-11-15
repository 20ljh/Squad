import { createHash, randomBytes } from "node:crypto";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

// e2e 전체 준비: 시험용 구글 사용자 두 명(팀장 역할 A, 참여자 역할 B)을 DB에 만들고 세션 쿠키를 파일로 남김
// 구글 로그인 화면은 자동화할 수 없어서, 서버가 만드는 것과 같은 방식(무작위 토큰 → SHA-256 해시 저장)으로 세션을 직접 만듦
// 이전 실행에서 남은 시험 사용자(googleSub가 "e2e-"로 시작)는 먼저 지움

export const AUTH_DIR = path.join(__dirname, "../.e2e-auth");
export const USER_A = path.join(AUTH_DIR, "a.json");
export const USER_B = path.join(AUTH_DIR, "b.json");

export function loadEnv() {
  if (process.env.DATABASE_URL) return;
  for (const line of readFileSync(path.join(__dirname, "../.env"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}

async function makeUser(db: PrismaClient, key: string, name: string, file: string) {
  const user = await db.user.create({ data: { googleSub: `e2e-${key}-${Date.now()}`, email: `e2e-${key}@example.com`, name } });
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.session.create({ data: { userId: user.id, tokenHash: createHash("sha256").update(token).digest("hex"), label: "e2e", expiresAt } });
  writeFileSync(
    file,
    JSON.stringify({
      cookies: [{ name: "sq_session", value: token, domain: "localhost", path: "/", expires: Math.floor(expiresAt.getTime() / 1000), httpOnly: true, secure: false, sameSite: "Lax" }],
      origins: [],
    }),
  );
}

export default async function globalSetup() {
  loadEnv();
  const db = new PrismaClient();
  try {
    await db.user.deleteMany({ where: { googleSub: { startsWith: "e2e-" } } });
    mkdirSync(AUTH_DIR, { recursive: true });
    await makeUser(db, "a", "이주형", USER_A);
    await makeUser(db, "b", "김치우", USER_B);
  } finally {
    await db.$disconnect();
  }
}
