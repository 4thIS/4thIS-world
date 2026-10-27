import type { Vec2 } from '@4this/shared';

/**
 * 컷어웨이 (설계 문서 §5.3): 카메라 쪽을 향한 벽을 투명하게 만든다.
 * - 건물 가운데에서 카메라로 가는 수평 방향과 벽 바깥 법선의 내적이 0.3보다 크면 "카메라 쪽 벽"
 * - 그 벽의 불투명도를 0.25초 동안 0.1까지 낮추고, 대신 테두리선을 보이게 한다
 */
export const CUTAWAY_DOT = 0.3;
export const CUTAWAY_OPACITY = 0.1;
export const CUTAWAY_SECONDS = 0.25;

/** 이 벽이 카메라를 보고 있는지 (카메라가 건물 가운데 바로 위면 false) */
export function wallFacesCamera(normal: Vec2, center: Vec2, camera: Vec2): boolean {
  const dx = camera[0] - center[0];
  const dz = camera[1] - center[1];
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return false;
  return (dx * normal[0] + dz * normal[1]) / len > CUTAWAY_DOT;
}

/** 목표 불투명도 */
export const targetOpacity = (facing: boolean) => (facing ? CUTAWAY_OPACITY : 1);

/** current를 target 쪽으로 dt초만큼 옮긴다. 1 → 0.1 전체를 CUTAWAY_SECONDS에 지나간다 */
export function approach(current: number, target: number, dt: number): number {
  const step = ((1 - CUTAWAY_OPACITY) / CUTAWAY_SECONDS) * dt;
  if (current < target) return Math.min(target, current + step);
  return Math.max(target, current - step);
}

/** 벽이 흐려질수록 테두리선이 진해진다 (벽 불투명 1 → 선 0, 벽 0.1 → 선 0.9) */
export function edgeOpacity(wallOpacity: number): number {
  return Math.max(0, Math.min(0.9, 1 - wallOpacity));
}
