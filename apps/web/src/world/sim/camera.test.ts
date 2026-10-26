import { describe, expect, it } from 'vitest';
import { CAMPUS } from '@4this/shared';
import { FOLLOW_DISTANCE, buildingGoal, followPosition } from './camera';

describe('buildingGoal', () => {
  it('건물 가운데를 남동쪽 위에서 본다', () => {
    const goal = buildingGoal('eng', CAMPUS);
    expect(goal.target[0]).toBe(16);
    expect(goal.target[1]).toBeCloseTo(4.8);
    expect(goal.target[2]).toBe(-2);
    expect(goal.position[0]).toBeGreaterThan(goal.target[0]);
    expect(goal.position[1]).toBeGreaterThan(goal.target[1]);
    expect(goal.position[2]).toBeGreaterThan(goal.target[2]);
  });
});

describe('followPosition', () => {
  it('멀면 FOLLOW_DISTANCE 쪽으로 당기고, 가까우면 그대로', () => {
    const far = followPosition([0, 0, 40], [0, 0, 0], 1);
    expect(far[2]).toBeCloseTo(FOLLOW_DISTANCE);
    expect(followPosition([0, 0, 10], [0, 0, 0], 1)).toEqual([0, 0, 10]);
    const half = followPosition([0, 0, 40], [0, 0, 0], 0.5);
    expect(half[2]).toBeCloseTo((40 + FOLLOW_DISTANCE) / 2);
  });
});
