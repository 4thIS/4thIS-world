import { CAMPUS_HALF, nearestNode, type Campus, type Vec2 } from '@4this/shared';

/** 조종하는 캐릭터의 충돌 반지름 (m) */
export const CHARACTER_RADIUS = 0.35;

/** p에 캐릭터(반지름 r)가 설 수 없는가: 맵 밖, 건물 벽 안, 연못 안 */
export function isBlocked(campus: Campus, p: Vec2, r = CHARACTER_RADIUS): boolean {
  if (Math.abs(p[0]) > CAMPUS_HALF - r || Math.abs(p[1]) > CAMPUS_HALF - r) return true;
  return campus.colliders.some((c) =>
    c.kind === 'box'
      ? p[0] > c.min[0] - r && p[0] < c.max[0] + r && p[1] > c.min[1] - r && p[1] < c.max[1] + r
      : Math.hypot(p[0] - c.center[0], p[1] - c.center[1]) < c.r + r,
  );
}

/**
 * from에서 to로 움직이려 할 때 실제로 갈 수 있는 곳.
 * 막히면 x만, 그다음 z만 움직여 벽을 따라 미끄러지고, 그래도 막히면 제자리.
 */
export function resolveMove(campus: Campus, from: Vec2, to: Vec2, r = CHARACTER_RADIUS): Vec2 {
  const clamped: Vec2 = [
    Math.max(-CAMPUS_HALF + r, Math.min(CAMPUS_HALF - r, to[0])),
    Math.max(-CAMPUS_HALF + r, Math.min(CAMPUS_HALF - r, to[1])),
  ];
  if (!isBlocked(campus, clamped, r)) return clamped;
  const slideX: Vec2 = [clamped[0], from[1]];
  if (!isBlocked(campus, slideX, r)) return slideX;
  const slideZ: Vec2 = [from[0], clamped[1]];
  if (!isBlocked(campus, slideZ, r)) return slideZ;
  return from;
}

/** 조종을 시작할 자리. 건물 안·연못 안이면 가장 가까운 길목 노드로 옮긴다 */
export function freeSpot(campus: Campus, p: Vec2): Vec2 {
  if (!isBlocked(campus, p)) return p;
  return campus.graph.nodes[nearestNode(campus, p)]!;
}
