const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** 2026-09-22 → "2026.09.22 (화)" */
export function formatFullDate(iso: string): string {
  const date = parseISODate(iso);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}.${mm}.${dd} (${WEEKDAYS[date.getDay()]})`;
}

/** 일정 카드용 조각: { day: "03", month: "10월", weekday: "토" } */
export function dateParts(iso: string) {
  const date = parseISODate(iso);
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: `${date.getMonth() + 1}월`,
    weekday: WEEKDAYS[date.getDay()],
  };
}

/** 기준일(회의일)로부터 D-day 라벨 */
export function dDay(targetIso: string, fromIso: string): string {
  const diff = Math.round(
    (parseISODate(targetIso).getTime() - parseISODate(fromIso).getTime()) / 86_400_000,
  );
  if (diff === 0) return "D-DAY";
  return diff > 0 ? `D-${diff}` : `D+${-diff}`;
}

export function memberMap<T extends { id: string }>(list: T[]): Record<string, T> {
  return Object.fromEntries(list.map((m) => [m.id, m]));
}
