import { describe, expect, it } from 'vitest';
import { findOverlap, ScheduleItemSchema, ScheduleListSchema, type ScheduleItem } from './schedule';

const item = (day: number, start: string, end: string): ScheduleItem => ({
  day,
  start,
  end,
  kind: 'lecture1',
});

describe('ScheduleItemSchema', () => {
  it('30분 단위, 06:00~24:00만 허용한다', () => {
    expect(ScheduleItemSchema.safeParse(item(0, '09:00', '10:30')).success).toBe(true);
    expect(ScheduleItemSchema.safeParse(item(0, '22:00', '24:00')).success).toBe(true);
    expect(ScheduleItemSchema.safeParse(item(0, '05:30', '07:00')).success).toBe(false);
    expect(ScheduleItemSchema.safeParse(item(0, '09:15', '10:00')).success).toBe(false);
    expect(ScheduleItemSchema.safeParse(item(7, '09:00', '10:00')).success).toBe(false);
  });

  it('끝이 시작보다 늦어야 한다', () => {
    expect(ScheduleItemSchema.safeParse(item(0, '10:00', '10:00')).success).toBe(false);
    expect(ScheduleItemSchema.safeParse(item(0, '11:00', '10:00')).success).toBe(false);
  });
});

describe('findOverlap', () => {
  it('맞닿는 일정은 겹치지 않는다', () => {
    expect(findOverlap([item(0, '10:00', '12:00'), item(0, '12:00', '14:00')])).toBeNull();
  });

  it('같은 요일에 겹치면 [앞, 뒤] 인덱스', () => {
    expect(findOverlap([item(0, '11:00', '13:00'), item(0, '10:00', '12:00')])).toEqual([1, 0]);
  });

  it('다른 요일은 겹치지 않는다', () => {
    expect(findOverlap([item(0, '10:00', '12:00'), item(1, '10:00', '12:00')])).toBeNull();
  });
});

describe('ScheduleListSchema', () => {
  it('겹치면 실패한다', () => {
    const list = [item(2, '09:00', '11:00'), item(2, '10:00', '12:00')];
    expect(ScheduleListSchema.safeParse(list).success).toBe(false);
  });
});
