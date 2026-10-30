import { describe, expect, it } from 'vitest';
import { SHOT_RANGE } from '@4this/shared';
import { HIT_MS, findHit, hitFrame, shotPosition, travelSec } from './shots';
import { poseFrame } from '../characters/poses';

describe('findHit', () => {
  const targets = [
    { id: 'near', x: 0, y: 0, z: 4 },
    { id: 'far', x: 0, y: 0, z: 8 },
    { id: 'side', x: 3, y: 0, z: 5 },
    { id: 'upstairs', x: 0, y: 3.2, z: 2 },
  ];

  it('보는 방향 직선에서 가장 가까운 캐릭터를 맞힌다', () => {
    expect(findHit([0, 0, 0], [0, 1], targets)).toEqual({ id: 'near', dist: 4 });
  });

  it('옆으로 벗어나거나 사거리 밖·뒤·다른 층이면 안 맞는다', () => {
    expect(findHit([0, 0, 0], [1, 0], targets)).toBeNull();
    expect(findHit([0, 0, 0], [0, -1], targets)).toBeNull();
    expect(findHit([0, 0, -SHOT_RANGE - 5], [0, 1], [{ id: 'x', x: 0, y: 0, z: 0 }])).toBeNull();
  });
});

describe('shotPosition', () => {
  it('물총·눈덩이는 포물선, 광선총은 곧게 날아가고 다 가면 null', () => {
    const from: [number, number, number] = [0, 1, 0];
    const water = { weapon: 'water' as const, from, dir: [0, 1] as [number, number], dist: 6 };
    const mid = shotPosition(water, travelSec('water', 6) / 2)!;
    expect(mid[2]).toBeCloseTo(3, 1);
    expect(mid[1]).toBeGreaterThan(1);
    expect(shotPosition(water, travelSec('water', 6) + 0.01)).toBeNull();
    const ray = { ...water, weapon: 'ray' as const };
    expect(shotPosition(ray, travelSec('ray', 6) / 2)![1]).toBeCloseTo(1);
  });

  it('광선총이 가장 빠르다', () => {
    expect(travelSec('ray', 10)).toBeLessThan(travelSec('water', 10));
    expect(travelSec('snow', 10)).toBeGreaterThan(travelSec('water', 10));
  });
});

describe('hitFrame', () => {
  const base = poseFrame('stand', 1, 0);

  it('맞으면 잠깐 반응하고 끝나면 null', () => {
    expect(hitFrame(base, 'water', 300)).not.toBeNull();
    expect(hitFrame(base, 'water', HIT_MS)).toBeNull();
    // 아직 날아오는 중(음수)이면 그대로
    expect(hitFrame(base, 'water', -100)).toBeNull();
  });

  it('광선총은 빙글 돌고, 눈덩이는 뒤로 젖혀진다', () => {
    expect(Math.abs(hitFrame(base, 'ray', 400)!.bodyYaw ?? 0)).toBeGreaterThan(1);
    expect(hitFrame(base, 'snow', 250)!.bodyPitch).toBeLessThan(-0.1);
  });
});
