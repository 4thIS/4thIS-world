/** 왼쪽 버튼을 누른 순간 */
export interface Press {
  x: number;
  y: number;
  /** ms */
  at: number;
}

/** 두 번째 누름까지 이 시간(ms) 안이면 더블 클릭 */
export const DOUBLE_PRESS_MS = 350;
/** 두 번 누른 곳이 이만큼(px) 안이어야 한다 */
export const DOUBLE_PRESS_SLOP = 24;

/** 이번 누름이 지난 누름에 이은 더블 클릭인가. 더블 클릭 후 끌면 회전 대신 화면 이동 */
export function isDoublePress(prev: Press | null, now: Press): boolean {
  return (
    prev !== null &&
    now.at - prev.at <= DOUBLE_PRESS_MS &&
    Math.hypot(now.x - prev.x, now.y - prev.y) <= DOUBLE_PRESS_SLOP
  );
}
