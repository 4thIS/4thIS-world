import type { Campus, Place, PlaceId, Seat, Vec2 } from './types';

/**
 * 초기 캠퍼스 데이터. 배치는 설계 문서 §5.1을 따른다.
 * hm#1~#3에서 실제 모델·가구 위치에 맞춰 좌표를 다듬는다. 구조(키·필드)는 바꾸지 않는다.
 */

const N = 0; // 남쪽(+z)을 봄
const S = Math.PI; // 북쪽(-z)을 봄
const E = Math.PI / 2; // 동쪽(+x)을 봄
const W = -Math.PI / 2; // 서쪽(-x)을 봄

const seat = (x: number, z: number, facing: number): Seat => ({ pos: [x, z], facing });

/** 4인 테이블: 북쪽 두 자리는 남쪽을, 남쪽 두 자리는 북쪽을 본다 */
const table4 = (cx: number, cz: number): Seat[] => [
  seat(cx - 0.6, cz - 0.9, N),
  seat(cx + 0.6, cz - 0.9, N),
  seat(cx - 0.6, cz + 0.9, S),
  seat(cx + 0.6, cz + 0.9, S),
];

/** 2인 테이블: 마주 보고 앉는다 */
const table2 = (cx: number, cz: number): Seat[] => [seat(cx, cz - 0.7, N), seat(cx, cz + 0.7, S)];

/** 공학관 강의실 (층마다 같은 배치): 칠판은 북쪽 벽 */
const engClassroom = (id: PlaceId, floor: number): Place => ({
  id,
  building: 'eng',
  floor,
  landing: [19, 4],
  seats: [
    seat(14.5, -5, S),
    seat(17.5, -5, S),
    seat(14.5, -2, S),
    seat(17.5, -2, S),
    seat(14.5, 1, S),
    seat(17.5, 1, S),
  ],
  overflow: [seat(13.5, 3.5, S), seat(15, 3.5, S), seat(16.5, 3.5, S), seat(18, 3.5, S)],
});

const MAIN_LANDING: Vec2 = [6.5, -12];

/** 기숙사 계단참 (동쪽 벽 계단 옆) */
const DORM_LANDING: Vec2 = [19, 16.8];

/**
 * 기숙사 침실 (2·3층 같은 배치): 침대 6개. 자리는 침대 가운데, facing은 발끝 방향
 * (서쪽 벽 침대 4개는 동쪽을, 동쪽 벽 침대 2개는 서쪽을 향해 눕는다)
 */
const dormBedroom = (id: PlaceId, floor: number): Place => ({
  id,
  building: 'dorm',
  floor,
  landing: DORM_LANDING,
  seats: [
    seat(14.3, 9.3, E),
    seat(14.3, 11.6, E),
    seat(14.3, 13.9, E),
    seat(14.3, 16.2, E),
    seat(19.7, 9.3, W),
    seat(19.7, 11.6, W),
  ],
  // 침대가 모자라면 가운데 바닥 매트
  overflow: [seat(16.6, 9.3, E), seat(16.6, 11.1, E), seat(16.6, 12.9, E), seat(16.6, 14.7, E)],
});

export const CAMPUS: Campus = {
  buildings: {
    main: {
      id: 'main',
      name: '본관',
      floors: 3,
      min: [-8, -19],
      max: [8, -11],
      doorNode: 'main-door',
    },
    eng: {
      id: 'eng',
      name: '공학관',
      floors: 3,
      min: [12, -9],
      max: [20, 5],
      doorNode: 'eng-door',
    },
    lab: {
      id: 'lab',
      name: '연구동',
      floors: 2,
      min: [-20, -19],
      max: [-10, -11],
      doorNode: 'lab-door',
    },
    cafe: {
      id: 'cafe',
      name: '카페',
      floors: 1,
      min: [-20, 7],
      max: [-12, 13],
      doorNode: 'cafe-door',
    },
    dorm: {
      id: 'dorm',
      name: '기숙사',
      floors: 3,
      min: [13, 8],
      max: [21, 18],
      doorNode: 'dorm-door',
    },
  },
  places: {
    'eng-1f': engClassroom('eng-1f', 1),
    'eng-2f': engClassroom('eng-2f', 2),
    'eng-3f': engClassroom('eng-3f', 3),
    'lab-2f': {
      id: 'lab-2f',
      building: 'lab',
      floor: 2,
      landing: [-19, -12],
      seats: [
        seat(-17, -16.4, N),
        seat(-15, -16.4, N),
        seat(-17, -13.6, S),
        seat(-15, -13.6, S),
        seat(-18.2, -15, E),
        seat(-13.8, -15, W),
      ],
      overflow: [seat(-18.5, -12.5, S), seat(-17, -12.2, S), seat(-15.5, -12.2, S)],
    },
    'main-1f': {
      id: 'main-1f',
      building: 'main',
      floor: 1,
      landing: MAIN_LANDING,
      seats: [-5.5, -2, 1.5, 5].flatMap((cx) => table4(cx, -15)),
      // 배식대(북쪽 벽) 앞 줄
      overflow: [-6, -4.8, -3.6, -2.4, -1.2, 0].map((x) => seat(x, -17.4, S)),
    },
    'main-2f': {
      id: 'main-2f',
      building: 'main',
      floor: 2,
      landing: MAIN_LANDING,
      seats: [-16, -14.5, -13].flatMap((z) => [-4.5, -1.5, 1.5, 4.5].map((x) => seat(x, z, S))),
      overflow: [-6, -3, 0, 3].map((x) => seat(x, -12, S)),
    },
    'main-3f': {
      id: 'main-3f',
      building: 'main',
      floor: 3,
      landing: MAIN_LANDING,
      seats: [-3.5, 3.5].flatMap((cx) => table4(cx, -15)),
      overflow: [seat(-7, -17.5, E), seat(-7, -13, E), seat(7, -17.5, W)],
    },
    cafe: {
      id: 'cafe',
      building: 'cafe',
      floor: 1,
      landing: [-13, 10],
      // 서쪽 벽은 카운터 자리라 테이블을 동쪽으로 붙인다
      seats: [
        ...table2(-16.6, 8.6),
        ...table2(-14, 8.6),
        ...table2(-16.6, 11.4),
        ...table2(-14, 11.4),
      ],
      // 테라스(바깥) 4자리 + 스탠딩 2자리
      overflow: [
        seat(-10, 12, N),
        seat(-8.6, 12, N),
        seat(-10, 13.4, S),
        seat(-8.6, 13.4, S),
        seat(-11, 8, E),
        seat(-10, 8, E),
      ],
    },
    // 기숙사 1층 휴게실: 4인 테이블 두 개, 넘치면 창가에 선다
    'dorm-1f': {
      id: 'dorm-1f',
      building: 'dorm',
      floor: 1,
      landing: DORM_LANDING,
      seats: [...table4(16, 10.5), ...table4(16, 14.5)],
      overflow: [seat(18.5, 9, W), seat(18.5, 12.5, W), seat(14, 17, N)],
    },
    'dorm-2f': dormBedroom('dorm-2f', 2),
    'dorm-3f': dormBedroom('dorm-3f', 3),
  },
  graph: {
    nodes: {
      gate: [0, 22],
      south: [0, 14],
      plaza: [0, 3],
      'plaza-n': [0, -3],
      'main-door': [0, -9.5],
      'plaza-e': [5, 0],
      'eng-door': [10.5, -2],
      'plaza-w': [-5, 0],
      park: [-9, 0],
      nw: [-9, -7],
      'lab-door': [-15, -9.5],
      sw: [-5, 10],
      'cafe-door': [-10.5, 10],
      'dorm-door': [11, 13],
    },
    edges: [
      ['gate', 'south'],
      ['south', 'plaza'],
      ['plaza', 'plaza-n'],
      ['plaza-n', 'main-door'],
      ['plaza', 'plaza-e'],
      ['plaza-e', 'eng-door'],
      ['plaza', 'plaza-w'],
      ['plaza-w', 'park'],
      ['plaza-w', 'nw'],
      ['nw', 'lab-door'],
      ['south', 'sw'],
      ['sw', 'cafe-door'],
      ['park', 'sw'],
      ['south', 'dorm-door'],
    ],
  },
  gateNode: 'gate',
  gateSpawn: [0, 24.5],
  boardPos: [3.5, 21],
  parkNode: 'park',
  parkSpots: [
    seat(-10, -4, N),
    seat(-11, 4, N),
    seat(-19, -5, N),
    seat(-21, 1, N),
    seat(-19, 5, N),
    seat(-13, -5.5, N),
    seat(-13, 5.5, N),
    seat(-8, 1, N),
  ],
  benchSpots: [seat(-15, -4.6, N), seat(-15, 4.6, S), seat(-19.6, 0, E)],
  professorSeat: seat(-11.5, -16, W),
  colliders: [
    { kind: 'box', min: [-8, -19], max: [8, -11] },
    { kind: 'box', min: [12, -9], max: [20, 5] },
    { kind: 'box', min: [-20, -19], max: [-10, -11] },
    { kind: 'box', min: [-20, 7], max: [-12, 13] },
    { kind: 'box', min: [13, 8], max: [21, 18] },
    { kind: 'circle', center: [-15, 0], r: 3.5 },
  ],
};
