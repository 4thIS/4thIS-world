import { describe, expect, it } from 'vitest';
import type { Pose } from '@4this/shared';
import { HIDDEN_DISPLAY, damp, dampAngle, displayOf, sameDisplay, stepPosition } from './motion';

const pose = (over: Partial<Pose> = {}): Pose => ({
  position: [0, 0, 0],
  facing: 0,
  pose: 'walk',
  placeId: 'transit',
  floor: 1,
  status: '등교 중',
  opacity: 1,
  ...over,
});

describe('보간', () => {
  it('damp는 프레임을 나눠도 같은 곳에 닿는다', () => {
    const once = damp(0, 10, 12, 0.1);
    const twice = damp(damp(0, 10, 12, 0.05), 10, 12, 0.05);
    expect(twice).toBeCloseTo(once);
    expect(once).toBeGreaterThan(5);
    expect(once).toBeLessThan(10);
  });

  it('dampAngle은 짧은 쪽으로 돈다 (π 근처를 넘어갈 때)', () => {
    const next = dampAngle(Math.PI - 0.1, -Math.PI + 0.1, 10, 1);
    expect(next).toBeGreaterThan(Math.PI - 0.1);
  });

  it('stepPosition은 처음이거나 2.5 m 넘게 튀면 바로 옮긴다', () => {
    expect(stepPosition([0, 0, 0], [1, 0, 0], 1 / 60)[0]).toBeLessThan(1);
    expect(stepPosition([0, 0, 0], [1, 0, 0], 1 / 60, true)).toEqual([1, 0, 0]);
    expect(stepPosition([0, 0, 0], [0, 3.2, 0], 1 / 60)).toEqual([0, 3.2, 0]);
  });
});

describe('displayOf', () => {
  it('부재·가려짐은 숨김', () => {
    expect(displayOf(null)).toBe(HIDDEN_DISPLAY);
    expect(displayOf(pose(), true)).toBe(HIDDEN_DISPLAY);
  });

  it('투명도를 0.1 단위로 끊어 렌더 횟수를 줄인다', () => {
    expect(displayOf(pose({ opacity: 0.43 })).opacity).toBe(0.4);
    expect(
      sameDisplay(displayOf(pose({ opacity: 0.41 })), displayOf(pose({ opacity: 0.44 }))),
    ).toBe(true);
    expect(sameDisplay(displayOf(pose()), displayOf(pose({ pose: 'stand' })))).toBe(false);
    expect(displayOf(pose({ opacity: 0.02 })).visible).toBe(false);
  });
});
