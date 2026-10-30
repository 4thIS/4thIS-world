import { describe, expect, it } from 'vitest';
import { KINDS } from '@4this/shared';
import { kindPlace } from './kindPlaces';

describe('kindPlace (일정 종류 → 캠퍼스 위치)', () => {
  it('강의·연구·도서관은 건물과 층', () => {
    expect(kindPlace('lecture1')).toBe('공학관 1층');
    expect(kindPlace('lecture3')).toBe('공학관 3층');
    expect(kindPlace('research')).toBe('연구동 2층');
    expect(kindPlace('library')).toBe('본관 3층');
  });

  it('외부 일정은 카페에서 보낸다', () => {
    expect(kindPlace('external')).toBe('카페');
  });

  it('모든 종류에 위치가 있다', () => {
    for (const k of KINDS) expect(kindPlace(k)).toBeTruthy();
  });
});
