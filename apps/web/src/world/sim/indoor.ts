import {
  CAMPUS,
  CAMPUS_HALF,
  FLOOR_HEIGHT,
  nearestNode,
  type BuildingId,
  type Campus,
  type Collider,
  type Vec2,
} from '@4this/shared';
import {
  DOOR_W,
  STAIR_RUN,
  WALL_T,
  floorY,
  type Box2,
  type StairSpec,
} from '../campus/buildingGeometry';
import { BUILDING_STYLES } from '../campus/buildingStyles';
import { WALL_NORMALS, doorPoint, type DoorInfo } from '../campus/layout';
import { CHARACTER_RADIUS } from './collision';

/**
 * 조종할 때 건물 드나들기와 계단 (순수 함수).
 * - 1층: 건물은 벽 네 면이고 문 자리만 뚫려 있다. 바깥 장애물(연못)·맵 끝도 막는다
 * - 2층 이상: 그 건물 벽 안에서만 걷는다
 * - 계단: 아래쪽 끝으로 들어가면 오르고, 위층에서 위쪽 끝으로 들어가면 내려간다. 옆으로는 못 들어간다
 * 책상·의자 같은 가구는 통과한다.
 */

interface IndoorBuilding {
  id: BuildingId;
  floors: number;
  min: Vec2;
  max: Vec2;
  door: DoorInfo;
  stairs: StairSpec | null;
}

const BUILDINGS: IndoorBuilding[] = Object.values(CAMPUS.buildings).map((b) => ({
  id: b.id,
  floors: b.floors,
  min: b.min,
  max: b.max,
  door: doorPoint(b, CAMPUS.graph.nodes[b.doorNode]!),
  stairs: BUILDING_STYLES[b.id].stairs,
}));

/** 건물 상자를 뺀 바깥 장애물 (건물은 벽으로 따로 다룬다) */
function outdoorColliders(campus: Campus): Collider[] {
  return campus.colliders.filter(
    (c) =>
      c.kind !== 'box' ||
      !BUILDINGS.some(
        (b) =>
          b.min[0] === c.min[0] &&
          b.min[1] === c.min[1] &&
          b.max[0] === c.max[0] &&
          b.max[1] === c.max[1],
      ),
  );
}

/** 벽 상자들. withDoor면 1층 문 자리를 비운다 */
function wallBoxes(b: IndoorBuilding, withDoor: boolean): Box2[] {
  const [x0, z0] = b.min;
  const [x1, z1] = b.max;
  const sides: Record<DoorInfo['side'], Box2> = {
    n: { min: [x0, z0], max: [x1, z0 + WALL_T] },
    s: { min: [x0, z1 - WALL_T], max: [x1, z1] },
    w: { min: [x0, z0], max: [x0 + WALL_T, z1] },
    e: { min: [x1 - WALL_T, z0], max: [x1, z1] },
  };
  const out: Box2[] = [];
  for (const side of ['n', 's', 'w', 'e'] as const) {
    const box = sides[side];
    if (!withDoor || side !== b.door.side) {
      out.push(box);
      continue;
    }
    // 벽을 문 양쪽 두 조각으로 나눈다
    const half = DOOR_W / 2;
    if (side === 'n' || side === 's') {
      out.push({ min: box.min, max: [b.door.pos[0] - half, box.max[1]] });
      out.push({ min: [b.door.pos[0] + half, box.min[1]], max: box.max });
    } else {
      out.push({ min: box.min, max: [box.max[0], b.door.pos[1] - half] });
      out.push({ min: [box.min[0], b.door.pos[1] + half], max: box.max });
    }
  }
  return out;
}

const touches = (box: Box2, p: Vec2, r: number) =>
  p[0] > box.min[0] - r && p[0] < box.max[0] + r && p[1] > box.min[1] - r && p[1] < box.max[1] + r;

/** p가 들어 있는 건물 (벽 바깥 테두리 기준) */
export function buildingAt(p: Vec2): IndoorBuilding | null {
  return (
    BUILDINGS.find(
      (b) => p[0] >= b.min[0] && p[0] <= b.max[0] && p[1] >= b.min[1] && p[1] <= b.max[1],
    ) ?? null
  );
}

/** floor층의 p에 설 수 없는가 (계단 자리는 stepMover가 따로 본다) */
function isBlockedAt(campus: Campus, floor: number, p: Vec2, r = CHARACTER_RADIUS): boolean {
  if (Math.abs(p[0]) > CAMPUS_HALF - r || Math.abs(p[1]) > CAMPUS_HALF - r) return true;
  if (floor > 1) {
    const b = buildingAt(p);
    return !b || floor > b.floors || wallBoxes(b, false).some((w) => touches(w, p, r));
  }
  if (BUILDINGS.some((b) => wallBoxes(b, true).some((w) => touches(w, p, r)))) return true;
  return outdoorColliders(campus).some((c) =>
    c.kind === 'box'
      ? touches(c, p, r)
      : Math.hypot(p[0] - c.center[0], p[1] - c.center[1]) < c.r + r,
  );
}

/** 계단 좌표: p = 오르는 방향으로 간 거리(0~STAIR_RUN이 계단), lat = 옆으로 벗어난 거리 */
function stairCoords(s: StairSpec, q: Vec2): { p: number; lat: number } {
  const [dx, dz] = WALL_NORMALS[s.dir];
  const ox = q[0] - s.start[0];
  const oz = q[1] - s.start[1];
  return { p: ox * dx + oz * dz, lat: ox * -dz + oz * dx };
}

function fromStair(s: StairSpec, p: number, lat: number): Vec2 {
  const [dx, dz] = WALL_NORMALS[s.dir];
  return [s.start[0] + dx * p - dz * lat, s.start[1] + dz * p + dx * lat];
}

/** 계단 위에서 옆으로 벗어날 수 있는 한계 (계단 폭 안, 벽에 닿지 않게) */
const stairLat = (s: StairSpec) => Math.max(0, s.width / 2 - CHARACTER_RADIUS - 0.01);

/** 조종 중인 캐릭터의 위치. stair는 지금 오르내리는 계단의 아래층 (계단 위가 아니면 null) */
export interface MoverState {
  pos: Vec2;
  floor: number;
  stair: number | null;
}

/** 한 걸음. 못 가면 null */
function tryStep(campus: Campus, s: MoverState, to: Vec2): MoverState | null {
  const b = buildingAt(s.pos) ?? buildingAt(to);
  const st = b?.stairs ?? null;

  if (s.stair !== null && st) {
    const c = stairCoords(st, to);
    const lim = stairLat(st);
    const pos = fromStair(st, c.p, Math.min(lim, Math.max(-lim, c.lat)));
    if (c.p < 0) return { pos, floor: s.stair, stair: null };
    if (c.p > STAIR_RUN) return { pos, floor: s.stair + 1, stair: null };
    return { pos, floor: s.floor, stair: s.stair };
  }

  if (b && st) {
    const c = stairCoords(st, to);
    const r = CHARACTER_RADIUS;
    const near = c.p > -r && c.p < STAIR_RUN + r && Math.abs(c.lat) < st.width / 2 + r;
    if (near) {
      const from = stairCoords(st, s.pos);
      const up = s.floor < b.floors && from.p <= 0;
      const down = s.floor >= 2 && from.p >= STAIR_RUN;
      // 계단 폭 안쪽에서 끝으로 다가올 때만 받아 준다. 조금 비켜 있어도 가운데로 당긴다
      if (Math.abs(c.lat) > st.width / 2 + 0.1 || !(up || down)) return null;
      const lim = stairLat(st);
      const pos = fromStair(st, c.p, Math.min(lim, Math.max(-lim, c.lat)));
      const onStair = c.p >= 0 && c.p <= STAIR_RUN;
      return { pos, floor: s.floor, stair: onStair ? (up ? s.floor : s.floor - 1) : null };
    }
  }

  return isBlockedAt(campus, s.floor, to) ? null : { pos: to, floor: s.floor, stair: null };
}

/** 한 걸음 옮긴다. 막히면 x만, 그다음 z만 움직여 벽을 따라 미끄러지고, 그래도 막히면 제자리 */
export function stepMover(campus: Campus, s: MoverState, to: Vec2): MoverState {
  return (
    tryStep(campus, s, to) ??
    tryStep(campus, s, [to[0], s.pos[1]]) ??
    tryStep(campus, s, [s.pos[0], to[1]]) ??
    s
  );
}

/** 발 높이 (m) */
export function moverHeight(s: MoverState): number {
  if (s.stair === null) return floorY(s.floor);
  const b = buildingAt(s.pos);
  if (!b?.stairs) return floorY(s.stair);
  const p = Math.min(STAIR_RUN, Math.max(0, stairCoords(b.stairs, s.pos).p));
  return floorY(s.stair) + (p / STAIR_RUN) * FLOOR_HEIGHT;
}

/** 화면·다른 사람에게 알릴 층. 계단을 오르내리는 중이면 위층 */
export function moverFloor(s: MoverState): number {
  return s.stair === null ? s.floor : s.stair + 1;
}

/** 조종을 시작할 자리: 지금 보이는 위치(x, y, z). 높이로 층을 정하고, 설 수 없으면 가장 가까운 길목 */
export function startMover(campus: Campus, at: readonly [number, number, number]): MoverState {
  const pos: Vec2 = [at[0], at[2]];
  const floor = Math.max(1, Math.round(at[1] / FLOOR_HEIGHT) + 1);
  if (!isBlockedAt(campus, floor, pos)) return { pos, floor, stair: null };
  // 건물 안 위층 자리가 벽에 너무 붙어 있으면 그 층 그대로 둔다
  if (floor > 1 && buildingAt(pos)) return { pos, floor, stair: null };
  return { pos: campus.graph.nodes[nearestNode(campus, pos)]!, floor: 1, stair: null };
}

/** 건물 안(1층 포함)인가. 그때는 조종을 놓아도 걸어 돌아가지 않는다 */
export function isIndoor(pos: Vec2, floor: number): boolean {
  return floor > 1 || buildingAt(pos) !== null;
}
