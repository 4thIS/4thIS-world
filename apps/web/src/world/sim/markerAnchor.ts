import { FLOOR_HEIGHT, type BuildingId, type Campus } from '@4this/shared';
import { CHARACTER_SCALE } from '../characters/poses';
import type { Vec3 } from './motion';

/** 건물 표시: 지붕에서 이만큼 위 (포커스된 건물 이름표는 지붕 + 2.2 m) */
export const BUILDING_MARKER_LIFT = 4.3;
/** 캐릭터 표시: 발에서 이만큼 위 (이름표 2.1, 이모지 2.6 × 크기보다 위) */
export const MEMBER_MARKER_HEIGHT = 3.4 * CHARACTER_SCALE;

export type MarkerAnchor =
  { kind: 'building'; position: Vec3 } | { kind: 'member'; memberId: string; height: number };

/** 포커스 표시(✓)를 어디에 띄울지. 캐릭터 따라가기가 건물보다 먼저다 */
export function markerAnchor(
  building: BuildingId | null,
  member: string | null,
  campus: Campus,
): MarkerAnchor | null {
  if (member) return { kind: 'member', memberId: member, height: MEMBER_MARKER_HEIGHT };
  if (!building) return null;
  const b = campus.buildings[building];
  return {
    kind: 'building',
    position: [
      (b.min[0] + b.max[0]) / 2,
      b.floors * FLOOR_HEIGHT + BUILDING_MARKER_LIFT,
      (b.min[1] + b.max[1]) / 2,
    ],
  };
}

/** 둥둥 떠다니는 높이 변화 (m). t는 초 */
export function bobOffset(t: number): number {
  return Math.sin(t * 2.6) * 0.18;
}
