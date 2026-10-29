import { describe, expect, it } from 'vitest';
import { CAMPUS, FLOOR_HEIGHT, type Vec2 } from '@4this/shared';
import {
  buildingAt,
  moverFloor,
  moverHeight,
  startMover,
  stepMover,
  type MoverState,
} from './indoor';

const at = (pos: Vec2, floor = 1): MoverState => ({ pos, floor, stair: null });

/** from에서 to까지 작은 걸음으로 걸어간 마지막 상태 */
function walk(s: MoverState, to: Vec2, step = 0.1): MoverState {
  let cur = s;
  for (let i = 0; i < 400; i++) {
    const dx = to[0] - cur.pos[0];
    const dz = to[1] - cur.pos[1];
    const d = Math.hypot(dx, dz);
    if (d < 1e-6) break;
    const k = Math.min(1, step / d);
    cur = stepMover(CAMPUS, cur, [cur.pos[0] + dx * k, cur.pos[1] + dz * k]);
  }
  return cur;
}

describe('건물 드나들기', () => {
  it('공학관은 문(서쪽 x=12, z=-2)으로만 들어간다', () => {
    // 문 정면으로 걸어 들어간다
    const inside = walk(at([10.5, -2]), [14, -2]);
    expect(inside.pos[0]).toBeCloseTo(14);
    expect(buildingAt(inside.pos)?.id).toBe('eng');
    // 문이 없는 벽으로는 못 들어간다
    const blocked = walk(at([10.5, 2]), [14, 2]);
    expect(blocked.pos[0]).toBeLessThan(12);
  });

  it('안에서는 벽 밖으로 못 나가고, 문으로 다시 나온다', () => {
    const wall = walk(at([18, -2]), [22, -2]);
    expect(wall.pos[0]).toBeLessThan(20);
    const out = walk(at([14, -2]), [10.5, -2]);
    expect(out.pos[0]).toBeCloseTo(10.5);
  });

  it('연못 같은 바깥 장애물은 그대로 막는다', () => {
    const s = walk(at([-15, 5]), [-15, 0]);
    expect(Math.hypot(s.pos[0] + 15, s.pos[1])).toBeGreaterThan(3.5);
  });
});

describe('계단', () => {
  // 공학관 계단: 시작 (19.3, 3.4)에서 북쪽(-z)으로 3 m
  it('1층에서 계단 아래쪽으로 들어가 끝까지 오르면 2층', () => {
    let s = walk(at([19.3, 4.4]), [19.3, 3.0]);
    expect(s.stair).toBe(1);
    expect(moverHeight(s)).toBeGreaterThan(0);
    expect(moverHeight(s)).toBeLessThan(FLOOR_HEIGHT);
    s = walk(s, [19.3, 0]);
    expect(s).toMatchObject({ floor: 2, stair: null });
    expect(moverHeight(s)).toBeCloseTo(FLOOR_HEIGHT);
  });

  it('2층에서 계단 위쪽으로 들어가 내려가면 1층', () => {
    let s = walk(at([19.3, -0.5], 2), [19.3, 1]);
    expect(s.stair).toBe(1);
    expect(moverFloor(s)).toBe(2);
    s = walk(s, [19.3, 4.4]);
    expect(s).toMatchObject({ floor: 1, stair: null });
    expect(moverHeight(s)).toBe(0);
  });

  it('2층에서 계단 아래쪽으로 들어가면 3층으로 오른다', () => {
    const s = walk(walk(at([19.3, 4.4], 2), [19.3, 2]), [19.3, 0]);
    expect(s).toMatchObject({ floor: 3, stair: null });
    expect(moverHeight(s)).toBeCloseTo(FLOOR_HEIGHT * 2);
  });

  it('옆에서는 계단에 못 들어가고, 꼭대기 층 계단 구멍·1층 계단 뒤쪽도 막힌다', () => {
    expect(walk(at([17.5, 2]), [19.3, 2]).pos[0]).toBeLessThan(18.5);
    expect(walk(at([19.3, -0.5]), [19.3, 1]).pos[1]).toBeLessThan(0.4); // 1층 뒤쪽
    expect(walk(at([19.3, 4.4], 3), [19.3, 2]).pos[1]).toBeGreaterThan(3.4); // 3층 구멍
  });

  it('계단 위에서는 옆으로 새지 않는다', () => {
    const s = walk(at([19.3, 4.4]), [19.3, 2]);
    const side = stepMover(CAMPUS, s, [18, 2]);
    expect(side.stair).toBe(1);
    expect(Math.abs(side.pos[0] - 19.3)).toBeLessThan(0.5);
  });

  it('2층 이상에서는 건물 밖으로 못 나간다', () => {
    const s = walk(at([14, -2], 2), [10, -2]);
    expect(s.pos[0]).toBeGreaterThan(12);
  });
});

describe('조종 시작 자리', () => {
  it('높이로 층을 정하고, 건물 안 자리는 그대로 쓴다', () => {
    expect(startMover(CAMPUS, [16, FLOOR_HEIGHT, -2])).toEqual(at([16, -2], 2));
    expect(startMover(CAMPUS, [0, 0, 3])).toEqual(at([0, 3]));
  });

  it('바깥 장애물 안이면 가장 가까운 길목으로 옮긴다', () => {
    expect(startMover(CAMPUS, [-15, 0, 0])).toEqual(at(CAMPUS.graph.nodes['park']!));
  });
});
