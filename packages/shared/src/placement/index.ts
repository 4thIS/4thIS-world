import { FLOOR_HEIGHT, type Campus, type PlaceId } from '../campus/types';
import { kstMinutes, kstWeekday } from '../time';
import { buildSegments } from './build';
import { findSegment, planMinutes, sampleSegment } from './sample';
import { assignSeats, type SeatAssignment, type SeatRequest } from './seats';
import { planBlocks, planDormBlocks, type Block } from './segments';
import { ADMIN_ID, adminPose } from './admin';
import type { ComputeDayInput, DayPlan, Pose, Segment } from './types';

export * from './types';
export * from './admin';
export { boardAt } from './board';
export { FADE_MS, WALK_SPEED_MPS } from './constants';
export { facingOf, nearestNode, pathLength, shortestPath } from './graph';
export { STATUS, classStatus } from './status';
export { demoMembers } from './demo';

/** 좌석이 필요한 구간이면 그 장소 */
function seatPlace(block: Block): PlaceId | null {
  switch (block.activity.kind) {
    case 'class':
      return block.activity.placeId;
    case 'lunch':
      return 'main-1f';
    case 'cafe':
      return 'cafe';
    case 'lounge':
      return 'dorm-1f';
    default:
      return null;
  }
}

/**
 * 하루 계획을 만든다 (§7). 같은 입력이면 어디서 계산해도 같은 결과다.
 * members에는 승인된 멤버만 넣는다.
 */
export function computeDay(input: ComputeDayInput): DayPlan {
  const { members, date, campus, wetHours = [] } = input;
  const weekday = kstWeekday(Date.parse(`${date}T12:00:00+09:00`));

  // 1) 멤버마다 시간 규칙으로 구간을 나눈다. 기숙사생은 아이디 순으로 침대 번호를 받는다
  const beds = new Map(
    members
      .filter((m) => m.dorm)
      .map((m) => m.id)
      .sort()
      .map((id, i) => [id, i]),
  );
  const blocksOf = members.map((m) => {
    const items = m.schedules.filter((s) => s.day === weekday);
    const bed = beds.get(m.id);
    return bed === undefined
      ? planBlocks(m.id, date, items, campus, wetHours)
      : planDormBlocks(m.id, date, items, campus, bed, wetHours);
  });

  // 2) 같은 장소의 구간을 모아 좌석을 색칠한다
  const requests: SeatRequest[] = [];
  const owners: [member: number, block: number][] = [];
  blocksOf.forEach((blocks, mi) =>
    blocks.forEach((b, bi) => {
      const placeId = seatPlace(b);
      if (placeId) {
        requests.push({ memberId: members[mi]!.id, placeId, from: b.from, to: b.to });
        owners.push([mi, bi]);
      }
    }),
  );
  const seats = assignSeats(requests, campus);
  const seatMaps = members.map(() => new Map<number, SeatAssignment>());
  owners.forEach(([mi, bi], k) => seatMaps[mi]!.set(bi, seats[k]!));

  // 3) 구간마다 경로·머무는 자리를 붙인다
  const segments = new Map<string, readonly Segment[]>();
  members.forEach((m, mi) => {
    const seatMap = seatMaps[mi]!;
    segments.set(
      m.id,
      buildSegments(m.id, date, blocksOf[mi]!, (bi) => seatMap.get(bi), campus),
    );
  });

  return {
    date,
    weekday,
    usernames: new Map(members.map((m) => [m.id, m.username])),
    segments,
  };
}

/** 시각 t(epoch ms)에 멤버가 어디서 무엇을 하는지. 캠퍼스에 없으면 null (§7.6) */
export function sampleAt(plan: DayPlan, memberId: string, t: number): Pose | null {
  // 관리자 캐릭터는 시간표가 없고 24시간 광장 한가운데 서 있다
  if (memberId === ADMIN_ID) return adminPose();
  const segments = plan.segments.get(memberId);
  if (!segments) return null;
  const m = planMinutes(plan, t);
  const seg = findSegment(segments, m);
  return seg ? sampleSegment(seg, m) : null;
}

export const PROFESSOR_HOURS = { start: 9 * 60, end: 18 * 60 } as const;
/** 교수님은 15분마다 20초 동안 일어나 기지개를 켠다 (§6.4) */
export const PROFESSOR_STRETCH = { everyMin: 15, seconds: 20 } as const;

/** 사자 교수님: 평일 09:00~18:00 연구동 2F 책상. 가끔 일어나 기지개를 켠다 */
export function professorAt(t: number, campus: Campus): Pose | null {
  const min = kstMinutes(t);
  if (kstWeekday(t) > 4 || min < PROFESSOR_HOURS.start || min >= PROFESSOR_HOURS.end) return null;
  const stretching = min % PROFESSOR_STRETCH.everyMin < PROFESSOR_STRETCH.seconds / 60;
  const { pos, facing } = campus.professorSeat;
  return {
    position: [pos[0], FLOOR_HEIGHT, pos[1]],
    facing,
    pose: stretching ? 'stand' : 'sitType',
    placeId: 'lab-2f',
    floor: 2,
    status: stretching ? '기지개 쭉~' : '교수님',
    opacity: 1,
  };
}
