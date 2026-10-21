import { describe, expect, it } from 'vitest';
import { fromMinutes, kstDate, kstMidnight, kstMinutes, kstWeekday, toMinutes } from './time';

describe('KST 변환', () => {
  it('UTC 05:10은 KST 수요일 14:10', () => {
    const t = Date.parse('2026-10-21T05:10:00Z');
    expect(kstDate(t)).toBe('2026-10-21');
    expect(kstWeekday(t)).toBe(2);
    expect(kstMinutes(t)).toBe(850);
  });

  it('UTC 15:30은 KST 다음 날 00:30 (자정 경계)', () => {
    const t = Date.parse('2026-10-21T15:30:00Z');
    expect(kstDate(t)).toBe('2026-10-22');
    expect(kstWeekday(t)).toBe(3);
    expect(kstMinutes(t)).toBe(30);
  });

  it('kstMidnight는 그 날짜의 KST 00:00', () => {
    expect(kstMidnight('2026-10-22')).toBe(Date.parse('2026-10-21T15:00:00Z'));
    expect(kstMinutes(kstMidnight('2026-10-22'))).toBe(0);
  });
});

describe('HH:MM', () => {
  it('왕복 변환', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes('24:00')).toBe(1440);
    expect(fromMinutes(850)).toBe('14:10');
    expect(fromMinutes(850.9)).toBe('14:10');
  });
});
