import { describe, expect, it } from 'vitest';
import { CAMPUS, type Pose } from '@4this/shared';
import { PROFESSOR_LINES, describeWhere, formatClock, professorLine, skyIconAt } from './labels';

const kst = (hhmm: string) => Date.parse(`2026-10-21T${hhmm}:00+09:00`);

describe('시계와 하늘', () => {
  it("'수 14:10'처럼 요일과 KST 시각", () => {
    expect(formatClock(kst('14:10'))).toBe('수 14:10');
    expect(formatClock(Date.parse('2026-10-21T15:05:00Z'))).toBe('목 00:05');
  });

  it('시간대별 하늘 아이콘', () => {
    expect(skyIconAt(kst('07:00'))).toBe('🌅');
    expect(skyIconAt(kst('12:00'))).toBe('☀️');
    expect(skyIconAt(kst('18:00'))).toBe('🌇');
    expect(skyIconAt(kst('23:00'))).toBe('🌙');
    expect(skyIconAt(kst('05:59'))).toBe('🌙');
  });
});

describe('describeWhere', () => {
  const base: Pose = {
    position: [0, 0, 0],
    facing: 0,
    pose: 'sitType',
    placeId: 'eng-2f',
    floor: 2,
    status: '2학년 강의',
    opacity: 1,
  };

  it('건물·층·이름표', () => {
    expect(describeWhere(base, CAMPUS)).toBe('공학관 2층 · 2학년 강의');
    expect(describeWhere({ ...base, placeId: 'cafe', floor: 1, status: '카페 ☕' }, CAMPUS)).toBe(
      '카페 · 카페 ☕',
    );
    expect(describeWhere({ ...base, placeId: 'park', status: '공강' }, CAMPUS)).toBe('공원 · 공강');
    expect(describeWhere({ ...base, placeId: 'transit', status: '등교 중' }, CAMPUS)).toBe(
      '이동 중 · 등교 중',
    );
    expect(describeWhere(null, CAMPUS)).toBe('캠퍼스 밖');
  });
});

describe('professorLine', () => {
  it('정해진 문구 중 하나, 같은 날·같은 횟수면 같다', () => {
    const t = kst('10:00');
    expect(PROFESSOR_LINES).toContain(professorLine(t, 0));
    expect(professorLine(t, 3)).toBe(professorLine(kst('15:00'), 3));
    const lines = new Set(Array.from({ length: 20 }, (_, i) => professorLine(t, i)));
    expect(lines.size).toBeGreaterThan(1);
  });
});
