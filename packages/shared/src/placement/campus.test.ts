import { describe, expect, it } from 'vitest';
import { CAMPUS } from '../campus/data';
import { PLACE_IDS } from '../campus/types';
import type { ScheduleItem } from '../schema/schedule';
import { boardAt, computeDay, demoMembers, sampleAt } from './index';
import { WED, WEDNESDAY, idWithFree, member, wed } from './test-fixtures';

const item = (start: string, end: string, kind: ScheduleItem['kind'], title?: string) =>
  ({ day: WEDNESDAY, start, end, kind, ...(title ? { title } : {}) }) as ScheduleItem;

const minuteOf = (m: number) => wed('00:00:00') + m * 60_000;

describe('지우의 수요일 (실제 캠퍼스, 설계 문서 §7.2 예시)', () => {
  const id = idWithFree('cafe');
  const plan = computeDay({
    date: WED,
    campus: CAMPUS,
    members: [
      member(
        [
          item('09:00', '12:00', 'lecture1'),
          item('13:00', '15:00', 'external', '알바'),
          item('16:00', '18:00', 'research'),
        ],
        id,
        '지우',
      ),
    ],
  });
  const at = (hhmmss: string) => sampleAt(plan, id, wed(hhmmss));

  it('08:55 정문 등장 → 09:00 eng-1f 자리', () => {
    expect(at('08:54:59')).toBeNull();
    expect(at('08:55:10')).toMatchObject({ status: '등교 중', placeId: 'transit' });
    expect(at('09:05:00')).toMatchObject({
      placeId: 'eng-1f',
      pose: 'sitType',
      status: '1학년 강의',
    });
  });

  it('12:00 식당 → 13:00 정문 퇴장(게시판)', () => {
    expect(at('12:05:00')).toMatchObject({ placeId: 'main-1f', pose: 'sitEat' });
    expect(at('13:00:10')).toMatchObject({ status: '외출 중' });
    expect(at('13:05:00')).toBeNull();
    expect(boardAt(plan, wed('12:59:59'))).toEqual([]);
    expect(boardAt(plan, wed('13:00:00'))).toEqual([
      { memberId: id, username: '지우', title: '알바', until: '15:00' },
    ]);
  });

  it('15:00 정문 입장 → 카페 → 16:00 lab-2f → 18:00 하교', () => {
    expect(boardAt(plan, wed('15:00:00'))).toEqual([]);
    expect(at('15:00:05')).toMatchObject({ placeId: 'transit', status: '카페 ☕' });
    expect(at('15:10:00')).toMatchObject({ placeId: 'cafe', pose: 'sitSip' });
    const lab = at('16:05:00')!;
    expect(lab).toMatchObject({ placeId: 'lab-2f', status: '연구 중', floor: 2 });
    expect(lab.position[1]).toBeCloseTo(3.2);
    expect(at('18:00:10')).toMatchObject({ status: '하교 중' });
    expect(at('18:05:00')).toBeNull();
  });
});

describe('30명 픽스처 (실제 캠퍼스)', () => {
  const members = demoMembers(30);
  const input = { date: WED, campus: CAMPUS, members };

  it('두 번 계산해도 결과가 같다 (결정성)', () => {
    const a = computeDay(input);
    const b = computeDay({ ...input, members: [...members].reverse() });
    for (let m = 6 * 60; m < 24 * 60; m += 7) {
      for (const { id } of members) {
        expect(sampleAt(b, id, minuteOf(m))).toEqual(sampleAt(a, id, minuteOf(m)));
      }
    }
  });

  it('같은 일정 동안 좌석이 바뀌지 않고, 앉은 자리는 한 사람만 쓴다', () => {
    const plan = computeDay(input);
    const places = new Set<string>(PLACE_IDS);
    const last = new Map<string, string>();
    for (let m = 6 * 60; m < 24 * 60; m++) {
      const taken = new Set<string>();
      for (const { id } of members) {
        const p = sampleAt(plan, id, minuteOf(m));
        if (!p || !places.has(p.placeId)) {
          last.delete(id);
          continue;
        }
        const key = `${p.placeId}|${p.status}`;
        const pos = p.position.join(',');
        const prev = last.get(id);
        if (prev?.startsWith(`${key}@`)) expect(prev).toBe(`${key}@${pos}`);
        last.set(id, `${key}@${pos}`);
        if (p.pose !== 'stand') {
          const seatKey = `${p.placeId}@${pos}`;
          expect(taken.has(seatKey)).toBe(false);
          taken.add(seatKey);
        }
      }
    }
  });

  it('모든 좌표가 캠퍼스 안이고 키가 유한하다', () => {
    const plan = computeDay(input);
    for (let m = 6 * 60; m < 24 * 60; m += 3) {
      for (const { id } of members) {
        const p = sampleAt(plan, id, minuteOf(m));
        if (!p) continue;
        expect(Number.isFinite(p.facing)).toBe(true);
        expect(Math.abs(p.position[0])).toBeLessThanOrEqual(26);
        expect(Math.abs(p.position[2])).toBeLessThanOrEqual(26);
      }
    }
  });

  it('성능: computeDay 30명 50 ms 안, sampleAt 30명 × 600프레임 100 ms 안', () => {
    computeDay(input); // 경로 캐시 데우기
    const t0 = Date.now();
    const plan = computeDay(input);
    expect(Date.now() - t0).toBeLessThan(50);

    const t1 = Date.now();
    for (let f = 0; f < 600; f++) {
      const t = wed('14:00:00') + f * 16;
      for (const { id } of members) sampleAt(plan, id, t);
    }
    expect(Date.now() - t1).toBeLessThan(100);
  });
});
