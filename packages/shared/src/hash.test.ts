import { describe, expect, it } from 'vitest';
import { hashString, rand01 } from './hash';

describe('hashString', () => {
  it('FNV-1a 32비트 표준값과 같다', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('a')).toBe(0xe40c292c);
  });
});

describe('rand01', () => {
  it('같은 입력이면 같은 값, 범위는 [0, 1)', () => {
    const a = rand01('m1', '2026-10-21', 3);
    expect(rand01('m1', '2026-10-21', 3)).toBe(a);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    expect(rand01('m2', '2026-10-21', 3)).not.toBe(a);
  });
});

describe('rand01 분포', () => {
  it('끝 숫자만 다른 연속 입력도 고르게 퍼진다', () => {
    for (const seed of ['x0|2026-10-21', 'x3|2026-10-21', 'abc|2026-10-22']) {
      let low = 0;
      for (let slot = 405; slot < 480; slot++) if (rand01(seed, slot) < 1 / 3) low++;
      expect(low / 75).toBeGreaterThan(0.18);
      expect(low / 75).toBeLessThan(0.5);
    }
  });
});
