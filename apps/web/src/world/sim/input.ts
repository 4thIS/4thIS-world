import type { Vec2 } from '@4this/shared';

/** 조종할 때 걷는 속도 (m/s). 자동 이동(1.5 m/s)보다 조금 빠르다 */
export const CONTROL_SPEED = 3;

const FORWARD = ['KeyW', 'ArrowUp'];
const BACK = ['KeyS', 'ArrowDown'];
const LEFT = ['KeyA', 'ArrowLeft'];
const RIGHT = ['KeyD', 'ArrowRight'];

export const CONTROL_KEYS: ReadonlySet<string> = new Set([...FORWARD, ...BACK, ...LEFT, ...RIGHT]);

/** 눌린 키(KeyboardEvent.code) → [오른쪽, 앞] 단위 벡터. 안 눌렸으면 [0, 0] */
export function keyDirection(keys: ReadonlySet<string>): Vec2 {
  const has = (codes: string[]) => codes.some((c) => keys.has(c));
  const right = (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0);
  const forward = (has(FORWARD) ? 1 : 0) - (has(BACK) ? 1 : 0);
  const len = Math.hypot(right, forward);
  return len === 0 ? [0, 0] : [right / len, forward / len];
}

/**
 * 화면 기준 입력을 바닥 좌표로. look은 카메라가 바라보는 방향(x, z).
 * 앞 = 카메라가 보는 쪽, 오른쪽 = 그 오른쪽.
 */
export function toWorld(input: Vec2, look: Vec2): Vec2 {
  const len = Math.hypot(look[0], look[1]) || 1;
  const fx = look[0] / len;
  const fz = look[1] / len;
  // 오른쪽 = 앞 방향을 위에서 봤을 때 시계 방향으로 90도
  const rx = -fz;
  const rz = fx;
  return [rx * input[0] + fx * input[1], rz * input[0] + fz * input[1]];
}

/** 초당 perSec번까지만 true. 서버 제한(초당 15회)을 넘지 않게 control:move를 거른다 */
export function createThrottle(perSec: number): (now: number) => boolean {
  const gap = 1000 / perSec;
  let last = -Infinity;
  return (now) => {
    if (now - last < gap) return false;
    last = now;
    return true;
  };
}
