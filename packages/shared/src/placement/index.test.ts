import { describe, expect, it } from 'vitest';
import { CAMPUS } from '../campus/data';
import { boardAt, computeDay, professorAt, sampleAt } from './index';

const at = (iso: string) => Date.parse(iso);

describe('placement 계약', () => {
  it('computeDay는 날짜·요일·멤버 목록을 담는다', () => {
    const plan = computeDay({
      date: '2026-10-21',
      campus: CAMPUS,
      members: [
        {
          id: 'm1',
          username: '철수',
          look: { animal: 'dog', color: 'default', head: 'none', eyes: 'none', neck: 'none' },
          schedules: [],
        },
      ],
    });
    expect(plan.date).toBe('2026-10-21');
    expect(plan.weekday).toBe(2);
    expect(plan.usernames.get('m1')).toBe('철수');
    expect(sampleAt(plan, 'm1', at('2026-10-21T14:00:00+09:00'))).toBeNull();
    expect(boardAt(plan, at('2026-10-21T14:00:00+09:00'))).toEqual([]);
  });
});

describe('professorAt', () => {
  it('평일 09:00~18:00에만 연구동 2층에 있다', () => {
    const p = professorAt(at('2026-10-21T09:00:00+09:00'), CAMPUS);
    expect(p?.placeId).toBe('lab-2f');
    expect(p?.position[1]).toBeCloseTo(3.2);
    expect(professorAt(at('2026-10-21T08:59:00+09:00'), CAMPUS)).toBeNull();
    expect(professorAt(at('2026-10-21T18:00:00+09:00'), CAMPUS)).toBeNull();
    expect(professorAt(at('2026-10-24T12:00:00+09:00'), CAMPUS)).toBeNull(); // 토요일
  });

  it('15분마다 20초 동안 일어나 기지개를 켠다', () => {
    expect(professorAt(at('2026-10-21T10:15:10+09:00'), CAMPUS)).toMatchObject({
      pose: 'stand',
      status: '기지개 쭉~',
    });
    expect(professorAt(at('2026-10-21T10:15:30+09:00'), CAMPUS)).toMatchObject({
      pose: 'sitType',
      status: '교수님',
    });
  });
});
