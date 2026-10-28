import { describe, expect, it } from 'vitest';
import { GLASS_COLOR, GLASS_OPACITY, litFloorsOf, WINDOW_LIGHT, windowGlow } from './nightLights';

describe('litFloorsOf', () => {
  it('이 건물의 층만 고른다', () => {
    const occupied = new Set(['eng:1', 'eng:3', 'main:2'] as const);
    expect([...litFloorsOf(occupied, 'eng')].sort()).toEqual([1, 3]);
    expect([...litFloorsOf(occupied, 'main')]).toEqual([2]);
    expect(litFloorsOf(occupied, 'cafe').size).toBe(0);
  });
});

describe('windowGlow', () => {
  it('낮이거나 사람이 없으면 꺼져 있다', () => {
    const off = { color: GLASS_COLOR, emissive: 0, opacity: GLASS_OPACITY };
    expect(windowGlow(0, true)).toEqual(off);
    expect(windowGlow(1, false)).toEqual(off);
  });

  it('밤에 사람이 있는 층은 밝고 불투명해진다', () => {
    const g = windowGlow(1, true);
    expect(g.color).toBe(WINDOW_LIGHT);
    expect(g.emissive).toBeCloseTo(1.2);
    expect(g.opacity).toBeCloseTo(0.95);
    expect(windowGlow(0.5, true).emissive).toBeCloseTo(0.6);
  });
});
