import { describe, expect, it } from 'vitest';
import { CAMPUS, type Seat } from '@4this/shared';
import {
  ahead,
  centroid,
  chunk,
  classroomFurniture,
  DESK_TOP,
  facingPairs,
  forward,
  tableBetween,
} from './furniture';

const N = 0;
const S = Math.PI;

describe('forward / ahead', () => {
  it('facing 0은 +z, π는 -z, π/2는 +x', () => {
    expect(forward(0)[1]).toBeCloseTo(1);
    expect(forward(Math.PI)[1]).toBeCloseTo(-1);
    expect(forward(Math.PI / 2)[0]).toBeCloseTo(1);
    const p = ahead({ pos: [1, 1], facing: S }, 2);
    expect(p[0]).toBeCloseTo(1);
    expect(p[1]).toBeCloseTo(-1);
  });
});

describe('classroomFurniture', () => {
  const seats = CAMPUS.places['eng-1f'].seats;
  const f = classroomFurniture(seats, 3.2);

  it('좌석 하나 = 의자 하나, 의자는 좌석 자리·방향 그대로', () => {
    expect(f.chairs).toHaveLength(seats.length);
    f.chairs.forEach((c, i) => {
      expect(c.pos).toEqual([seats[i]!.pos[0], 3.2, seats[i]!.pos[1]]);
      expect(c.rotY).toBe(seats[i]!.facing);
    });
  });

  it('책상은 좌석 앞 0.7 m에서 사람을 마주 본다', () => {
    f.desks.forEach((d, i) => {
      const s = seats[i]!;
      const [fx, fz] = forward(s.facing);
      expect(d.pos[0]).toBeCloseTo(s.pos[0] + fx * 0.7);
      expect(d.pos[2]).toBeCloseTo(s.pos[1] + fz * 0.7);
      expect(d.rotY).toBeCloseTo(s.facing + Math.PI);
    });
  });

  it('노트북과 PC(모니터+키보드)를 번갈아 책상 위에 둔다', () => {
    expect(f.laptops).toHaveLength(3);
    expect(f.screens).toHaveLength(3);
    expect(f.keyboards).toHaveLength(3);
    for (const l of [...f.laptops, ...f.screens]) expect(l.pos[1]).toBeCloseTo(3.2 + DESK_TOP);
  });

  it('책상은 건물 안에 있다', () => {
    const b = CAMPUS.buildings.eng;
    for (const d of f.desks) {
      expect(d.pos[0]).toBeGreaterThan(b.min[0] + 0.9);
      expect(d.pos[0]).toBeLessThan(b.max[0] - 0.9);
      expect(d.pos[2]).toBeGreaterThan(b.min[1] + 0.6);
    }
  });
});

describe('centroid / tableBetween', () => {
  it('연구동 2F 큰 테이블은 6자리 가운데에 있고 의자와 겹치지 않는다', () => {
    const seats = CAMPUS.places['lab-2f'].seats;
    const t = tableBetween(seats);
    const c = centroid(seats);
    expect(t.center[0]).toBeCloseTo(c[0]);
    expect(t.center[1]).toBeCloseTo(c[1]);
    for (const s of seats) {
      const dx = Math.abs(s.pos[0] - t.center[0]) - t.size[0] / 2;
      const dz = Math.abs(s.pos[1] - t.center[1]) - t.size[1] / 2;
      // 좌석은 테이블 가장자리에서 0.3 m 이상 바깥에 있다
      expect(Math.max(dx, dz)).toBeGreaterThanOrEqual(0.3);
    }
  });

  it('마주 보는 2인 자리는 그 사이에 작은 테이블', () => {
    const seats: Seat[] = [
      { pos: [0, -0.7], facing: N },
      { pos: [0, 0.7], facing: S },
    ];
    const t = tableBetween(seats);
    expect(t.center).toEqual([0, 0]);
    expect(t.size[0]).toBeCloseTo(0.8);
    expect(t.size[1]).toBeCloseTo(0.8);
  });
});

describe('chunk', () => {
  it('식당 16자리는 4인 테이블 4개, 가운데가 데이터의 테이블 중심', () => {
    const tables = chunk(CAMPUS.places['main-1f'].seats, 4).map((g) => tableBetween(g));
    expect(tables.map((t) => t.center)).toEqual([
      [-5.5, -15],
      [-2, -15],
      [1.5, -15],
      [5, -15],
    ]);
  });

  it('카페 8자리는 2인 테이블 4개', () => {
    expect(chunk(CAMPUS.places.cafe.seats, 2)).toHaveLength(4);
  });
});

describe('facingPairs', () => {
  it('카페 테라스 4자리 → 2인 테이블 2개 (같은 x, 마주 봄)', () => {
    const pairs = facingPairs(CAMPUS.places.cafe.overflow);
    expect(pairs).toHaveLength(2);
    for (const [a, b] of pairs) {
      expect(a!.pos[0]).toBe(b!.pos[0]);
      expect(b!.pos[1]).toBeGreaterThan(a!.pos[1]);
    }
  });
});
