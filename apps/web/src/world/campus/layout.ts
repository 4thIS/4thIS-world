import { hashString, type Building, type Campus, type Vec2 } from '@4this/shared';

/**
 * 캠퍼스 바깥 배치 계산 (순수 함수). 컴포넌트는 이 결과만 그린다.
 * 좌표계는 shared/campus와 같다: +x 동쪽, +z 남쪽(정문), 바닥 y = 0.
 */

/** 디오라마 판 반 크기 (판 50×50) */
export const BOARD_HALF = 25;
/** 판 모서리 둥글기 */
export const BOARD_CORNER = 3;
/** 정문 큰길 폭 */
export const MAIN_ROAD_WIDTH = 3.2;
/** 나머지 길 폭 */
export const PATH_WIDTH = 2.2;
/** 보도블록 한 칸 간격 */
export const PAVER_STEP = 0.62;
/** 원형 광장 */
export const PLAZA: { center: Vec2; r: number } = { center: [0, 3], r: 3.8 };
/** 정문 아치의 z 위치 (gate 노드 바로 남쪽) */
export const GATE_Z = 23.2;

/**
 * 문자열 seed로 만드는 결정적 난수열 (mulberry32). rand01(seed, i)를 연달아 부르면
 * 비슷한 문자열끼리 값이 엮여 점들이 줄지어 생기므로, 흩뿌리기는 이것을 쓴다.
 */
export function seededRandom(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type WallSide = 'n' | 's' | 'e' | 'w';

/** 벽 바깥 법선 (x, z) */
export const WALL_NORMALS: Record<WallSide, Vec2> = {
  n: [0, -1],
  s: [0, 1],
  e: [1, 0],
  w: [-1, 0],
};

export interface DoorInfo {
  /** 벽 위의 문 중심 */
  pos: Vec2;
  side: WallSide;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 문 노드에서 가장 가까운 벽(노드가 바깥에 있는 쪽)의 문 위치 */
export function doorPoint(b: Pick<Building, 'min' | 'max'>, node: Vec2): DoorInfo {
  const [x, z] = node;
  const out: [WallSide, number][] = [
    ['w', b.min[0] - x],
    ['e', x - b.max[0]],
    ['n', b.min[1] - z],
    ['s', z - b.max[1]],
  ];
  out.sort((p, q) => q[1] - p[1]);
  const side = out[0]![0];
  const m = 1.2; // 모서리에서 떨어뜨리기
  if (side === 'w' || side === 'e') {
    return {
      side,
      pos: [side === 'w' ? b.min[0] : b.max[0], clamp(z, b.min[1] + m, b.max[1] - m)],
    };
  }
  return { side, pos: [clamp(x, b.min[0] + m, b.max[0] - m), side === 'n' ? b.min[1] : b.max[1]] };
}

export interface PathSeg {
  a: Vec2;
  b: Vec2;
  width: number;
}

/** 경로 그래프 간선 + 문까지 이어지는 짧은 길 + 정문 밖으로 나가는 길 */
export function pathSegments(c: Campus): PathSeg[] {
  const nodes = c.graph.nodes;
  const mainRoad = new Set([
    `${c.gateNode}|south`,
    `south|${c.gateNode}`,
    'south|plaza',
    'plaza|south',
  ]);
  const segs: PathSeg[] = c.graph.edges.map(([a, b]) => ({
    a: nodes[a]!,
    b: nodes[b]!,
    width: mainRoad.has(`${a}|${b}`) ? MAIN_ROAD_WIDTH : PATH_WIDTH,
  }));
  for (const b of Object.values(c.buildings)) {
    const node = nodes[b.doorNode]!;
    segs.push({ a: node, b: doorPoint(b, node).pos, width: PATH_WIDTH });
  }
  const gate = nodes[c.gateNode]!;
  segs.push({ a: gate, b: [gate[0], BOARD_HALF - 0.3], width: MAIN_ROAD_WIDTH });
  return segs;
}

/** 점과 선분 사이 거리 */
export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2, 0, 1);
  return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dz * t));
}

/** 길(또는 광장) 위인지. margin만큼 넓게 본다 */
export function onPath(p: Vec2, segs: readonly PathSeg[], margin = 0): boolean {
  if (Math.hypot(p[0] - PLAZA.center[0], p[1] - PLAZA.center[1]) <= PLAZA.r + margin) return true;
  return segs.some((s) => distToSegment(p, s.a, s.b) <= s.width / 2 + margin);
}

export function inBuilding(p: Vec2, c: Campus, margin = 0): boolean {
  return Object.values(c.buildings).some(
    (b) =>
      p[0] >= b.min[0] - margin &&
      p[0] <= b.max[0] + margin &&
      p[1] >= b.min[1] - margin &&
      p[1] <= b.max[1] + margin,
  );
}

/** 연못(원 충돌체) 안인지 */
export function inPond(p: Vec2, c: Campus, margin = 0): boolean {
  return c.colliders.some(
    (k) =>
      k.kind === 'circle' && Math.hypot(p[0] - k.center[0], p[1] - k.center[1]) <= k.r + margin,
  );
}

/** 연못 = 첫 번째 원 충돌체. 연못 모델은 이 원에 맞춰 그린다 */
export function pondCircle(c: Campus): { center: Vec2; r: number } {
  const k = c.colliders.find((x) => x.kind === 'circle');
  if (!k || k.kind !== 'circle') throw new Error('연못 충돌체(원)가 없습니다');
  return { center: k.center, r: k.r };
}

/** 둥근 사각형 판 안인지 (inset만큼 안쪽으로) */
export function onBoard(p: Vec2, inset = 0): boolean {
  const h = BOARD_HALF - inset;
  const r = Math.max(0, BOARD_CORNER - inset);
  const ax = Math.abs(p[0]);
  const az = Math.abs(p[1]);
  if (ax > h || az > h) return false;
  const cx = ax - (h - r);
  const cz = az - (h - r);
  if (cx > 0 && cz > 0) return Math.hypot(cx, cz) <= r;
  return true;
}

export interface Paver {
  x: number;
  z: number;
  rot: number;
  /** 0~2 보도블록 색 번호 */
  shade: number;
}

/** 길을 따라 보도블록 위치를 만든다. 광장·건물 안·이미 놓인 칸과 겹치는 것은 뺀다 */
export function paverTiles(segs: readonly PathSeg[], c: Campus): Paver[] {
  const out: Paver[] = [];
  const grid = new Map<string, Paver[]>();
  const cell = 0.5;
  const key = (x: number, z: number) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  const minGap = 0.42;
  const tooClose = (x: number, z: number) => {
    const gx = Math.floor(x / cell);
    const gz = Math.floor(z / cell);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (const p of grid.get(`${gx + i},${gz + j}`) ?? []) {
          if (Math.hypot(p.x - x, p.z - z) < minGap) return true;
        }
      }
    }
    return false;
  };
  for (const s of segs) {
    const dx = s.b[0] - s.a[0];
    const dz = s.b[1] - s.a[1];
    const len = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.round(len / PAVER_STEP));
    const across = Math.max(1, Math.round(s.width / PAVER_STEP));
    const rot = Math.atan2(dx, dz);
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j < across; j++) {
        const t = i / steps;
        const off = (j - (across - 1) / 2) * PAVER_STEP + (i % 2 ? 0.15 : -0.15);
        const x = s.a[0] + dx * t + Math.cos(rot) * off;
        const z = s.a[1] + dz * t - Math.sin(rot) * off;
        const p: Vec2 = [x, z];
        if (Math.hypot(x - PLAZA.center[0], z - PLAZA.center[1]) < PLAZA.r - 0.2) continue;
        if (inBuilding(p, c, -0.05) || !onBoard(p, 0.4) || tooClose(x, z)) continue;
        const tile: Paver = { x, z, rot, shade: (i * 7 + j * 3) % 3 };
        out.push(tile);
        const k = key(x, z);
        grid.set(k, [...(grid.get(k) ?? []), tile]);
      }
    }
  }
  return out;
}

export interface Blade {
  x: number;
  z: number;
  rotY: number;
  tiltX: number;
  tiltZ: number;
  scale: number;
  /** 0~1 색 섞기 비율 */
  shade: number;
}

/** 풀잎 위치. 길·광장·건물·연못·판 가장자리는 피한다. 같은 seed면 항상 같은 결과 */
export function scatterGrass(
  c: Campus,
  segs: readonly PathSeg[],
  tries: number,
  seed = 'grass',
): Blade[] {
  const rand = seededRandom(seed);
  const out: Blade[] = [];
  for (let i = 0; i < tries; i++) {
    const x = (rand() - 0.5) * 2 * (BOARD_HALF - 0.8);
    const z = (rand() - 0.5) * 2 * (BOARD_HALF - 0.8);
    const blade: Blade = {
      x,
      z,
      rotY: rand() * Math.PI * 2,
      tiltX: (rand() - 0.5) * 0.4,
      tiltZ: (rand() - 0.5) * 0.4,
      scale: 0.7 + rand() * 0.6,
      shade: rand(),
    };
    const p: Vec2 = [x, z];
    if (!onBoard(p, 0.8) || onPath(p, segs, 0.2) || inBuilding(p, c, 0.3) || inPond(p, c, 0.4)) {
      continue;
    }
    out.push(blade);
  }
  return out;
}

/** 원 안에 고르게 흩뿌린 점 */
export function scatterInDisc(center: Vec2, r: number, n: number, seed: string): Vec2[] {
  const rand = seededRandom(seed);
  return Array.from({ length: n }, () => {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * r;
    return [center[0] + Math.cos(a) * d, center[1] + Math.sin(a) * d] as const;
  });
}

export interface LampSpot {
  pos: Vec2;
  /** 가로등 팔(모델의 -x 방향)이 길 쪽을 보게 하는 rotation.y */
  rotY: number;
}

/** 길 따라 가로등 자리. 긴 길에 spacing 간격으로 양쪽 번갈아 놓는다 */
export function lampSpots(segs: readonly PathSeg[], c: Campus, spacing = 5.5): LampSpot[] {
  const out: LampSpot[] = [];
  segs.forEach((s, si) => {
    const dx = s.b[0] - s.a[0];
    const dz = s.b[1] - s.a[1];
    const len = Math.hypot(dx, dz);
    if (len < spacing * 0.8) return;
    const n = Math.floor(len / spacing);
    const ux = dx / len;
    const uz = dz / len;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const side = (k + si) % 2 === 0 ? 1 : -1;
      const off = s.width / 2 + 0.6;
      // 길 방향의 오른쪽 수직 (uz, -ux)
      const px = s.a[0] + dx * t + uz * off * side;
      const pz = s.a[1] + dz * t - ux * off * side;
      const pos: Vec2 = [px, pz];
      if (onPath(pos, segs, 0.25) || inBuilding(pos, c, 0.8) || inPond(pos, c, 0.8)) continue;
      if (!onBoard(pos, 1) || out.some((l) => Math.hypot(l.pos[0] - px, l.pos[1] - pz) < 4)) {
        continue;
      }
      // 길 쪽 방향 (-uz, ux) * side
      const tx = -uz * side;
      const tz = ux * side;
      out.push({ pos, rotY: Math.atan2(tz, -tx) });
    }
  });
  return out;
}

export type TreeKind = 'cherry' | 'green';

export interface TreeSpot {
  pos: Vec2;
  scale: number;
  kind: TreeKind;
}

/** 나무 자리 (공원·건물 사이·판 가장자리) */
export const TREES: TreeSpot[] = [
  { pos: [-22, -6], scale: 1.3, kind: 'green' },
  { pos: [-22.5, 4], scale: 1.1, kind: 'cherry' },
  { pos: [-6.5, 13], scale: 0.9, kind: 'cherry' },
  { pos: [-6.5, -7.5], scale: 1.0, kind: 'cherry' },
  { pos: [-3.5, -6.5], scale: 0.9, kind: 'green' },
  { pos: [-9.8, 6.5], scale: 1.0, kind: 'green' },
  { pos: [-3.5, 8], scale: 0.9, kind: 'cherry' },
  { pos: [4.5, 8.5], scale: 1.0, kind: 'cherry' },
  { pos: [7.5, 4.5], scale: 0.85, kind: 'green' },
  { pos: [8, -6.5], scale: 1.1, kind: 'green' },
  { pos: [10, -12], scale: 1.0, kind: 'cherry' },
  { pos: [22.5, -14], scale: 1.2, kind: 'green' },
  { pos: [22.5, 9], scale: 1.0, kind: 'cherry' },
  { pos: [15, 10], scale: 1.1, kind: 'green' },
  { pos: [9, 16], scale: 1.0, kind: 'cherry' },
  { pos: [-8, 17], scale: 1.1, kind: 'green' },
  { pos: [-17, 18], scale: 1.0, kind: 'cherry' },
  { pos: [-22, 15], scale: 1.2, kind: 'green' },
  { pos: [18, 20], scale: 1.0, kind: 'green' },
  { pos: [-22.5, -21], scale: 1.0, kind: 'cherry' },
  { pos: [-4.5, -22], scale: 0.9, kind: 'green' },
  { pos: [12, -21], scale: 1.1, kind: 'cherry' },
  { pos: [22, -22], scale: 0.9, kind: 'cherry' },
];

export interface FlowerBed {
  center: Vec2;
  r: number;
  count: number;
}

/** 꽃밭 (공원 연못 둘레, 광장 옆, 정문 옆) */
export const FLOWER_BEDS: FlowerBed[] = [
  { center: [-19.5, -3.5], r: 1.3, count: 45 },
  { center: [-19.5, 3.8], r: 1.2, count: 40 },
  { center: [-10.5, 3.2], r: 0.9, count: 26 },
  { center: [-10.6, -3.4], r: 0.9, count: 26 },
  { center: [4.5, 5.5], r: 1.0, count: 30 },
  { center: [-4.4, 5.6], r: 1.0, count: 30 },
  { center: [-4, 20.5], r: 1.2, count: 38 },
  { center: [6.5, 22.2], r: 0.9, count: 26 },
  { center: [9, -9.8], r: 0.9, count: 26 },
];

/** 덤불 (KayKit bush) */
export const BUSHES: Vec2[] = [
  [-2.6, 20.2],
  [2.6, 18],
  [-2.6, 16],
  [-8.6, -9.9],
  [-1.8, -9.6],
  [1.8, -9.6],
  [10.9, -4.4],
  [10.9, 0.4],
  [-13.3, -10.5],
  [-16.7, -10.5],
  [-10.6, 8],
  [-10.6, 12],
];

/** 쓰레기통 (KayKit trash_A) */
export const TRASH_CANS: Vec2[] = [
  [2.1, 12.5],
  [6.1, 1.8],
  [-13.2, -4.8],
];
