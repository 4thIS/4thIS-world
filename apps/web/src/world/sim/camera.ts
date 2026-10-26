import { FLOOR_HEIGHT, type BuildingId, type Campus } from '@4this/shared';
import type { Vec3 } from './motion';

export interface CameraGoal {
  target: Vec3;
  position: Vec3;
}

/** 처음 화면: 남동쪽 위에서 캠퍼스 전체를 본다 */
export const OVERVIEW: CameraGoal = { target: [0, 0, 0], position: [38, 34, 40] };

/** 캐릭터를 따라갈 때 카메라와 캐릭터 사이 거리 (m) */
export const FOLLOW_DISTANCE = 16;

/** 건물을 클릭했을 때 카메라가 다가갈 곳: 건물 가운데를 남동쪽 위에서 본다 */
export function buildingGoal(id: BuildingId, campus: Campus): CameraGoal {
  const b = campus.buildings[id];
  const w = b.max[0] - b.min[0];
  const d = b.max[1] - b.min[1];
  const h = b.floors * FLOOR_HEIGHT;
  const target: Vec3 = [(b.min[0] + b.max[0]) / 2, h / 2, (b.min[1] + b.max[1]) / 2];
  const distance = Math.max(w, d, h) * 1.2 + 10;
  const dir = [0.55, 0.6, 0.58];
  const len = Math.hypot(dir[0]!, dir[1]!, dir[2]!);
  return {
    target,
    position: [
      target[0] + (dir[0]! / len) * distance,
      target[1] + (dir[1]! / len) * distance,
      target[2] + (dir[2]! / len) * distance,
    ],
  };
}

/** 따라가기: 카메라가 목표보다 멀면 FOLLOW_DISTANCE까지 천천히 당긴다. 새 카메라 위치 */
export function followPosition(camera: Vec3, target: Vec3, k: number): Vec3 {
  const off: Vec3 = [camera[0] - target[0], camera[1] - target[1], camera[2] - target[2]];
  const len = Math.hypot(...off);
  if (len <= FOLLOW_DISTANCE || len === 0) return camera;
  const want = len + (FOLLOW_DISTANCE - len) * k;
  return [
    target[0] + (off[0] / len) * want,
    target[1] + (off[1] / len) * want,
    target[2] + (off[2] / len) * want,
  ];
}
