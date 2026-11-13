import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// 회의 원본 음성 저장 (claude/DB.md 5절: 무작위 이름, 공개 폴더 밖, 팀원만 받기)
// 위치: AUDIO_DIR 환경 변수, 없으면 저장소 루트의 data/audio (git 제외)

export const MAX_AUDIO_BYTES = 300 * 1024 * 1024;
export const AUDIO_EXTS = ["m4a", "mp3", "wav", "webm", "ogg", "aac", "flac", "mp4"] as const;

export function audioDir(): string {
  return process.env.AUDIO_DIR ? path.resolve(process.env.AUDIO_DIR) : path.resolve(process.cwd(), "../../data/audio");
}

/** 파일 이름 → 허용된 확장자면 소문자 확장자, 아니면 null */
export function audioExt(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return (AUDIO_EXTS as readonly string[]).includes(ext) ? ext : null;
}

/** 저장하고 DB에 넣을 상대 이름(무작위)을 돌려줌. 원래 파일 이름은 쓰지 않음 */
export async function saveAudio(data: ArrayBuffer, ext: string): Promise<string> {
  const dir = audioDir();
  await mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(data));
  return name;
}

/** DB의 상대 이름 → 실제 경로. 폴더 밖을 가리키는 이름은 거부 */
export function audioFilePath(name: string): string {
  const dir = audioDir();
  const full = path.resolve(dir, name);
  if (path.dirname(full) !== dir) throw new Error("잘못된 음성 파일 이름");
  return full;
}

export async function deleteAudio(name: string | null): Promise<void> {
  if (!name) return;
  await unlink(audioFilePath(name)).catch(() => undefined);
}
