import type { Campus, Place, PlaceId, Seat } from '../campus/types';
import type { ScheduleItem } from '../schema/schedule';
import { freeChoice } from './segments';
import type { MemberForPlacement } from './types';

/**
 * 테스트용 직선 캠퍼스. 모든 노드가 z = 0 위에 15 m 간격으로 있다(걸어서 10초).
 *
 *   spawn(-15) ─ gate(0) ─ eng-door(15) ─ main-door(30) ─ lab-door(45) ─ cafe-door(60) ─ park(75)
 *
 * 건물은 문 노드 북쪽(-z)에 있고, 계단참은 문에서 3 m, 좌석은 계단참에서 3 m·6 m 북쪽이다.
 * 좌석 2개 + 넘침 1개. 카페만 넘침 2개이고, 카페 넘침(테라스)은 SITTING_OVERFLOW에 따라 앉는다.
 */
const S = Math.PI; // 북쪽(-z)을 봄
const seat = (x: number, z: number): Seat => ({ pos: [x, z], facing: S });

function place(id: PlaceId, building: Place['building'], floor: number, x: number): Place {
  return {
    id,
    building,
    floor,
    landing: [x, -3],
    seats: [seat(x, -6), seat(x, -9)],
    overflow: building === 'cafe' ? [seat(x + 1, -3), seat(x + 2, -3)] : [seat(x, -12)],
  };
}

export const LINE_CAMPUS: Campus = {
  buildings: {
    eng: {
      id: 'eng',
      name: '공학관',
      floors: 3,
      min: [12, -14],
      max: [18, -2],
      doorNode: 'eng-door',
    },
    main: {
      id: 'main',
      name: '본관',
      floors: 3,
      min: [27, -14],
      max: [33, -2],
      doorNode: 'main-door',
    },
    lab: {
      id: 'lab',
      name: '연구동',
      floors: 2,
      min: [42, -14],
      max: [48, -2],
      doorNode: 'lab-door',
    },
    cafe: {
      id: 'cafe',
      name: '카페',
      floors: 1,
      min: [57, -14],
      max: [63, -2],
      doorNode: 'cafe-door',
    },
    dorm: {
      id: 'dorm',
      name: '기숙사',
      floors: 3,
      min: [87, -14],
      max: [93, -2],
      doorNode: 'dorm-door',
    },
  },
  places: {
    'eng-1f': place('eng-1f', 'eng', 1, 15),
    'eng-2f': place('eng-2f', 'eng', 2, 15),
    'eng-3f': place('eng-3f', 'eng', 3, 15),
    'lab-2f': place('lab-2f', 'lab', 2, 45),
    'main-1f': place('main-1f', 'main', 1, 30),
    'main-2f': place('main-2f', 'main', 2, 30),
    'main-3f': place('main-3f', 'main', 3, 30),
    cafe: place('cafe', 'cafe', 1, 60),
    'dorm-1f': place('dorm-1f', 'dorm', 1, 90),
    'dorm-2f': place('dorm-2f', 'dorm', 2, 90),
    'dorm-3f': place('dorm-3f', 'dorm', 3, 90),
  },
  graph: {
    nodes: {
      gate: [0, 0],
      'eng-door': [15, 0],
      'main-door': [30, 0],
      'lab-door': [45, 0],
      'cafe-door': [60, 0],
      park: [75, 0],
      'dorm-door': [90, 0],
    },
    edges: [
      ['gate', 'eng-door'],
      ['eng-door', 'main-door'],
      ['main-door', 'lab-door'],
      ['lab-door', 'cafe-door'],
      ['cafe-door', 'park'],
      ['park', 'dorm-door'],
    ],
  },
  gateNode: 'gate',
  gateSpawn: [-15, 0],
  boardPos: [0, 3],
  parkNode: 'park',
  parkSpots: [seat(75, 6), seat(81, 6)],
  benchSpots: [seat(78, 9)],
  professorSeat: seat(45, -12),
  colliders: [],
};

let seq = 0;

/** 테스트용 멤버. 아이디를 주지 않으면 m1, m2 … 순서로 만든다 */
export function member(
  schedules: ScheduleItem[],
  id = `m${++seq}`,
  username = id,
): MemberForPlacement {
  return {
    id,
    username,
    look: { animal: 'duck', color: 'default', head: 'none', eyes: 'none', neck: 'none' },
    schedules,
  };
}

/** 2026-10-21(수, day=2) KST 'HH:MM:SS' → epoch ms */
export function wed(hhmmss: string): number {
  return Date.parse(`2026-10-21T${hhmmss}+09:00`);
}

export const WED = '2026-10-21';
export const WEDNESDAY = 2;

/** 그날 빈 시간을 choice(공원/카페)에서 보내는 멤버 아이디 */
export function idWithFree(choice: 'park' | 'cafe', date = WED): string {
  for (let i = 0; ; i++) if (freeChoice(`x${i}`, date) === choice) return `x${i}`;
}
