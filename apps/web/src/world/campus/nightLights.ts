import type { BuildingId } from '@4this/shared';
import type { FloorKey } from '../contracts';
import { mixHex } from './pastel';

/** 창유리 기본 불투명도 (낮·불 꺼진 층) */
export const GLASS_OPACITY = 0.45;
export const WINDOW_LIGHT = '#ffc46b';
export const GLASS_COLOR = '#d6ecfa';

/** occupiedFloors('eng:2' 같은 키)에서 이 건물의 층 번호만 뽑는다 */
export function litFloorsOf(occupied: ReadonlySet<FloorKey>, id: BuildingId): Set<number> {
  const out = new Set<number>();
  for (const key of occupied) {
    const [b, f] = key.split(':');
    if (b === id && f) out.add(Number(f));
  }
  return out;
}

/** 창문 하나의 밤 불빛: 사람이 있는 층만 night만큼 켜진다 */
export function windowGlow(
  night: number,
  lit: boolean,
): { color: string; emissive: number; opacity: number } {
  const k = lit ? Math.max(0, Math.min(1, night)) : 0;
  return {
    color: mixHex(GLASS_COLOR, WINDOW_LIGHT, k),
    emissive: 1.2 * k,
    opacity: GLASS_OPACITY + (0.95 - GLASS_OPACITY) * k,
  };
}
