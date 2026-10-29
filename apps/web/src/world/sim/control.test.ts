import { describe, expect, it } from 'vitest';
import { CAMPUS } from '@4this/shared';
import { freeSpot, isBlocked, resolveMove } from './collision';
import { createThrottle, keyDirection, toWorld } from './input';
import { CONTROL_STATUS, planReturn, pushSample, remotePose, sampleReturn } from './remote';

describe('충돌', () => {
  it('맵 경계·건물·연못은 막혀 있고 길은 열려 있다', () => {
    expect(isBlocked(CAMPUS, [0, 3])).toBe(false); // 광장
    expect(isBlocked(CAMPUS, [16, -2])).toBe(true); // 공학관 안
    expect(isBlocked(CAMPUS, [-15, 0])).toBe(true); // 연못
    expect(isBlocked(CAMPUS, [0, 24.9])).toBe(true); // 맵 끝
  });

  it('벽에 비스듬히 부딪히면 벽을 따라 미끄러진다', () => {
    // 공학관 서쪽 벽(x=12) 앞에서 북동쪽으로 → z만 움직인다
    expect(resolveMove(CAMPUS, [11.5, 0], [12.5, -1])).toEqual([11.5, -1]);
  });

  it('맵 밖으로는 나가지 못한다', () => {
    const p = resolveMove(CAMPUS, [24, 0], [30, 0]);
    expect(p[0]).toBeLessThanOrEqual(25 - 0.35);
  });

  it('건물 안에서 시작하면 가장 가까운 길목으로 옮긴다', () => {
    expect(freeSpot(CAMPUS, [16, -2])).toEqual(CAMPUS.graph.nodes['eng-door']);
    expect(freeSpot(CAMPUS, [0, 3])).toEqual([0, 3]);
  });
});

describe('입력', () => {
  it('WASD·방향키 → [오른쪽, 앞], 대각선은 길이 1', () => {
    expect(keyDirection(new Set(['KeyW']))).toEqual([0, 1]);
    expect(keyDirection(new Set(['ArrowLeft']))).toEqual([-1, 0]);
    const diag = keyDirection(new Set(['KeyW', 'KeyD']));
    expect(Math.hypot(...diag)).toBeCloseTo(1);
    expect(keyDirection(new Set(['KeyW', 'KeyS']))).toEqual([0, 0]);
  });

  it('카메라가 북쪽(-z)을 보면 앞은 -z, 오른쪽은 +x', () => {
    const fwd = toWorld([0, 1], [0, -1]);
    expect(fwd[0]).toBeCloseTo(0);
    expect(fwd[1]).toBeCloseTo(-1);
    const right = toWorld([1, 0], [0, -1]);
    expect(right[0]).toBeCloseTo(1);
    expect(right[1]).toBeCloseTo(0);
  });

  it('스로틀: 초당 15회를 넘지 않는다', () => {
    const allow = createThrottle(15);
    let sent = 0;
    for (let t = 0; t < 1000; t += 1000 / 60) if (allow(t)) sent++;
    expect(sent).toBeLessThanOrEqual(15);
    expect(sent).toBeGreaterThanOrEqual(14);
  });
});

describe('다른 사람의 조종 상태', () => {
  it('두 상태 사이를 받은 간격만큼 보간한다', () => {
    const base = { facing: 0, moving: true, y: 0, floor: 1 };
    let track = pushSample(undefined, { ...base, x: 0, z: 0, at: 1000 });
    expect(remotePose(track, 1000).position).toEqual([0, 0, 0]);
    track = pushSample(track, { ...base, x: 1, z: 0, facing: 1, y: 3.2, floor: 2, at: 1100 });
    expect(remotePose(track, 1150).position[0]).toBeCloseTo(0.5);
    // 계단을 오르면 높이도 보간한다
    expect(remotePose(track, 1150).position[1]).toBeCloseTo(1.6);
    expect(remotePose(track, 1300)).toMatchObject({
      position: [1, 3.2, 0],
      floor: 2,
      facing: 1,
      pose: 'walk',
      status: CONTROL_STATUS,
    });
  });
});

describe('조종이 풀린 뒤 걸어서 복귀', () => {
  it('목표까지 길을 찾지 않고 곧장(최단 거리) 1.5 m/s로 걷고, 끝나면 null', () => {
    const walk = planReturn([0, 5], [10.5, -2], 0, '공강');
    expect(walk.pts).toEqual([
      [0, 5],
      [10.5, -2],
    ]);
    expect(walk.length).toBeCloseTo(Math.hypot(10.5, 7));
    const mid = sampleReturn(walk, 1000)!;
    expect(mid).toMatchObject({ pose: 'walk', status: '공강' });
    const moved = Math.hypot(mid.position[0], mid.position[2] - 5);
    expect(moved).toBeCloseTo(1.5);
    expect(sampleReturn(walk, (walk.length / 1.5) * 1000 + 1)).toBeNull();
  });
});
