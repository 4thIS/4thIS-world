/** 말풍선 채팅의 순수 로직: 3초 떠 있고, 한 사람에게 최대 3개까지 쌓인다 */

/** 말풍선 하나가 떠 있는 시간(ms) */
export const CHAT_DURATION_MS = 3000;
/** 한 사람 머리 위에 쌓이는 최대 개수. 넘치면 가장 오래된 것부터 지운다 */
export const CHAT_STACK_MAX = 3;
const POP_MS = 180;
const FADE_MS = 300;

/** 받은 뒤 지난 시간(ms) → 크기·투명도. 3초가 지나면 null */
export function chatFrame(elapsedMs: number): { scale: number; opacity: number } | null {
  const e = Math.max(0, elapsedMs);
  if (e >= CHAT_DURATION_MS) return null;
  const scale = e < POP_MS ? 0.1 + (e / POP_MS) * 0.9 : 1;
  const opacity = Math.min(1, (CHAT_DURATION_MS - e) / FADE_MS);
  return { scale, opacity };
}
