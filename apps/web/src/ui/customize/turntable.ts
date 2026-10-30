/** 꾸미기 미리보기 돌리기: 기본은 천천히 한 방향, 잡고 끌면 그만큼, 놓으면 잠깐 멈췄다 다시 돈다 */

/** 저절로 도는 속도 (rad/s) */
export const AUTO_SPEED = 0.6;
/** 끌어서 돌리는 양 (rad/px) */
export const DRAG_RAD_PER_PX = 0.012;
/** 놓은 뒤 멈춰 있는 시간 (s) */
export const RESUME_DELAY = 2;

export interface TurnState {
  angle: number;
  /** 잡고 있는 포인터의 마지막 x (px). 안 잡고 있으면 null */
  dragX: number | null;
  /** 놓은 뒤 지난 시간 (s) */
  idle: number;
}

export const INITIAL_TURN: TurnState = { angle: 0, dragX: null, idle: RESUME_DELAY };

export function grab(s: TurnState, x: number): TurnState {
  return { ...s, dragX: x };
}

export function drag(s: TurnState, x: number): TurnState {
  if (s.dragX === null) return s;
  return { ...s, angle: s.angle + (x - s.dragX) * DRAG_RAD_PER_PX, dragX: x };
}

export function release(s: TurnState): TurnState {
  return { ...s, dragX: null, idle: 0 };
}

/** 한 프레임: 잡고 있거나 놓은 지 얼마 안 됐으면 그대로, 아니면 천천히 돈다 */
export function tick(s: TurnState, delta: number): TurnState {
  if (s.dragX !== null) return s;
  const idle = s.idle + delta;
  // 멈춤이 끝난 프레임에는 넘친 시간만큼만 돈다
  const spin = Math.max(0, idle - Math.max(s.idle, RESUME_DELAY));
  return { ...s, idle, angle: s.angle + spin * AUTO_SPEED };
}
