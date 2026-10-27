import { BoxGeometry, BufferGeometry, Float32BufferAttribute, PlaneGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FLOOR_HEIGHT, type Building } from '@4this/shared';
import {
  floorY,
  PARAPET_H,
  rectMinus,
  SLAB_LIFT,
  SLAB_T,
  stairBlocks,
  stairHole,
  wallFrame,
  wallOpenings,
  wallOutline,
  wallPieces,
  WALL_SIDES,
  WALL_T,
  type Block,
  type Box2,
  type StairSpec,
  type WallFrame,
} from './buildingGeometry';
import type { DoorInfo, WallSide } from './layout';

/**
 * 건물 껍데기를 three 지오메트리로 만든다. 벽 한 면·한 층의 상자들은 하나로 합쳐
 * (벽 면 × 층)마다 드로우콜 1개가 되게 한다.
 */

/** 상자 목록 → 합친 지오메트리 하나 */
export function mergeBlocks(blocks: readonly Block[]): BufferGeometry {
  const parts = blocks.map((b) =>
    new BoxGeometry(b.size[0], b.size[1], b.size[2]).translate(
      b.center[0],
      b.center[1],
      b.center[2],
    ),
  );
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return merged;
}

/** 벽 좌표 사각형(u, v) → 그 벽 위의 월드 상자 */
function wallBlock(
  f: WallFrame,
  y0: number,
  r: { u0: number; u1: number; v0: number; v1: number },
  depth = WALL_T,
): Block {
  const uc = (r.u0 + r.u1) / 2;
  const w = r.u1 - r.u0;
  const h = r.v1 - r.v0;
  const along = f.dir[0] !== 0;
  return {
    center: [f.origin[0] + f.dir[0] * uc, y0 + (r.v0 + r.v1) / 2, f.origin[1] + f.dir[1] * uc],
    size: along ? [w, h, depth] : [depth, h, w],
  };
}

export interface WallFloorGeometry {
  wall: BufferGeometry;
  outline: BufferGeometry;
  /** 창유리 (없으면 null) */
  glass: BufferGeometry | null;
}

export interface ShellGeometry {
  /** walls[side][floor - 1] */
  walls: Record<WallSide, WallFloorGeometry[]>;
  /** slabs[floor - 1]: 그 층 바닥판 (위층은 계단 구멍) */
  slabs: BufferGeometry[];
  /** stairs[floor - 1]: 그 층에서 위층으로 오르는 계단. 없으면 null */
  stairs: (BufferGeometry | null)[];
  /** 옥상 바닥 + 난간 */
  roof: BufferGeometry;
  /** 1층 문틀 + 차양 */
  doorFrame: BufferGeometry;
}

function outlineGeometry(f: WallFrame, y0: number, segs: [number, number, number, number][]) {
  const out = WALL_T / 2 + 0.01; // 바깥 면에 살짝 띄운다
  const ox = f.normal[0] * out;
  const oz = f.normal[1] * out;
  const pos: number[] = [];
  for (const [u0, v0, u1, v1] of segs) {
    pos.push(
      f.origin[0] + f.dir[0] * u0 + ox,
      y0 + v0,
      f.origin[1] + f.dir[1] * u0 + oz,
      f.origin[0] + f.dir[0] * u1 + ox,
      y0 + v1,
      f.origin[1] + f.dir[1] * u1 + oz,
    );
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}

function glassGeometry(
  f: WallFrame,
  y0: number,
  windows: { u0: number; u1: number; v0: number; v1: number }[],
) {
  if (windows.length === 0) return null;
  const parts = windows.map((r) => {
    const uc = (r.u0 + r.u1) / 2;
    const g = new PlaneGeometry(r.u1 - r.u0, r.v1 - r.v0);
    // 평면 기본 법선 +z → 벽 바깥 법선 쪽으로 돌린다
    g.rotateY(Math.atan2(f.normal[0], f.normal[1]));
    g.translate(f.origin[0] + f.dir[0] * uc, y0 + (r.v0 + r.v1) / 2, f.origin[1] + f.dir[1] * uc);
    return g;
  });
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return merged;
}

/** 건물 하나의 껍데기 전체 */
export function buildShell(
  b: Pick<Building, 'min' | 'max' | 'floors'>,
  door: DoorInfo,
  stairs: StairSpec | null,
): ShellGeometry {
  const walls = {} as Record<WallSide, WallFloorGeometry[]>;
  for (const side of WALL_SIDES) {
    const f = wallFrame(b, side);
    walls[side] = Array.from({ length: b.floors }, (_, i) => {
      const floor = i + 1;
      const y0 = floorY(floor);
      const openings = wallOpenings(f, floor, door);
      const pieces = wallPieces(f.length, FLOOR_HEIGHT, openings);
      return {
        wall: mergeBlocks(pieces.map((r) => wallBlock(f, y0, r))),
        outline: outlineGeometry(f, y0, wallOutline(f.length, FLOOR_HEIGHT, openings)),
        glass: glassGeometry(
          f,
          y0,
          openings.filter((o) => o.v0 > 0),
        ),
      };
    });
  }

  const outer: Box2 = { min: b.min, max: b.max };
  const hole = stairs ? stairHole(stairs) : null;
  const slabs = Array.from({ length: b.floors }, (_, i) => {
    const top = floorY(i + 1) + SLAB_LIFT;
    const rects = rectMinus(outer, i === 0 ? null : hole);
    return mergeBlocks(
      rects.map((r) => ({
        center: [(r.min[0] + r.max[0]) / 2, top - SLAB_T / 2, (r.min[1] + r.max[1]) / 2],
        size: [r.max[0] - r.min[0], SLAB_T, r.max[1] - r.min[1]],
      })),
    );
  });

  const stairGeos = Array.from({ length: b.floors }, (_, i) => {
    if (!stairs || i + 1 >= b.floors) return null;
    const y = floorY(i + 1) + SLAB_LIFT;
    return mergeBlocks(
      stairBlocks(stairs).map((s) => ({
        center: [s.center[0], s.center[1] + y, s.center[2]],
        size: s.size,
      })),
    );
  });

  const roofY = floorY(b.floors + 1);
  const roofBlocks: Block[] = [
    {
      center: [(b.min[0] + b.max[0]) / 2, roofY, (b.min[1] + b.max[1]) / 2],
      size: [b.max[0] - b.min[0] + 0.2, 0.2, b.max[1] - b.min[1] + 0.2],
    },
  ];
  for (const side of WALL_SIDES) {
    const f = wallFrame(b, side);
    roofBlocks.push(
      wallBlock(f, roofY + 0.1, { u0: -0.1, u1: f.length + 0.1, v0: 0, v1: PARAPET_H }, 0.3),
    );
  }

  const df = wallFrame(b, door.side);
  const du = (door.pos[0] - df.origin[0]) * df.dir[0] + (door.pos[1] - df.origin[1]) * df.dir[1];
  const frame = (u0: number, u1: number, v0: number, v1: number, depth: number, push: number) => {
    const blk = wallBlock(df, 0, { u0, u1, v0, v1 }, depth);
    blk.center[0] += df.normal[0] * push;
    blk.center[2] += df.normal[1] * push;
    return blk;
  };
  const doorFrame = mergeBlocks([
    frame(du - 0.95, du - 0.8, 0, 2.55, 0.34, 0.03),
    frame(du + 0.8, du + 0.95, 0, 2.55, 0.34, 0.03),
    frame(du - 0.95, du + 0.95, 2.4, 2.55, 0.34, 0.03),
    // 차양
    frame(du - 1.2, du + 1.2, 2.75, 2.87, 1.1, 0.55),
  ]);

  return { walls, slabs, stairs: stairGeos, roof: mergeBlocks(roofBlocks), doorFrame };
}

/** 지오메트리를 모두 정리한다 (건물이 사라질 때) */
export function disposeShell(s: ShellGeometry) {
  for (const side of WALL_SIDES) {
    for (const w of s.walls[side]) {
      w.wall.dispose();
      w.outline.dispose();
      w.glass?.dispose();
    }
  }
  for (const g of [...s.slabs, ...s.stairs, s.roof, s.doorFrame]) g?.dispose();
}
