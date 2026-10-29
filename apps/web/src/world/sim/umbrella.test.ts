import { describe, expect, it } from 'vitest';
import type { Pose } from '@4this/shared';
import { needsUmbrella } from './umbrella';

const pose = (p: Partial<Pose>): Pose => ({
  position: [0, 0, 3],
  facing: 0,
  pose: 'walk',
  placeId: 'transit',
  floor: 1,
  status: '',
  opacity: 1,
  ...p,
});

describe('needsUmbrella', () => {
  it('비·눈이 올 때 바깥에 있으면 우산을 쓴다', () => {
    expect(needsUmbrella(pose({}), 'rain')).toBe(true);
    expect(needsUmbrella(pose({ placeId: 'plaza', pose: 'stand' }), 'snow')).toBe(true);
    expect(needsUmbrella(pose({ placeId: 'door', pose: 'stand' }), 'rain')).toBe(true);
  });

  it('맑거나 흐리면 쓰지 않는다', () => {
    expect(needsUmbrella(pose({}), 'clear')).toBe(false);
    expect(needsUmbrella(pose({}), 'cloudy')).toBe(false);
    expect(needsUmbrella(pose({}), null)).toBe(false);
  });

  it('건물 안·위층·앉거나 누운 자세면 쓰지 않는다', () => {
    expect(needsUmbrella(pose({ position: [16, 0, -2] }), 'rain')).toBe(false); // 공학관 1층
    expect(needsUmbrella(pose({ floor: 2, position: [16, 3.2, -2] }), 'rain')).toBe(false);
    expect(needsUmbrella(pose({ placeId: 'cafe', pose: 'sitSip' }), 'rain')).toBe(false);
    expect(needsUmbrella(pose({ pose: 'sleep' }), 'rain')).toBe(false);
  });
});
