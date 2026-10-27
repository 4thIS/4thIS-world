import { FLOOR_HEIGHT, type Building, type Vec2 } from '@4this/shared';
import { WALL_NORMALS, type DoorInfo, type WallSide } from './layout';

/**
 * 건물 껍데기 계산 (순수 함수). 벽 하나를 "벽 좌표"(u: 벽을 따라, v: 위로)로 다룬다.
 * 컴포넌트는 결과 사각형을 상자로 만들어 합친다.
 */

export const WALL_T = 0.2;
export const SLAB_T = 0.15;
/** 바닥판 윗면을 층 높이보다 이만큼 올린다 (잔디·아래층과 겹쳐 깜빡이지 않게) */
export const SLAB_LIFT = 0.02;
export const WINDOW_W = 1.2;
export const WINDOW_SILL = 1.0;
export const WINDOW_TOP = 2.3;
export const DOOR_W = 1.6;
export const DOOR_H = 2.4;
export const PARAPET_H = 0.6;
export const STAIR_RUN = 3;
export const STAIR_STEPS = 10;

export const WALL_SIDES: readonly WallSide[] = ['n', 'e', 's', 'w'];

/** n층 바닥 높이 */
export const floorY = (floor: number) => (floor - 1) * FLOOR_HEIGHT;

export interface Rect {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

export interface WallFrame {
  side: WallSide;
  /** 벽 두께 가운데 선에서 u = 0인 점 */
  origin: Vec2;
  /** u가 커지는 방향 (단위 벡터) */
  dir: Vec2;
  length: number;
  normal: Vec2;
}

/** 벽 하나의 좌표틀. 남·북 벽이 모서리를 차지하고 동·서 벽은 그 사이에 낀다 */
export function wallFrame(b: Pick<Building, 'min' | 'max'>, side: WallSide): WallFrame {
  const [x0, z0] = b.min;
  const [x1, z1] = b.max;
  const h = WALL_T / 2;
  const normal = WALL_NORMALS[side];
  switch (side) {
    case 'n':
      return { side, origin: [x0, z0 + h], dir: [1, 0], length: x1 - x0, normal };
    case 's':
      return { side, origin: [x0, z1 - h], dir: [1, 0], length: x1 - x0, normal };
    case 'w':
      return {
        side,
        origin: [x0 + h, z0 + WALL_T],
        dir: [0, 1],
        length: z1 - z0 - WALL_T * 2,
        normal,
      };
    case 'e':
      return {
        side,
        origin: [x1 - h, z0 + WALL_T],
        dir: [0, 1],
        length: z1 - z0 - WALL_T * 2,
        normal,
      };
  }
}

/** 벽 좌표 u → 월드 (x, z) */
export function wallPoint(f: WallFrame, u: number): Vec2 {
  return [f.origin[0] + f.dir[0] * u, f.origin[1] + f.dir[1] * u];
}

/** 월드 점을 벽 좌표 u로 (벽 위로 투영) */
export function wallU(f: WallFrame, p: Vec2): number {
  return (p[0] - f.origin[0]) * f.dir[0] + (p[1] - f.origin[1]) * f.dir[1];
}

/** 이 벽·층의 구멍 (문 + 창문). 1층 문 벽이면 문을 내고 문과 겹치는 창은 뺀다 */
export function wallOpenings(f: WallFrame, floor: number, door: DoorInfo | null): Rect[] {
  const out: Rect[] = [];
  let doorU: number | null = null;
  if (door && floor === 1 && door.side === f.side) {
    doorU = wallU(f, door.pos);
    out.push({ u0: doorU - DOOR_W / 2, u1: doorU + DOOR_W / 2, v0: 0, v1: DOOR_H });
  }
  const n = Math.max(1, Math.floor((f.length - 0.8) / 2.6));
  const spacing = f.length / n;
  for (let i = 0; i < n; i++) {
    const c = spacing * (i + 0.5);
    if (doorU !== null && Math.abs(c - doorU) < (DOOR_W + WINDOW_W) / 2 + 0.3) continue;
    out.push({ u0: c - WINDOW_W / 2, u1: c + WINDOW_W / 2, v0: WINDOW_SILL, v1: WINDOW_TOP });
  }
  return out.sort((a, b) => a.u0 - b.u0);
}

/** 길이 length·높이 height 벽에서 구멍을 뺀 나머지 조각들 */
export function wallPieces(length: number, height: number, openings: readonly Rect[]): Rect[] {
  const out: Rect[] = [];
  let cursor = 0;
  for (const o of [...openings].sort((a, b) => a.u0 - b.u0)) {
    if (o.u0 > cursor) out.push({ u0: cursor, u1: o.u0, v0: 0, v1: height });
    if (o.v0 > 0) out.push({ u0: o.u0, u1: o.u1, v0: 0, v1: o.v0 });
    if (o.v1 < height) out.push({ u0: o.u0, u1: o.u1, v0: o.v1, v1: height });
    cursor = Math.max(cursor, o.u1);
  }
  if (cursor < length) out.push({ u0: cursor, u1: length, v0: 0, v1: height });
  return out;
}

/** 컷어웨이 때 남기는 테두리선: 벽 바깥 사각형 + 구멍마다 사각형. [u0, v0, u1, v1] 선분 */
export function wallOutline(
  length: number,
  height: number,
  openings: readonly Rect[],
): [number, number, number, number][] {
  const rect = (r: Rect): [number, number, number, number][] => [
    [r.u0, r.v0, r.u1, r.v0],
    [r.u1, r.v0, r.u1, r.v1],
    [r.u1, r.v1, r.u0, r.v1],
    [r.u0, r.v1, r.u0, r.v0],
  ];
  return [...rect({ u0: 0, u1: length, v0: 0, v1: height }), ...openings.flatMap(rect)];
}

export interface Box2 {
  min: Vec2;
  max: Vec2;
}

/** 사각형에서 구멍 하나를 뺀 나머지 (최대 4조각). 바닥판 계단 구멍에 쓴다 */
export function rectMinus(outer: Box2, hole: Box2 | null): Box2[] {
  if (!hole) return [outer];
  const hx0 = Math.max(outer.min[0], hole.min[0]);
  const hx1 = Math.min(outer.max[0], hole.max[0]);
  const hz0 = Math.max(outer.min[1], hole.min[1]);
  const hz1 = Math.min(outer.max[1], hole.max[1]);
  if (hx0 >= hx1 || hz0 >= hz1) return [outer];
  const out: Box2[] = [];
  if (hz0 > outer.min[1]) out.push({ min: outer.min, max: [outer.max[0], hz0] });
  if (hz1 < outer.max[1]) out.push({ min: [outer.min[0], hz1], max: outer.max });
  if (hx0 > outer.min[0]) out.push({ min: [outer.min[0], hz0], max: [hx0, hz1] });
  if (hx1 < outer.max[0]) out.push({ min: [hx1, hz0], max: [outer.max[0], hz1] });
  return out;
}

export interface StairSpec {
  /** 첫 계단 앞쪽 가장자리의 가운데 */
  start: Vec2;
  /** 올라가는 방향 */
  dir: WallSide;
  width: number;
}

/** 계단이 차지하는 바닥 사각형 (위층 바닥판에 같은 크기 구멍을 낸다) */
export function stairHole(s: StairSpec): Box2 {
  const [dx, dz] = WALL_NORMALS[s.dir];
  const end: Vec2 = [s.start[0] + dx * STAIR_RUN, s.start[1] + dz * STAIR_RUN];
  const half = s.width / 2;
  const xs = dx === 0 ? [s.start[0] - half, s.start[0] + half] : [s.start[0], end[0]];
  const zs = dz === 0 ? [s.start[1] - half, s.start[1] + half] : [s.start[1], end[1]];
  return {
    min: [Math.min(xs[0]!, xs[1]!), Math.min(zs[0]!, zs[1]!)],
    max: [Math.max(xs[0]!, xs[1]!), Math.max(zs[0]!, zs[1]!)],
  };
}

export interface Block {
  /** 가운데 (x, y, z). y는 그 층 바닥 기준 */
  center: [number, number, number];
  size: [number, number, number];
}

/** 계단 블록들 (꽉 찬 계단). 한 층 높이를 STAIR_STEPS칸으로 오른다 */
export function stairBlocks(s: StairSpec): Block[] {
  const [dx, dz] = WALL_NORMALS[s.dir];
  const depth = STAIR_RUN / STAIR_STEPS;
  const rise = FLOOR_HEIGHT / STAIR_STEPS;
  return Array.from({ length: STAIR_STEPS }, (_, i) => {
    const d = depth * (i + 0.5);
    const h = rise * (i + 1);
    return {
      center: [s.start[0] + dx * d, h / 2, s.start[1] + dz * d],
      size: dx === 0 ? [s.width, h, depth] : [depth, h, s.width],
    };
  });
}
