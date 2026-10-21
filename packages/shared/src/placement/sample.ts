import { FLOOR_HEIGHT, type Seat, type Vec2 } from '../campus/types';
import { rand01 } from '../hash';
import { kstMidnight } from '../time';
import { FADE_MIN, PARK_SIT_CHANCE, PARK_SLOT_MIN, WALK_M_PER_MIN } from './constants';
import { dist, facingOf } from './graph';
import type {
  DayPlan,
  ParkSegment,
  Pose,
  Segment,
  StaySegment,
  WalkLeg,
  WalkSegment,
} from './types';

const floorY = (floor: number) => (floor - 1) * FLOOR_HEIGHT;

/** epoch ms → 계획 날짜의 KST 자정부터 지난 분 (자정을 넘기면 1440 이상) */
export function planMinutes(plan: DayPlan, t: number): number {
  return (t - kstMidnight(plan.date)) / 60_000;
}

/** 구간 목록에서 m을 품은 구간. 이진 탐색 (구간은 from 순, 겹치지 않음) */
export function findSegment(segments: readonly Segment[], m: number): Segment | null {
  let lo = 0;
  let hi = segments.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid]!.from <= m) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (found === -1) return null;
  const seg = segments[found]!;
  return m < seg.to ? seg : null;
}

/** 공원 산책 칸 slot의 목표 지점. 3번 중 1번꼴로 벤치·연못가에 앉는다 (§7.5) */
export function parkSpotAt(
  seg: Pick<ParkSegment, 'seed' | 'walkSpots' | 'sitSpots'>,
  slot: number,
): { spot: Seat; sit: boolean } {
  const sit = seg.sitSpots.length > 0 && rand01(seg.seed, slot) < PARK_SIT_CHANCE;
  const list = sit ? seg.sitSpots : seg.walkSpots;
  const spot = list[Math.floor(rand01(seg.seed, slot, 'spot') * list.length)]!;
  return { spot, sit };
}

function lerp(a: Vec2, b: Vec2, k: number): Vec2 {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}

function sampleStay(seg: StaySegment): Pose {
  return {
    position: [seg.pos[0], floorY(seg.floor), seg.pos[1]],
    facing: seg.facing,
    pose: seg.pose,
    placeId: seg.placeId,
    floor: seg.floor,
    status: seg.status,
    opacity: 1,
  };
}

/** 꺾은선 위 거리 d의 점과 그 자리의 진행 방향 */
function alongPath(leg: WalkLeg, d: number): { pos: Vec2; facing: number } {
  const { pts, cum } = leg;
  if (pts.length < 2) return { pos: pts[0]!, facing: 0 };
  let i = 1;
  while (i < pts.length - 1 && cum[i]! < d) i++;
  const a = pts[i - 1]!;
  const b = pts[i]!;
  const span = cum[i]! - cum[i - 1]!;
  const k = span > 0 ? Math.min(1, Math.max(0, (d - cum[i - 1]!) / span)) : 1;
  return { pos: lerp(a, b, k), facing: facingOf(a, b) };
}

function sampleWalk(seg: WalkSegment, m: number): Pose {
  let leg = seg.legs[0]!;
  for (const l of seg.legs) {
    if (l.from <= m) leg = l;
    else break;
  }
  const length = leg.cum.at(-1) ?? 0;
  const fi = leg.fadeIn ? FADE_MIN : 0;
  const fo = leg.fadeOut ? FADE_MIN : 0;
  const moveFrom = leg.from + fi;
  const moveTo = leg.to - fo;
  let opacity = 1;
  let d: number;
  let moving = true;
  if (m < moveFrom) {
    opacity = fi > 0 ? (m - leg.from) / fi : 1;
    d = 0;
    moving = false;
  } else if (m >= moveTo) {
    opacity = fo > 0 ? 1 - (m - moveTo) / fo : 1;
    d = length;
    moving = false;
  } else {
    d = ((m - moveFrom) / (moveTo - moveFrom)) * length;
  }
  const { pos, facing } = alongPath(leg, d);
  return {
    position: [pos[0], floorY(leg.floor), pos[1]],
    facing,
    pose: moving ? 'walk' : 'stand',
    placeId: leg.gate && !moving ? 'gate' : 'transit',
    floor: leg.floor,
    status: seg.status,
    opacity: Math.min(1, Math.max(0, opacity)),
  };
}

function samplePark(seg: ParkSegment, m: number): Pose {
  const slot = Math.floor(m / PARK_SLOT_MIN);
  const slotStart = Math.max(slot * PARK_SLOT_MIN, seg.from);
  const prev = slot * PARK_SLOT_MIN <= seg.from ? seg.entry : parkSpotAt(seg, slot - 1).spot.pos;
  const { spot, sit } = parkSpotAt(seg, slot);
  const walkMin = dist(prev, spot.pos) / WALK_M_PER_MIN;
  const base = { floor: 1, status: seg.status, opacity: 1, placeId: 'park' as const };
  if (m < slotStart + walkMin) {
    const pos = lerp(prev, spot.pos, (m - slotStart) / walkMin);
    return {
      ...base,
      position: [pos[0], 0, pos[1]],
      facing: facingOf(prev, spot.pos),
      pose: 'walk',
    };
  }
  return {
    ...base,
    position: [spot.pos[0], 0, spot.pos[1]],
    facing: spot.facing,
    pose: sit ? 'sitRest' : 'idle',
  };
}

/** 구간 하나를 분 m에서 샘플한다. 캠퍼스 밖(외부 일정)이면 null */
export function sampleSegment(seg: Segment, m: number): Pose | null {
  switch (seg.kind) {
    case 'stay':
      return sampleStay(seg);
    case 'walk':
      return sampleWalk(seg, m);
    case 'park':
      return samplePark(seg, m);
    case 'away':
      return null;
  }
}
