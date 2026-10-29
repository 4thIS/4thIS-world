import { describe, expect, it } from 'vitest';
import type { ScheduleItem } from '../schema/schedule';
import { gapBlocks, planBlocks, planDormBlocks } from './segments';
import { LINE_CAMPUS, WED, WEDNESDAY, idWithFree } from './test-fixtures';

const H = (h: number, m = 0) => h * 60 + m;
const item = (start: string, end: string, kind: ScheduleItem['kind']) =>
  ({ day: WEDNESDAY, start, end, kind }) as ScheduleItem;
/** h시부터 h2시 전까지 비 */
const wetBetween = (h: number, h2: number) =>
  Array.from({ length: 24 }, (_, i) => i >= h && i < h2);

describe('비·눈 오는 시간엔 공원 대신 실내', () => {
  const park = idWithFree('park');

  it('통학생: 공원에 갈 빈 시간에 비가 오면 카페로 간다', () => {
    const dry = gapBlocks(park, WED, H(14), H(16), 'eng-door');
    expect(dry.map((b) => b.activity.kind)).toEqual(['park']);
    const wet = gapBlocks(park, WED, H(14), H(16), 'eng-door', false, wetBetween(15, 16));
    expect(wet.map((b) => b.activity.kind)).toEqual(['cafe']);
  });

  it('비가 안 겹치면 그대로 공원', () => {
    const blocks = gapBlocks(park, WED, H(14), H(16), 'eng-door', false, wetBetween(8, 9));
    expect(blocks.map((b) => b.activity.kind)).toEqual(['park']);
  });

  it('planBlocks도 젖은 시간을 따른다', () => {
    const items = [item('09:00', '10:00', 'lecture1'), item('15:00', '16:00', 'lecture1')];
    const kinds = (wet?: boolean[]) =>
      planBlocks(park, WED, items, LINE_CAMPUS, wet).map((b) => b.activity.kind);
    expect(kinds()).toContain('park');
    expect(kinds(wetBetween(0, 24))).not.toContain('park');
  });

  it('기숙사생: 비가 오면 공원 대신 휴게실', () => {
    const allWet = wetBetween(0, 24);
    for (let i = 0; i < 20; i++) {
      const kinds = planDormBlocks(`d${i}`, WED, [], LINE_CAMPUS, 0, allWet).map(
        (b) => b.activity.kind,
      );
      expect(kinds).not.toContain('park');
    }
  });
});
