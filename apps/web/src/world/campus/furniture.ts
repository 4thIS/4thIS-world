import type { Seat, Vec2 } from '@4this/shared';
import type { ModelItem } from './models';

/**
 * 좌석 → 가구 위치 계산 (순수 함수). 가구는 항상 CAMPUS.places[*].seats에서 계산해
 * 캐릭터가 앉는 자리와 의자가 어긋나지 않게 한다. 좌석 하나 = 의자 하나.
 * Kenney 모델은 앞면(사람 쪽)이 +z다: 의자는 facing 그대로, 책상·모니터·노트북·책장은
 * 사람을 마주 보도록 facing + π로 돌린다.
 */

/** Kenney 책상(배율 2) 윗면 높이 */
export const DESK_TOP = 0.77;
/** 코드로 만든 테이블 윗면 높이 */
export const TABLE_TOP = 0.75;

/** facing 방향 단위 벡터 (0이면 +z) */
export function forward(facing: number): Vec2 {
  return [Math.sin(facing), Math.cos(facing)];
}

/** 좌석에서 바라보는 쪽으로 d만큼 간 점 */
export function ahead(seat: Seat, d: number): Vec2 {
  const [fx, fz] = forward(seat.facing);
  return [seat.pos[0] + fx * d, seat.pos[1] + fz * d];
}

/** 좌석 자리의 의자 */
export function chairAt(seat: Seat, y: number): ModelItem {
  return { pos: [seat.pos[0], y, seat.pos[1]], rotY: seat.facing };
}

/** 좌석 앞 d m에 놓고 앞면이 사람을 보게 한 물건 */
export function facingSeat(seat: Seat, d: number, y: number): ModelItem {
  const [x, z] = ahead(seat, d);
  return { pos: [x, y, z], rotY: seat.facing + Math.PI };
}

/** 좌석들의 가운데 */
export function centroid(seats: readonly Seat[]): Vec2 {
  const n = seats.length || 1;
  return [seats.reduce((s, x) => s + x.pos[0], 0) / n, seats.reduce((s, x) => s + x.pos[1], 0) / n];
}

export interface TableBox {
  center: Vec2;
  /** x 방향 길이, z 방향 길이 */
  size: Vec2;
}

/**
 * 둘러앉은 좌석들 사이의 테이블. 좌석 바운딩 박스를 사방 gap만큼 줄인다.
 * 한 방향으로만 늘어선 경우(2인 마주 보기 등)에는 그 방향 길이를 minSize로 둔다.
 */
export function tableBetween(seats: readonly Seat[], gap = 0.65, minSize = 0.8): TableBox {
  const xs = seats.map((s) => s.pos[0]);
  const zs = seats.map((s) => s.pos[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  const sideways = seats.some((s) => Math.abs(Math.sin(s.facing)) > 0.5);
  const along = seats.some((s) => Math.abs(Math.cos(s.facing)) > 0.5);
  const w = sideways ? x1 - x0 - gap * 2 : Math.max(minSize, x1 - x0 + minSize);
  const d = along ? z1 - z0 - gap * 2 : Math.max(minSize, z1 - z0 + minSize);
  return {
    center: [(x0 + x1) / 2, (z0 + z1) / 2],
    size: [Math.max(minSize, w), Math.max(minSize, d)],
  };
}

export interface ClassroomFurniture {
  chairs: ModelItem[];
  desks: ModelItem[];
  laptops: ModelItem[];
  screens: ModelItem[];
  keyboards: ModelItem[];
}

/** 강의실·연구실 자리: 좌석마다 의자 + 책상, 책상 위에 노트북과 PC를 번갈아 (짝수 번 노트북) */
export function classroomFurniture(seats: readonly Seat[], y: number): ClassroomFurniture {
  const out: ClassroomFurniture = {
    chairs: [],
    desks: [],
    laptops: [],
    screens: [],
    keyboards: [],
  };
  seats.forEach((seat, i) => {
    out.chairs.push(chairAt(seat, y));
    out.desks.push(facingSeat(seat, 0.7, y));
    if (i % 2 === 0) {
      out.laptops.push(facingSeat(seat, 0.72, y + DESK_TOP));
    } else {
      out.screens.push(facingSeat(seat, 0.9, y + DESK_TOP));
      out.keyboards.push(facingSeat(seat, 0.55, y + DESK_TOP));
    }
  });
  return out;
}

/** 좌석을 n개씩 묶는다 (table4 → 4개, table2 → 2개씩 데이터 순서대로) */
export function chunk<T>(items: readonly T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
  return out;
}

/** 같은 x에서 마주 보는 두 자리(남쪽을 보는 자리 + 북쪽을 보는 자리)를 한 테이블로 묶는다 */
export function facingPairs(seats: readonly Seat[]): Seat[][] {
  const used = new Set<number>();
  const out: Seat[][] = [];
  seats.forEach((a, i) => {
    if (used.has(i) || Math.cos(a.facing) < 0.5) return;
    const j = seats.findIndex(
      (b, k) =>
        !used.has(k) &&
        k !== i &&
        Math.cos(b.facing) < -0.5 &&
        Math.abs(b.pos[0] - a.pos[0]) < 0.1 &&
        b.pos[1] > a.pos[1],
    );
    if (j < 0) return;
    used.add(i);
    used.add(j);
    out.push([a, seats[j]!]);
  });
  return out;
}
