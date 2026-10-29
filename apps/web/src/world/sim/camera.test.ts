import { describe, expect, it } from 'vitest';
import { CAMPUS } from '@4this/shared';
import {
  FOLLOW_DISTANCE,
  KEY_PAN_PER_DISTANCE,
  KEY_ROTATE_SPEED,
  acceptsCameraKeys,
  buildingGoal,
  clampTarget,
  followPosition,
  keyPan,
  keyRotate,
  orbitY,
} from './camera';

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

describe('clampTarget', () => {
  it('캠퍼스 안이면 그대로, 밖이면 ±25로 잘라 옮긴 만큼 돌려준다', () => {
    expect(clampTarget([3, 0, -4])).toEqual([0, 0]);
    expect(clampTarget([30, 2, -27])).toEqual([-5, 2]);
  });
});

describe('keyPan', () => {
  it('W는 카메라가 보는 쪽(바닥)으로, 거리에 비례해 움직인다', () => {
    // 카메라가 -z 쪽을 본다
    const near = keyPan(new Set(['KeyW']), [0, -1], 20, 1);
    expect(near[0]).toBeCloseTo(0);
    expect(near[1]).toBeCloseTo(-20 * KEY_PAN_PER_DISTANCE);
    const far = keyPan(new Set(['KeyW']), [0, -1], 40, 1);
    expect(far[1]).toBeCloseTo(near[1] * 2);
  });

  it('D는 오른쪽, 아무 키도 없으면 0', () => {
    const right = keyPan(new Set(['KeyD']), [0, -1], 20, 1);
    expect(right[0]).toBeGreaterThan(0);
    expect(keyPan(new Set(), [0, -1], 20, 1)).toEqual([0, 0]);
  });
});

describe('keyRotate', () => {
  it('Q는 +, E는 -, 둘 다면 0', () => {
    expect(keyRotate(new Set(['KeyQ']), 1)).toBeCloseTo(KEY_ROTATE_SPEED);
    expect(keyRotate(new Set(['KeyE']), 1)).toBeCloseTo(-KEY_ROTATE_SPEED);
    expect(keyRotate(new Set(['KeyQ', 'KeyE']), 1)).toBe(0);
  });
});

describe('orbitY', () => {
  it('바라보는 점을 축으로 돌리고, 높이와 거리는 지킨다', () => {
    const p = orbitY([10, 5, 0], [0, 0, 0], Math.PI / 2);
    expect(p[0]).toBeCloseTo(0);
    expect(p[1]).toBe(5);
    expect(p[2]).toBeCloseTo(-10);
  });
});

describe('acceptsCameraKeys', () => {
  const free = { controlling: false, modalOpen: false, typing: false };
  it('조종 중·모달·글자 입력 중에는 받지 않는다', () => {
    expect(acceptsCameraKeys(free)).toBe(true);
    expect(acceptsCameraKeys({ ...free, controlling: true })).toBe(false);
    expect(acceptsCameraKeys({ ...free, modalOpen: true })).toBe(false);
    expect(acceptsCameraKeys({ ...free, typing: true })).toBe(false);
  });
});
