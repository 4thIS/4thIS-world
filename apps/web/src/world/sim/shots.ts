import { SHOT_RANGE, type ShotRequest, type Weapon } from '@4this/shared';
import type { PoseFrame } from '../characters/poses';

/**
 * 장난감 쏘기의 순수 계산: 맞히기, 날아가는 자리, 맞은 캐릭터의 반응.
 * 물총·눈덩이·광선총은 같은 방식이고 속도·모양·반응만 다르다.
 */

/** 이 거리(m) 안으로 지나가면 맞는다 */
const HIT_RADIUS = 0.6;
/** 같은 층으로 볼 높이 차이 (m) */
const SAME_FLOOR = 1.2;
/** 쏘는 손 높이 (발에서, m) */
export const HAND_Y = 1;

const SPEED: Record<Weapon, number> = { water: 14, snow: 11, ray: 32 };
/** 포물선 높이 (m). 광선총은 곧게 */
const ARC: Record<Weapon, number> = { water: 0.9, snow: 1.3, ray: 0 };

/** 맞은 반응 길이 (ms) */
export const HIT_MS = 1300;

export interface Target {
  id: string;
  x: number;
  y: number;
  z: number;
}

/** from에서 dir(바닥 방향)으로 쏠 때 가장 먼저 맞는 캐릭터와 거리 */
export function findHit(
  from: readonly [number, number, number],
  dir: readonly [number, number],
  targets: readonly Target[],
): { id: string; dist: number } | null {
  const len = Math.hypot(dir[0], dir[1]) || 1;
  const [ux, uz] = [dir[0] / len, dir[1] / len];
  let best: { id: string; dist: number } | null = null;
  for (const t of targets) {
    // from은 손 높이(발 + HAND_Y), 대상은 발 높이
    if (Math.abs(t.y - (from[1] - HAND_Y)) > SAME_FLOOR) continue;
    const ox = t.x - from[0];
    const oz = t.z - from[2];
    const along = ox * ux + oz * uz;
    if (along <= 0 || along > SHOT_RANGE) continue;
    const side = Math.abs(ox * -uz + oz * ux);
    if (side > HIT_RADIUS) continue;
    if (!best || along < best.dist) best = { id: t.id, dist: Math.round(along * 100) / 100 };
  }
  return best;
}

/** 다 날아가는 데 걸리는 시간 (초) */
export function travelSec(weapon: Weapon, dist: number): number {
  return dist / SPEED[weapon];
}

/** 쏜 뒤 t초의 자리. 다 날아갔으면 null */
export function shotPosition(
  shot: Pick<ShotRequest, 'weapon' | 'from' | 'dir' | 'dist'>,
  t: number,
): [number, number, number] | null {
  const total = travelSec(shot.weapon, shot.dist);
  if (t < 0 || t > total) return null;
  const s = t * SPEED[shot.weapon];
  const len = Math.hypot(shot.dir[0], shot.dir[1]) || 1;
  const k = shot.dist > 0 ? s / shot.dist : 1;
  return [
    shot.from[0] + (shot.dir[0] / len) * s,
    shot.from[1] + Math.sin(k * Math.PI) * ARC[shot.weapon],
    shot.from[2] + (shot.dir[1] / len) * s,
  ];
}

/** 맞은 뒤 지난 시간(ms) → 반응 자세. 아직 안 맞았거나 끝났으면 null */
export function hitFrame(base: PoseFrame, weapon: Weapon, elapsedMs: number): PoseFrame | null {
  if (elapsedMs < 0 || elapsedMs >= HIT_MS) return null;
  const e = elapsedMs / 1000;
  const fade = Math.min(1, (HIT_MS / 1000 - e) / 0.3);
  const f: PoseFrame = { ...base, arms: [{ ...base.arms[0] }, { ...base.arms[1] }] };
  switch (weapon) {
    case 'water':
      // 깜짝 놀라 몸을 부르르 턴다
      f.headRoll = Math.sin(e * 40) * 0.25 * fade;
      f.bodyRoll = Math.sin(e * 40 + 1) * 0.12 * fade;
      f.arms = [
        { swing: -0.6 * fade, spread: 0.9 * fade },
        { swing: -0.6 * fade, spread: 0.9 * fade },
      ];
      return f;
    case 'snow':
      // 뒤로 휘청
      f.bodyPitch = base.bodyPitch - Math.sin(Math.min(1, e / 0.5) * Math.PI) * 0.35;
      f.headPitch = -0.3 * fade;
      return f;
    case 'ray':
      // 빙글 한 바퀴 반
      f.bodyYaw = Math.min(1, e / 0.8) * Math.PI * 3;
      f.arms = [
        { swing: -1.2 * fade, spread: 1 * fade },
        { swing: -1.2 * fade, spread: 1 * fade },
      ];
      return f;
  }
}
