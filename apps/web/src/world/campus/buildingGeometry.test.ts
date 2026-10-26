import { describe, expect, it } from 'vitest';
import { BUILDING_IDS, CAMPUS, FLOOR_HEIGHT, PLACE_IDS, type Vec2 } from '@4this/shared';
import {
  DOOR_W,
  rectMinus,
  stairBlocks,
  stairHole,
  wallFrame,
  wallOpenings,
  wallOutline,
  wallPieces,
  wallPoint,
  WALL_T,
  type Rect,
} from './buildingGeometry';
import { BUILDING_STYLES } from './buildingStyles';
import { doorPoint } from './layout';

const area = (rs: readonly Rect[]) => rs.reduce((s, r) => s + (r.u1 - r.u0) * (r.v1 - r.v0), 0);

describe('wallFrame', () => {
  const eng = CAMPUS.buildings.eng; // [12,-9] ~ [20,5]

  it('남·북 벽은 모서리까지, 동·서 벽은 그 사이', () => {
    expect(wallFrame(eng, 'n')).toMatchObject({ origin: [12, -8.9], dir: [1, 0], length: 8 });
    expect(wallFrame(eng, 's')).toMatchObject({ origin: [12, 4.9], length: 8, normal: [0, 1] });
    const w = wallFrame(eng, 'w');
    expect(w.origin).toEqual([12.1, -9 + WALL_T]);
    expect(w.length).toBeCloseTo(14 - WALL_T * 2);
    expect(wallPoint(w, 2)).toEqual([12.1, -9 + WALL_T + 2]);
  });
});

describe('wallOpenings', () => {
  const eng = CAMPUS.buildings.eng;
  const door = doorPoint(eng, CAMPUS.graph.nodes[eng.doorNode]!);

  it('1층 문 벽에는 문이 있고 문과 겹치는 창은 없다', () => {
    const f = wallFrame(eng, 'w');
    const ops = wallOpenings(f, 1, door);
    const doors = ops.filter((o) => o.v0 === 0);
    expect(doors).toHaveLength(1);
    expect((doors[0]!.u0 + doors[0]!.u1) / 2).toBeCloseTo(-2 - (-9 + WALL_T));
    expect(doors[0]!.u1 - doors[0]!.u0).toBeCloseTo(DOOR_W);
    for (let i = 1; i < ops.length; i++) expect(ops[i]!.u0).toBeGreaterThan(ops[i - 1]!.u1);
  });

  it('2층에는 문이 없고 창만 있다', () => {
    const ops = wallOpenings(wallFrame(eng, 'w'), 2, door);
    expect(ops.every((o) => o.v0 > 0)).toBe(true);
    expect(ops.length).toBe(4);
  });
});

describe('wallPieces', () => {
  it('벽 넓이 = 전체 − 구멍', () => {
    const ops: Rect[] = [
      { u0: 1, u1: 2.2, v0: 1, v1: 2.3 },
      { u0: 3, u1: 4.6, v0: 0, v1: 2.4 },
    ];
    const pieces = wallPieces(6, FLOOR_HEIGHT, ops);
    expect(area(pieces)).toBeCloseTo(6 * FLOOR_HEIGHT - 1.2 * 1.3 - 1.6 * 2.4);
    // 문 아래에는 조각이 없다
    expect(pieces.some((p) => p.u0 === 3 && p.v0 === 0)).toBe(false);
  });

  it('구멍이 없으면 벽 한 장', () => {
    expect(wallPieces(5, 3.2, [])).toEqual([{ u0: 0, u1: 5, v0: 0, v1: 3.2 }]);
  });
});

describe('wallOutline', () => {
  it('바깥 4선 + 구멍마다 4선', () => {
    expect(wallOutline(5, 3.2, [{ u0: 1, u1: 2, v0: 1, v1: 2 }])).toHaveLength(8);
  });
});

describe('rectMinus', () => {
  it('구멍만큼 넓이가 준다', () => {
    const outer = { min: [0, 0] as const, max: [10, 8] as const };
    const pieces = rectMinus(outer, { min: [7, 1], max: [8, 4] });
    const a = pieces.reduce((s, p) => s + (p.max[0] - p.min[0]) * (p.max[1] - p.min[1]), 0);
    expect(a).toBeCloseTo(80 - 3);
    expect(pieces).toHaveLength(4);
  });

  it('구멍이 없거나 밖에 있으면 그대로', () => {
    const outer = { min: [0, 0] as const, max: [2, 2] as const };
    expect(rectMinus(outer, null)).toEqual([outer]);
    expect(rectMinus(outer, { min: [5, 5], max: [6, 6] })).toEqual([outer]);
  });
});

describe('stairs', () => {
  const spec = { start: [19.3, 3.4] as const, dir: 'n' as const, width: 1 };

  it('구멍은 올라가는 방향으로 3 m, 폭만큼', () => {
    const h = stairHole(spec);
    expect(h.min[0]).toBeCloseTo(18.8);
    expect(h.max[0]).toBeCloseTo(19.8);
    expect(h.min[1]).toBeCloseTo(0.4);
    expect(h.max[1]).toBeCloseTo(3.4);
  });

  it('마지막 계단 윗면이 한 층 높이', () => {
    const blocks = stairBlocks(spec);
    expect(blocks).toHaveLength(10);
    const top = blocks[9]!;
    expect(top.center[1] + top.size[1] / 2).toBeCloseTo(FLOOR_HEIGHT);
    expect(top.center[2]).toBeLessThan(blocks[0]!.center[2]);
  });
});

describe('BUILDING_STYLES 계단', () => {
  const inside = (p: Vec2, min: Vec2, max: Vec2, m: number) =>
    p[0] > min[0] - m && p[0] < max[0] + m && p[1] > min[1] - m && p[1] < max[1] + m;

  it('여러 층 건물만 계단이 있고, 계단은 건물 안에 있다', () => {
    for (const id of BUILDING_IDS) {
      const b = CAMPUS.buildings[id];
      const stairs = BUILDING_STYLES[id].stairs;
      expect(stairs !== null).toBe(b.floors > 1);
      if (!stairs) continue;
      const h = stairHole(stairs);
      expect(h.min[0]).toBeGreaterThanOrEqual(b.min[0] + WALL_T - 1e-9);
      expect(h.max[0]).toBeLessThanOrEqual(b.max[0] - WALL_T + 1e-9);
      expect(h.min[1]).toBeGreaterThanOrEqual(b.min[1] + WALL_T - 1e-9);
      expect(h.max[1]).toBeLessThanOrEqual(b.max[1] - WALL_T + 1e-9);
    }
  });

  it('계단참·좌석·넘침 자리가 계단(구멍)과 겹치지 않는다', () => {
    for (const pid of PLACE_IDS) {
      const place = CAMPUS.places[pid];
      const stairs = BUILDING_STYLES[place.building].stairs;
      if (!stairs) continue;
      const h = stairHole(stairs);
      for (const p of [
        place.landing,
        ...place.seats.map((s) => s.pos),
        ...place.overflow.map((s) => s.pos),
      ]) {
        expect(inside(p, h.min, h.max, 0.3), `${pid} ${p.join(',')}`).toBe(false);
      }
    }
  });
});
