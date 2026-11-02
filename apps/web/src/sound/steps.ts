import { CAMPUS, FLOOR_HEIGHT, type Vec2 } from '@4this/shared';
import { inBuilding, onPath, onTerrace, pathSegments } from '../world/campus/layout';

/** 발소리가 나는 바닥 */
export type Surface = 'path' | 'grass' | 'indoor' | 'stairs';

const SEGS = pathSegments(CAMPUS);

/** 그 자리 바닥: 건물 안(층 사이 높이면 계단) · 길·광장·테라스 · 잔디 */
export function surfaceAt(x: number, y: number, z: number): Surface {
  const p: Vec2 = [x, z];
  if (inBuilding(p, CAMPUS)) {
    const between = y % FLOOR_HEIGHT;
    return between > 0.05 && between < FLOOR_HEIGHT - 0.05 ? 'stairs' : 'indoor';
  }
  if (onPath(p, SEGS, 0.1) || onTerrace(p)) return 'path';
  return 'grass';
}

/** 한 걸음 길이 (m). 캐릭터 보폭에 맞춘다 */
export const STRIDE = 0.55;

/**
 * 걸은 거리를 모아 한 걸음마다 true. 순간이동(한 프레임에 1.5 m 넘게)은 걸음으로 치지 않는다.
 * 상태는 호출하는 쪽(캐릭터마다)이 들고 있는다.
 */
export function stepTick(carry: number, moved: number): { carry: number; step: boolean } {
  if (moved > 1.5) return { carry: 0, step: false };
  const next = carry + moved;
  return next >= STRIDE ? { carry: next - STRIDE, step: true } : { carry: next, step: false };
}

/**
 * Kenney "Impact Sounds"(CC0) 발소리 파일. public/sound/steps/에 두면 쓰고, 없으면 합성 발소리로 낸다.
 * 바닥 → 파일 이름 앞부분 (뒤에 _000~_004.ogg)
 */
export const STEP_FILE_PREFIX: Record<Surface, string> = {
  path: 'footstep_concrete',
  grass: 'footstep_grass',
  indoor: 'footstep_wood',
  stairs: 'footstep_wood',
};
export const STEP_FILE_COUNT = 5;

export function stepFileUrls(): string[] {
  const prefixes = [...new Set(Object.values(STEP_FILE_PREFIX))];
  return prefixes.flatMap((p) =>
    Array.from(
      { length: STEP_FILE_COUNT },
      (_, i) => `/sound/steps/${p}_${String(i).padStart(3, '0')}.ogg`,
    ),
  );
}

/** 발소리를 낼 캐릭터 수 (내 캐릭터 말고, 카메라에서 가까운 순) */
export const STEP_VOICES = 4;

/** 카메라에서 가까운 n명 (화면에 보이는 캐릭터만) */
export function nearest(
  members: Iterable<{ id: string; x: number; y: number; z: number }>,
  from: { x: number; y: number; z: number },
  n: number,
): string[] {
  return [...members]
    .map((m) => ({ id: m.id, d: Math.hypot(m.x - from.x, m.y - from.y, m.z - from.z) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((m) => m.id);
}
