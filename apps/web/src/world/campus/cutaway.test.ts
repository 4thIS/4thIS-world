import { describe, expect, it } from 'vitest';
import { approach, edgeOpacity, targetOpacity, wallFacesCamera } from './cutaway';

describe('wallFacesCamera', () => {
  const center = [16, -2] as const;

  it('카메라가 남동쪽이면 남쪽·동쪽 벽만 카메라를 본다', () => {
    const cam = [54, 38] as const;
    expect(wallFacesCamera([0, 1], center, cam)).toBe(true); // s
    expect(wallFacesCamera([1, 0], center, cam)).toBe(true); // e
    expect(wallFacesCamera([0, -1], center, cam)).toBe(false); // n
    expect(wallFacesCamera([-1, 0], center, cam)).toBe(false); // w
  });

  it('내적이 0.3 이하이면 투명하게 하지 않는다', () => {
    // 동쪽으로 거의 정면(내적 0.2): 남쪽 벽은 그대로
    expect(wallFacesCamera([0, 1], [0, 0], [0.98, 0.2])).toBe(false);
    expect(wallFacesCamera([0, 1], [0, 0], [0.9, 0.44])).toBe(true);
  });

  it('카메라가 바로 위면 어느 벽도 아니다', () => {
    expect(wallFacesCamera([0, 1], center, center)).toBe(false);
  });
});

describe('approach', () => {
  it('0.25초에 1 → 0.1 전체를 지나간다', () => {
    expect(approach(1, targetOpacity(true), 0.125)).toBeCloseTo(0.55);
    expect(approach(1, targetOpacity(true), 0.25)).toBeCloseTo(0.1);
    expect(approach(1, targetOpacity(true), 1)).toBe(0.1);
  });

  it('되돌아올 때도 같은 속도로, 목표를 넘지 않는다', () => {
    expect(approach(0.1, targetOpacity(false), 0.125)).toBeCloseTo(0.55);
    expect(approach(0.9, targetOpacity(false), 1)).toBe(1);
  });
});

describe('edgeOpacity', () => {
  it('벽이 흐려질수록 선이 진해진다', () => {
    expect(edgeOpacity(1)).toBe(0);
    expect(edgeOpacity(0.55)).toBeCloseTo(0.45);
    expect(edgeOpacity(0.1)).toBeCloseTo(0.9);
  });
});
