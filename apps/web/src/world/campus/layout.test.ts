import { describe, expect, it } from 'vitest';
import { CAMPUS, type Vec2 } from '@4this/shared';
import {
  BUSHES,
  distToSegment,
  doorPoint,
  FLOWER_BEDS,
  inBuilding,
  inPond,
  lampHead,
  lampSpots,
  onBoard,
  onPath,
  pathSegments,
  pondCircle,
  paverTiles,
  scatterGrass,
  scatterInDisc,
  seededRandom,
  onTerrace,
  TERRACE,
  TRASH_CANS,
  TREES,
} from './layout';

const segs = pathSegments(CAMPUS);

describe('doorPoint', () => {
  it('문 노드에 가장 가까운 벽에 문을 낸다', () => {
    const b = CAMPUS.buildings;
    expect(doorPoint(b.eng, CAMPUS.graph.nodes['eng-door']!)).toEqual({ side: 'w', pos: [12, -2] });
    expect(doorPoint(b.main, CAMPUS.graph.nodes['main-door']!)).toEqual({
      side: 's',
      pos: [0, -11],
    });
    expect(doorPoint(b.lab, CAMPUS.graph.nodes['lab-door']!)).toEqual({
      side: 's',
      pos: [-15, -11],
    });
    expect(doorPoint(b.cafe, CAMPUS.graph.nodes['cafe-door']!)).toEqual({
      side: 'e',
      pos: [-12, 10],
    });
  });

  it('모서리 근처면 벽 안쪽으로 당긴다', () => {
    expect(doorPoint({ min: [0, 0], max: [4, 4] }, [10, 3.9])).toEqual({
      side: 'e',
      pos: [4, 2.8],
    });
  });
});

describe('pondCircle', () => {
  it('연못은 원 충돌체와 같은 자리·크기다', () => {
    expect(pondCircle(CAMPUS)).toEqual({ center: [-15, 0], r: 3.5 });
  });
});

describe('pathSegments', () => {
  it('간선마다 길 하나 + 건물 4개 문 + 정문 밖', () => {
    expect(segs).toHaveLength(CAMPUS.graph.edges.length + 4 + 1);
  });

  it('모든 그래프 노드는 길 위에 있다', () => {
    for (const p of Object.values(CAMPUS.graph.nodes)) expect(onPath(p, segs)).toBe(true);
  });
});

describe('paverTiles', () => {
  const tiles = paverTiles(segs, CAMPUS);

  it('충분히 많이 깔리고, 서로 0.42 m보다 가깝게 겹치지 않는다', () => {
    expect(tiles.length).toBeGreaterThan(500);
    // 쌍마다 expect를 부르면 수십만 번이라 느리다. 가장 가까운 거리 하나만 검사한다
    let min = Infinity;
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        min = Math.min(min, Math.hypot(tiles[i]!.x - tiles[j]!.x, tiles[i]!.z - tiles[j]!.z));
      }
    }
    expect(min).toBeGreaterThanOrEqual(0.42);
  });

  it('건물 안이나 판 밖에는 없다', () => {
    for (const t of tiles) {
      expect(inBuilding([t.x, t.z], CAMPUS, -0.05)).toBe(false);
      expect(onBoard([t.x, t.z], 0.4)).toBe(true);
    }
  });

  it('같은 입력이면 같은 결과', () => {
    expect(paverTiles(segs, CAMPUS)).toEqual(tiles);
  });
});

describe('seededRandom', () => {
  it('같은 seed면 같은 수열, [0, 1) 범위, 고르게 퍼진다', () => {
    const a = seededRandom('x');
    const b = seededRandom('x');
    const xs = Array.from({ length: 2000 }, () => a());
    expect(Array.from({ length: 2000 }, () => b())).toEqual(xs);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    // 10칸 히스토그램이 각각 150~250개 (치우침 없음)
    const bins = Array.from({ length: 10 }, (_, k) => xs.filter((v) => Math.floor(v * 10) === k));
    for (const bin of bins) expect(bin.length).toBeGreaterThan(150);
    for (const bin of bins) expect(bin.length).toBeLessThan(250);
  });
});

describe('scatterInDisc', () => {
  it('모든 점이 원 안에 있고, 사분면마다 고르게 있다', () => {
    const pts = scatterInDisc([2, 3], 1.5, 400, 'bed');
    for (const p of pts) expect(Math.hypot(p[0] - 2, p[1] - 3)).toBeLessThanOrEqual(1.5);
    const quad = [0, 0, 0, 0];
    for (const p of pts) quad[(p[0] > 2 ? 1 : 0) + (p[1] > 3 ? 2 : 0)]! += 1;
    for (const q of quad) expect(q).toBeGreaterThan(70);
  });
});

describe('scatterGrass', () => {
  const blades = scatterGrass(CAMPUS, segs, 3000);

  it('길·건물·연못을 피하고 결정적이다', () => {
    expect(blades.length).toBeGreaterThan(1500);
    for (const b of blades) {
      const p: Vec2 = [b.x, b.z];
      expect(onPath(p, segs, 0.2)).toBe(false);
      expect(inBuilding(p, CAMPUS, 0.3)).toBe(false);
      expect(inPond(p, CAMPUS, 0.4)).toBe(false);
    }
    expect(scatterGrass(CAMPUS, segs, 3000)).toEqual(blades);
  });
});

describe('lampSpots', () => {
  const lamps = lampSpots(segs, CAMPUS);

  it('길 옆(길 위는 아님)에 4 m 이상 떨어져 놓인다', () => {
    expect(lamps.length).toBeGreaterThanOrEqual(8);
    for (const l of lamps) {
      expect(onPath(l.pos, segs, 0.25)).toBe(false);
      expect(onPath(l.pos, segs, 1.2)).toBe(true);
      expect(inBuilding(l.pos, CAMPUS, 0.8)).toBe(false);
    }
    for (let i = 0; i < lamps.length; i++) {
      for (let j = i + 1; j < lamps.length; j++) {
        const d = Math.hypot(
          lamps[i]!.pos[0] - lamps[j]!.pos[0],
          lamps[i]!.pos[1] - lamps[j]!.pos[1],
        );
        expect(d).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('전구는 기둥보다 길에 더 가깝고 3 m 위에 있다', () => {
    const nearest = (p: Vec2) => Math.min(...segs.map((s) => distToSegment(p, s.a, s.b)));
    for (const l of lamps) {
      const [x, y, z] = lampHead(l);
      expect(y).toBeGreaterThan(3);
      expect(nearest([x, z])).toBeLessThan(nearest(l.pos));
    }
  });

  it('팔(모델 -x)이 길 쪽을 본다', () => {
    for (const l of lamps) {
      const arm: Vec2 = [l.pos[0] - Math.cos(l.rotY) * 1, l.pos[1] + Math.sin(l.rotY) * 1];
      expect(onPath(arm, segs, 0.25)).toBe(true);
    }
  });
});

describe('꾸밈 배치', () => {
  it('나무는 길·건물·연못과 겹치지 않고 판 안에 있다', () => {
    for (const t of TREES) {
      expect(onPath(t.pos, segs, 1.1 * t.scale)).toBe(false);
      expect(inBuilding(t.pos, CAMPUS, 1.2 * t.scale)).toBe(false);
      expect(inPond(t.pos, CAMPUS, 1)).toBe(false);
      expect(onBoard(t.pos, 1.2)).toBe(true);
      for (const s of [...CAMPUS.parkSpots, ...CAMPUS.benchSpots]) {
        expect(Math.hypot(s.pos[0] - t.pos[0], s.pos[1] - t.pos[1])).toBeGreaterThan(1.5);
      }
    }
  });

  it('꽃밭·덤불·쓰레기통은 길·건물·연못 밖에 있다', () => {
    for (const f of FLOWER_BEDS) {
      expect(onPath(f.center, segs, f.r)).toBe(false);
      expect(inBuilding(f.center, CAMPUS, f.r)).toBe(false);
      expect(inPond(f.center, CAMPUS, f.r)).toBe(false);
    }
    for (const p of [...BUSHES, ...TRASH_CANS]) {
      expect(onPath(p, segs, 0.3)).toBe(false);
      expect(inBuilding(p, CAMPUS, 0.3)).toBe(false);
      expect(inPond(p, CAMPUS, 0.3)).toBe(false);
    }
  });

  it('벤치 자리(benchSpots)는 길·연못과 겹치지 않는다', () => {
    for (const s of CAMPUS.benchSpots) {
      expect(inPond(s.pos, CAMPUS, 0.5)).toBe(false);
      expect(onPath(s.pos, segs, 0.4)).toBe(false);
    }
  });
});

describe('카페 테라스', () => {
  const overflow = CAMPUS.places.cafe.overflow;
  const segs = pathSegments(CAMPUS);

  it('테라스 4자리(overflow 앞 4개)는 데크 안에 있고 데크는 길과 겹치지 않는다', () => {
    for (const s of overflow.slice(0, 4)) expect(onTerrace(s.pos)).toBe(true);
    const corners: Vec2[] = [
      TERRACE.min,
      TERRACE.max,
      [TERRACE.min[0], TERRACE.max[1]],
      [TERRACE.max[0], TERRACE.min[1]],
    ];
    for (const c of corners) expect(onPath(c, segs)).toBe(false);
  });

  it('카페 넘침 자리 근처(0.8 m)에 덤불·나무·가로등이 없다', () => {
    const lamps = lampSpots(segs, CAMPUS).map((l) => l.pos);
    const things: Vec2[] = [...BUSHES, ...TREES.map((t) => t.pos), ...lamps, ...TRASH_CANS];
    for (const s of overflow) {
      for (const t of things) {
        expect(Math.hypot(s.pos[0] - t[0], s.pos[1] - t[1])).toBeGreaterThan(0.8);
      }
    }
  });
});
