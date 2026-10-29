import { describe, expect, it } from 'vitest';
import type { ScheduleItem } from '../schema/schedule';
import { boardAt, computeDay, sampleAt } from './index';
import { LINE_CAMPUS, WED, WEDNESDAY, idWithFree, member, wed } from './test-fixtures';
import type { MemberForPlacement } from './types';

const item = (
  start: string,
  end: string,
  kind: ScheduleItem['kind'],
  title?: string,
  day = WEDNESDAY,
) => ({ day, start, end, kind, ...(title ? { title } : {}) }) as ScheduleItem;

const plan = (members: MemberForPlacement[], date = WED) =>
  computeDay({ members, date, campus: LINE_CAMPUS });

const xz = (p: { position: [number, number, number] } | null) =>
  p ? [p.position[0], p.position[2]] : null;

describe('등교·수업·하교 (직선 캠퍼스)', () => {
  const p = plan([member([item('09:00', '10:00', 'lecture1')], 'm')]);

  it('5분 전까지는 없다가 정문 바깥에서 페이드로 나타난다', () => {
    expect(sampleAt(p, 'm', wed('08:54:59'))).toBeNull();
    expect(sampleAt(p, 'm', wed('08:55:00'))).toMatchObject({
      position: [-15, 0, 0],
      opacity: 0,
      placeId: 'gate',
      status: '등교 중',
    });
    expect(sampleAt(p, 'm', wed('08:55:00.150'))!.opacity).toBeCloseTo(0.5);
  });

  it('1.5 m/s로 경로를 따라 걷는다', () => {
    const s = sampleAt(p, 'm', wed('08:55:05.300'))!;
    expect(s.position[0]).toBeCloseTo(-7.5);
    expect(s.position[2]).toBeCloseTo(0);
    expect(s).toMatchObject({ pose: 'walk', placeId: 'transit', opacity: 1 });
    expect(s.facing).toBeCloseTo(Math.PI / 2);
  });

  it('20분 미만 빈 시간은 다음 건물 문 앞에서 선다', () => {
    const s = sampleAt(p, 'm', wed('08:58:00'))!;
    expect(s).toMatchObject({ pose: 'stand', placeId: 'door', status: '공강', floor: 1 });
    expect(Math.hypot(s.position[0] - 15, s.position[2])).toBeCloseTo(0.8);
  });

  it('수업 시간에는 배정된 좌석에 앉아 있다', () => {
    expect(sampleAt(p, 'm', wed('09:01:00'))).toEqual({
      position: [15, 0, -6],
      facing: Math.PI,
      pose: 'sitType',
      placeId: 'eng-1f',
      floor: 1,
      status: '1학년 강의',
      opacity: 1,
    });
  });

  it('마지막 일정이 끝나면 정문으로 걸어가 사라진다', () => {
    const s = sampleAt(p, 'm', wed('10:00:01'))!;
    expect(xz(s)?.[0]).toBeCloseTo(15);
    expect(xz(s)?.[1]).toBeCloseTo(-4.5);
    expect(s).toMatchObject({ pose: 'walk', status: '하교 중' });
    // 좌석→계단참 2초 + 페이드 0.3·0.3 + 문→정문 바깥 20초 + 페이드 0.3 = 22.9초
    expect(sampleAt(p, 'm', wed('10:00:22.800'))).toMatchObject({ placeId: 'gate' });
    expect(sampleAt(p, 'm', wed('10:00:23'))).toBeNull();
  });
});

describe('건물 안 층 이동', () => {
  const p = plan([
    member([item('09:00', '10:00', 'lecture1'), item('10:00', '11:00', 'lecture2')], 'm'),
  ]);

  it('계단참까지 걷고 페이드 → 윗층 계단참에서 나타나 자리로 걷는다', () => {
    expect(sampleAt(p, 'm', wed('10:00:02.150'))).toMatchObject({
      position: [15, 0, -3],
      floor: 1,
      pose: 'stand',
    });
    expect(sampleAt(p, 'm', wed('10:00:02.150'))!.opacity).toBeCloseTo(0.5);
    const appear = sampleAt(p, 'm', wed('10:00:02.450'))!;
    expect(appear.position).toEqual([15, 3.2, -3]);
    expect(appear.opacity).toBeCloseTo(0.5);
    const walking = sampleAt(p, 'm', wed('10:00:03.600'))!;
    expect(walking.position[2]).toBeCloseTo(-4.5);
    expect(walking.facing).toBeCloseTo(Math.PI);
    expect(sampleAt(p, 'm', wed('10:00:05'))).toMatchObject({
      position: [15, 3.2, -6],
      floor: 2,
      pose: 'sitType',
      status: '2학년 강의',
    });
  });
});

describe('좌석·포즈·이름표', () => {
  it('좌석이 모자라면 세 번째 사람은 넘침 자리에 선다', () => {
    const p = plan(['a', 'b', 'c'].map((id) => member([item('09:00', '10:00', 'lecture1')], id)));
    expect(sampleAt(p, 'a', wed('09:30'))!.position).toEqual([15, 0, -6]);
    expect(sampleAt(p, 'b', wed('09:30'))!.position).toEqual([15, 0, -9]);
    expect(sampleAt(p, 'c', wed('09:30'))).toMatchObject({ position: [15, 0, -12], pose: 'stand' });
  });

  it('도서관 sitRead, 교양 제목, 연구 중', () => {
    const p = plan([
      member([item('09:00', '10:00', 'library')], 'lib'),
      member([item('09:00', '10:00', 'liberal', '심리학')], 'lib2'),
      member([item('09:00', '10:00', 'research', '논문')], 'lab'),
    ]);
    expect(sampleAt(p, 'lib', wed('09:30'))).toMatchObject({
      placeId: 'main-3f',
      pose: 'sitRead',
      status: '도서관',
      floor: 3,
    });
    expect(sampleAt(p, 'lib', wed('09:30'))!.position[1]).toBeCloseTo(6.4);
    expect(sampleAt(p, 'lib2', wed('09:30'))!.status).toBe('교양 강의 · 심리학');
    expect(sampleAt(p, 'lab', wed('09:30'))).toMatchObject({
      placeId: 'lab-2f',
      status: '연구 중',
    });
  });

  it('점심은 식당 sitEat, 카페는 sitSip', () => {
    const id = idWithFree('cafe');
    const p = plan([
      member([item('10:00', '11:30', 'lecture1'), item('13:30', '15:00', 'lecture1')], id),
    ]);
    expect(sampleAt(p, id, wed('12:00'))).toMatchObject({
      placeId: 'main-1f',
      pose: 'sitEat',
      status: '점심 🍚',
    });
    expect(sampleAt(p, id, wed('13:00'))).toMatchObject({
      placeId: 'cafe',
      pose: 'sitSip',
      status: '카페 ☕',
    });
  });
});

describe('공원 산책', () => {
  const id = idWithFree('park');
  const p = plan([
    member([item('09:00', '10:00', 'lecture1'), item('16:00', '17:00', 'lecture1')], id),
  ]);

  it('2분 칸마다 지점을 옮기고, 3번 중 1번꼴로 벤치에 앉는다', () => {
    let sit = 0;
    let idle = 0;
    // 13:30~15:59 칸의 가운데(도착한 뒤)를 본다
    for (let m = 13 * 60 + 30; m < 16 * 60; m += 2) {
      const t = wed('00:00:00') + (m + 1) * 60_000;
      const s = sampleAt(p, id, t)!;
      expect(s.placeId).toBe('park');
      expect(s.status).toBe('공강');
      if (s.pose === 'sitRest') sit++;
      else if (s.pose === 'idle') idle++;
    }
    expect(sit).toBeGreaterThan(0);
    expect(idle).toBeGreaterThan(0);
    expect(sit / (sit + idle)).toBeGreaterThan(0.15);
    expect(sit / (sit + idle)).toBeLessThan(0.55);
  });

  it('순간이동 없이 이어진다 (5초에 7.5 m 이하)', () => {
    let prev = sampleAt(p, id, wed('10:00:00'))!;
    for (let t = wed('10:00:05'); t < wed('16:00:00'); t += 5000) {
      const s = sampleAt(p, id, t)!;
      if (s.opacity === 1 && prev.opacity === 1 && s.floor === prev.floor) {
        const d = Math.hypot(s.position[0] - prev.position[0], s.position[2] - prev.position[2]);
        expect(d).toBeLessThanOrEqual(7.5 + 1e-6);
      }
      prev = s;
    }
  });
});

describe('외부 일정과 게시판', () => {
  it('외부 일정은 캠퍼스를 떠나지 않고 카페에 앉아 있어 게시판은 비어 있다', () => {
    const p = plan([member([item('10:00', '12:00', 'external', '알바')], 'ext', '지우')]);
    expect(sampleAt(p, 'ext', wed('11:00'))).toMatchObject({
      placeId: 'cafe',
      pose: 'sitSip',
      status: '알바 ☕',
    });
    expect(boardAt(p, wed('11:00'))).toEqual([]);
  });
});

describe('부재·승인·날짜', () => {
  it('일정 없는 날, 다른 요일 일정, 승인 안 된 멤버는 null', () => {
    const p = plan([
      member([], 'none'),
      member([item('09:00', '10:00', 'lecture1', undefined, 0)], 'mon'),
    ]);
    expect(sampleAt(p, 'none', wed('09:30'))).toBeNull();
    expect(sampleAt(p, 'mon', wed('09:30'))).toBeNull();
    // 승인 대기 멤버는 입력에 넣지 않으므로 계획에도 없다
    expect(sampleAt(p, 'pending', wed('09:30'))).toBeNull();
    expect(p.usernames.has('pending')).toBe(false);
  });

  it('KST 자정 경계: 24:00에 끝난 일정은 그날 계획으로만 하교 중이다', () => {
    const m = member([item('22:00', '24:00', 'lecture1')], 'late');
    const wedPlan = plan([m], '2026-10-21');
    const thuPlan = plan([m], '2026-10-22');
    const after = Date.parse('2026-10-22T00:00:10+09:00');
    expect(sampleAt(wedPlan, 'late', wed('23:59:00'))!.placeId).toBe('eng-1f');
    expect(sampleAt(wedPlan, 'late', after)!.status).toBe('하교 중');
    expect(sampleAt(thuPlan, 'late', after)).toBeNull();
  });

  it('UTC로는 수요일이어도 KST 목요일 일정을 따른다', () => {
    const m = member([item('08:00', '09:00', 'lecture3', undefined, 3)], 'thu');
    const t = Date.parse('2026-10-21T23:30:00Z'); // KST 2026-10-22(목) 08:30
    expect(plan([m], '2026-10-22').weekday).toBe(3);
    expect(sampleAt(plan([m], '2026-10-22'), 'thu', t)).toMatchObject({ placeId: 'eng-3f' });
  });
});
