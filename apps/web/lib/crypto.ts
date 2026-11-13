import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// 다시 꺼내 써야 하는 비밀값(Notion 토큰 등)의 암호화 저장 (claude/DB.md 5절)
// AES-256-GCM. 키는 .env 의 ENCRYPTION_KEY (base64, 32바이트). 저장 형식: [키 버전 1바이트][IV 12][태그 16][암호문]
// 키를 바꿀 때는 버전을 올리고 이전 키로 풀어 새 키로 다시 암호화

const KEY_VERSION = 1;

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  const k = raw ? Buffer.from(raw, "base64") : Buffer.alloc(0);
  if (k.length !== 32) throw new Error("ENCRYPTION_KEY가 없거나 32바이트(base64)가 아니에요. apps/web/.env 를 확인해 주세요.");
  return k;
}

export function encryptSecret(plain: string): Uint8Array<ArrayBuffer> {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  const out = Buffer.concat([Buffer.from([KEY_VERSION]), iv, c.getAuthTag(), body]);
  return new Uint8Array(out); // Prisma Bytes 칸 타입에 맞춤
}

export function decryptSecret(blob: Uint8Array): string {
  const b = Buffer.from(blob);
  if (b[0] !== KEY_VERSION) throw new Error("알 수 없는 암호화 키 버전");
  const d = createDecipheriv("aes-256-gcm", key(), b.subarray(1, 13));
  d.setAuthTag(b.subarray(13, 29));
  return Buffer.concat([d.update(b.subarray(29)), d.final()]).toString("utf8");
}
