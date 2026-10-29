import { describe, expect, it } from 'vitest';
import { CAMPUS, DEFAULT_LOOK, computeDay, type Pose, type PublicMember } from '@4this/shared';
import {
  PROFESSOR_ID,
  hiddenByCutaway,
  occupiedFloors,
  peopleIn,
  sameFloors,
  snapshotAt,
} from './occupancy';

// 14:35: 교수님이 기지개(15분마다 20초)를 켜지 않는 시각
const WED_1435 = Date.parse('2026-10-21T14:35:00+09:00');

const members: PublicMember[] = [
  {
    id: 'a',
    username: '철수',
    look: DEFAULT_LOOK,
    schedules: [{ day: 2, start: '14:00', end: '16:00', kind: 'lecture2', title: '자료구조' }],
  },
  {
    id: 'b',
    username: '영희',
    look: DEFAULT_LOOK,
    schedules: [{ day: 2, start: '14:00', end: '15:00', kind: 'lecture3' }],
  },
  {
    id: 'c',
    username: '지우',
    look: DEFAULT_LOOK,
    schedules: [{ day: 2, start: '14:00', end: '15:00', kind: 'external' }],
  },
];

const plan = computeDay({ members, date: '2026-10-21', campus: CAMPUS });

describe('snapshotAt · occupiedFloors', () => {
  it('강의실·카페(외부 일정)와 교수님 자리의 층을 모은다', () => {
    const snap = snapshotAt(plan, members, WED_1435, CAMPUS);
    expect(snap.map((s) => s.id)).toEqual(['a', 'b', 'c', PROFESSOR_ID]);
    expect(occupiedFloors(snap, CAMPUS)).toEqual(new Set(['eng:2', 'eng:3', 'cafe:1', 'lab:2']));
  });

  it('밤에는 비어 있다', () => {
    const night = Date.parse('2026-10-21T23:00:00+09:00');
    expect(occupiedFloors(snapshotAt(plan, members, night, CAMPUS), CAMPUS).size).toBe(0);
  });

  it('sameFloors는 내용으로 비교한다', () => {
    expect(sameFloors(new Set(['eng:1']), new Set(['eng:1']))).toBe(true);
    expect(sameFloors(new Set(['eng:1']), new Set(['eng:2']))).toBe(false);
  });
});

describe('peopleIn', () => {
  it('그 건물에 있는 사람을 층 순서로', () => {
    const snap = snapshotAt(plan, members, WED_1435, CAMPUS);
    expect(peopleIn(snap, 'eng', CAMPUS)).toEqual([
      { id: 'a', username: '철수', status: '2학년 강의 · 자료구조', floor: 2 },
      { id: 'b', username: '영희', status: '3학년 강의', floor: 3 },
    ]);
    expect(peopleIn(snap, 'lab', CAMPUS)).toEqual([
      { id: PROFESSOR_ID, username: '사자 교수님', status: '교수님', floor: 2 },
    ]);
  });
});

describe('hiddenByCutaway', () => {
  const upstairs: Pose = {
    position: [15, 6.4, -2],
    facing: 0,
    pose: 'sitType',
    placeId: 'eng-3f',
    floor: 3,
    status: '',
    opacity: 1,
  };

  it('다가간 건물의 숨긴 층 위에 있으면 가린다', () => {
    expect(hiddenByCutaway(upstairs, 'eng', 2, CAMPUS)).toBe(true);
    expect(hiddenByCutaway(upstairs, 'eng', 3, CAMPUS)).toBe(false);
    expect(hiddenByCutaway(upstairs, 'eng', null, CAMPUS)).toBe(false);
    expect(hiddenByCutaway(upstairs, 'main', 1, CAMPUS)).toBe(false);
  });
});
