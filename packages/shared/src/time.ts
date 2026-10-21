/** 모든 시각 계산은 한국 시각(UTC+9, 서머타임 없음) 기준이다. */
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** 시간표가 다루는 범위: 06:00 ~ 24:00, 30분 단위 */
export const DAY_START_MIN = 6 * 60;
export const DAY_END_MIN = 24 * 60;
export const SLOT_MIN = 30;

/** 월=0 … 일=6 */
export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

/** epoch ms → KST 날짜 'YYYY-MM-DD' */
export function kstDate(t: number): string {
  return new Date(t + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** epoch ms → KST 요일 (월=0 … 일=6) */
export function kstWeekday(t: number): number {
  return (new Date(t + KST_OFFSET_MS).getUTCDay() + 6) % 7;
}

/** epoch ms → KST 자정부터 지난 분 (소수 포함) */
export function kstMinutes(t: number): number {
  return ((((t + KST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS) / 60_000;
}

/** KST 날짜 'YYYY-MM-DD'의 자정 → epoch ms */
export function kstMidnight(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) - KST_OFFSET_MS;
}

/** 'HH:MM' → 분 */
export function toMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** 분 → 'HH:MM' (소수점 아래 버림) */
export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
