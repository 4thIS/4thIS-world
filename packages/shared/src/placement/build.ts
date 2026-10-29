import type { BuildingId, Campus, NodeId, PlaceId, Seat, Vec2 } from '../campus/types';
import { rand01 } from '../hash';
import type { PoseKind } from '../schema/pose';
import { FADE_MIN, PARK_SLOT_MIN, WAIT_SPREAD_M, WALK_M_PER_MIN } from './constants';
import { cumulative, facingOf, shortestPath } from './graph';
import { parkSpotAt } from './sample';
import type { SeatAssignment } from './seats';
import type { Block } from './segments';
import { STATUS } from './status';
import type { Segment, WalkLeg } from './types';

/** 캐릭터가 있는 곳: 건물 안 / 바깥 길 위 / 정문 밖(안 보임) */
export type Spot =
  | { kind: 'inside'; building: BuildingId; floor: number; pos: Vec2; landing: Vec2 }
  | { kind: 'outside'; pos: Vec2; node: NodeId }
  | { kind: 'gone' };

export type RawLeg = Omit<WalkLeg, 'from' | 'to' | 'cum'>;

const GONE: Spot = { kind: 'gone' };

function samePoint(a: Vec2, b: Vec2): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function sameSpot(a: Spot, b: Spot): boolean {
  if (a.kind === 'gone' || b.kind === 'gone') return a.kind === b.kind;
  if (a.kind === 'inside' && b.kind === 'inside') {
    return a.building === b.building && a.floor === b.floor && samePoint(a.pos, b.pos);
  }
  return a.kind === b.kind && samePoint(a.pos, b.pos);
}

function dedupe(pts: Vec2[]): Vec2[] {
  return pts.filter((p, i) => i === 0 || !samePoint(p, pts[i - 1]!));
}

function leg(pts: Vec2[], floor: number, fadeIn = false, fadeOut = false, gate = false): RawLeg {
  return { pts: dedupe(pts), floor, fadeIn, fadeOut, gate };
}

/**
 * a에서 b까지 걷는 다리들 (§5.3 출입 연출, §7.3).
 * 건물 안 → 계단참까지 걷고 페이드 → 문 노드에서 나타나 그래프 최단 경로 → 문에서 페이드
 * → 목표 층 계단참에서 나타나 자리까지 걷기. 정문 밖은 gateSpawn에서 나타나고 사라진다.
 */
export function route(campus: Campus, a: Spot, b: Spot): RawLeg[] {
  if (a.kind === 'inside' && b.kind === 'inside' && a.building === b.building) {
    if (a.floor === b.floor) return [leg([a.pos, b.pos], a.floor)];
    return [leg([a.pos, a.landing], a.floor, false, true), leg([b.landing, b.pos], b.floor, true)];
  }

  const legs: RawLeg[] = [];
  let head: Vec2[] = [];
  let startNode: NodeId;
  let fadeIn = false;
  let gate = false;
  if (a.kind === 'inside') {
    legs.push(leg([a.pos, a.landing], a.floor, false, true));
    startNode = campus.buildings[a.building].doorNode;
    fadeIn = true;
  } else if (a.kind === 'outside') {
    head = [a.pos];
    startNode = a.node;
  } else {
    head = [campus.gateSpawn];
    startNode = campus.gateNode;
    fadeIn = true;
    gate = true;
  }

  let tail: Vec2[] = [];
  let endNode: NodeId;
  let fadeOut = false;
  if (b.kind === 'inside') {
    endNode = campus.buildings[b.building].doorNode;
    fadeOut = true;
  } else if (b.kind === 'outside') {
    endNode = b.node;
    tail = [b.pos];
  } else {
    endNode = campus.gateNode;
    tail = [campus.gateSpawn];
    fadeOut = true;
    gate = true;
  }

  const path = shortestPath(campus, startNode, endNode).map((id) => campus.graph.nodes[id]!);
  legs.push(leg([...head, ...path, ...tail], 1, fadeIn, fadeOut, gate));
  if (b.kind === 'inside') legs.push(leg([b.landing, b.pos], b.floor, true));
  return legs;
}

/** 다리에 시각을 붙인다. available(분)보다 오래 걸리면 걷는 부분만 빠르게 줄인다 */
export function timeLegs(raw: readonly RawLeg[], start: number, available: number): WalkLeg[] {
  const withCum = raw.map((r) => ({ ...r, cum: cumulative(r.pts) }));
  const fadeOf = (r: RawLeg) => (r.fadeIn ? FADE_MIN : 0) + (r.fadeOut ? FADE_MIN : 0);
  const walkOf = (r: { cum: number[] }) => (r.cum.at(-1) ?? 0) / WALK_M_PER_MIN;
  const fades = withCum.reduce((s, r) => s + fadeOf(r), 0);
  const walking = withCum.reduce((s, r) => s + walkOf(r), 0);
  const scale =
    walking > 0 && fades + walking > available ? Math.max(0, available - fades) / walking : 1;
  let t = start;
  return withCum.map((r) => {
    const from = t;
    t = from + fadeOf(r) + walkOf(r) * scale;
    return { ...r, from, to: t };
  });
}

const BEDROOMS = ['dorm-2f', 'dorm-3f'] as const;

/** 침대 번호 → 침실과 자리. 침대가 모자라면 침실 바닥 매트(overflow)를 번갈아 쓴다 */
export function bedSpot(campus: Campus, bed: number): { placeId: PlaceId; seat: Seat } {
  let k = bed;
  for (const id of BEDROOMS) {
    const seats = campus.places[id].seats;
    if (k < seats.length) return { placeId: id, seat: seats[k]! };
    k -= seats.length;
  }
  const mats = BEDROOMS.flatMap((id) =>
    campus.places[id].overflow.map((seat) => ({ placeId: id as PlaceId, seat })),
  );
  return mats[k % mats.length]!;
}

interface Target {
  spot: Spot;
  /** 이곳으로 걷는 동안의 이름표 */
  status: string;
  /** 도착해서 머무는 구간 [from, to). null이면 머물지 않는다 (하교) */
  stay: ((from: number, to: number) => Segment) | null;
}

/**
 * 구간 목록 → Segment 목록. seatOf(i)는 blocks[i]의 좌석 (강의·점심·카페만).
 * 각 구간이 시작하는 순간 이전 자리에서 출발해 걷고, 도착하면 머문다 (§7.3).
 */
export function buildSegments(
  memberId: string,
  date: string,
  blocks: readonly Block[],
  seatOf: (blockIndex: number) => SeatAssignment | undefined,
  campus: Campus,
): Segment[] {
  const out: Segment[] = [];
  let here: Spot = GONE;
  let arrived = false;

  const seatTarget = (i: number, placeId: PlaceId, sitPose: PoseKind, status: string): Target => {
    const place = campus.places[placeId];
    const a = seatOf(i)!;
    return {
      spot: {
        kind: 'inside',
        building: place.building,
        floor: place.floor,
        pos: a.seat.pos,
        landing: place.landing,
      },
      status,
      stay: (from, to) => ({
        kind: 'stay',
        from,
        to,
        pos: a.seat.pos,
        floor: place.floor,
        facing: a.seat.facing,
        pose: a.sit ? sitPose : 'stand',
        placeId,
        status,
        seat: a.index,
      }),
    };
  };

  const bedTarget = (bed: number): Target => {
    const { placeId, seat } = bedSpot(campus, bed);
    const place = campus.places[placeId];
    return {
      spot: {
        kind: 'inside',
        building: place.building,
        floor: place.floor,
        pos: seat.pos,
        landing: place.landing,
      },
      status: STATUS.leaving,
      stay: (from, to) => ({
        kind: 'stay',
        from,
        to,
        pos: seat.pos,
        floor: place.floor,
        facing: seat.facing,
        pose: 'sleep',
        placeId,
        status: STATUS.sleep,
      }),
    };
  };

  const waitTarget = (node: NodeId): Target => {
    const center = campus.graph.nodes[node]!;
    const angle = rand01(memberId, 'wait') * Math.PI * 2;
    const pos: Vec2 = [
      center[0] + Math.cos(angle) * WAIT_SPREAD_M,
      center[1] + Math.sin(angle) * WAIT_SPREAD_M,
    ];
    const building = Object.values(campus.buildings).find((b) => b.doorNode === node);
    const facing = building
      ? facingOf(pos, [
          (building.min[0] + building.max[0]) / 2,
          (building.min[1] + building.max[1]) / 2,
        ])
      : Math.PI;
    return {
      spot: { kind: 'outside', pos, node },
      status: STATUS.free,
      stay: (from, to) => ({
        kind: 'stay',
        from,
        to,
        pos,
        floor: 1,
        facing,
        pose: 'stand',
        placeId: building ? 'door' : 'gate',
        status: STATUS.free,
      }),
    };
  };

  const parkEntry = campus.graph.nodes[campus.parkNode]!;
  const parkSeed = `${memberId}|${date}`;

  blocks.forEach((block, i) => {
    const act = block.activity;
    let target: Target;
    switch (act.kind) {
      case 'class':
        target = seatTarget(i, act.placeId, act.pose, act.status);
        break;
      case 'lunch':
        target = seatTarget(i, 'main-1f', 'sitEat', STATUS.lunch);
        break;
      case 'cafe':
        target = seatTarget(i, 'cafe', 'sitSip', STATUS.cafe);
        break;
      case 'lounge':
        target = seatTarget(i, 'dorm-1f', 'sitRest', STATUS.lounge);
        break;
      case 'sleep':
        target = bedTarget(act.bed);
        // 자정부터 자는 중이면 이미 침대에 있다 (정문에서 걸어오지 않는다)
        if (block.from === 0) here = target.spot;
        break;
      case 'wait':
        target = waitTarget(act.node);
        break;
      case 'park':
        target = {
          spot: { kind: 'outside', pos: parkEntry, node: campus.parkNode },
          status: STATUS.free,
          stay: (from, to) => ({
            kind: 'park',
            from,
            to,
            entry: parkEntry,
            seed: parkSeed,
            walkSpots: campus.parkSpots,
            sitSpots: campus.benchSpots,
            status: STATUS.free,
          }),
        };
        break;
      case 'away':
        target = {
          spot: GONE,
          status: STATUS.goingOut,
          stay: (from, to) => ({ kind: 'away', from, to, since: block.from, title: act.title }),
        };
        break;
      case 'home':
        target = { spot: GONE, status: STATUS.leaving, stay: null };
        break;
    }

    let t = block.from;
    if (!sameSpot(here, target.spot)) {
      const status = here.kind === 'gone' && !arrived ? STATUS.arriving : target.status;
      const available = act.kind === 'home' ? Infinity : block.to - block.from;
      const legs = timeLegs(route(campus, here, target.spot), block.from, available);
      t = legs.at(-1)!.to;
      out.push({ kind: 'walk', from: block.from, to: t, legs, status });
    }
    if (target.stay && t < block.to) {
      const seg = target.stay(t, block.to);
      out.push(seg);
      if (seg.kind === 'park') {
        // 다음 출발점은 마지막 칸의 산책 지점
        const last = parkSpotAt(seg, Math.floor((block.to - 1e-9) / PARK_SLOT_MIN));
        target.spot = { kind: 'outside', pos: last.spot.pos, node: campus.parkNode };
      }
    }
    here = target.spot;
    if (here.kind !== 'gone') arrived = true;
  });
  return out.filter((s) => s.to > s.from);
}
