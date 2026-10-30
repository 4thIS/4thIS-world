import { describe, expect, it } from 'vitest';
import {
  AUTO_SPEED,
  DRAG_RAD_PER_PX,
  INITIAL_TURN,
  RESUME_DELAY,
  drag,
  grab,
  release,
  tick,
} from './turntable';

describe('꾸미기 미리보기 돌리기', () => {
  it('기본은 천천히 한 방향으로 돈다', () => {
    expect(tick(INITIAL_TURN, 1).angle).toBeCloseTo(AUTO_SPEED);
  });

  it('잡고 끌면 끈 만큼 돌고, 잡고 있는 동안은 저절로 돌지 않는다', () => {
    let s = grab(INITIAL_TURN, 100);
    s = drag(s, 150);
    expect(s.angle).toBeCloseTo(50 * DRAG_RAD_PER_PX);
    s = drag(s, 120);
    expect(s.angle).toBeCloseTo(20 * DRAG_RAD_PER_PX);
    expect(tick(s, 5).angle).toBe(s.angle);
  });

  it('놓으면 잠깐 멈췄다가 다시 돈다', () => {
    let s = release(drag(grab(INITIAL_TURN, 0), 100));
    const at = s.angle;
    s = tick(s, RESUME_DELAY - 0.5);
    expect(s.angle).toBe(at);
    s = tick(s, 1);
    expect(s.angle).toBeCloseTo(at + 0.5 * AUTO_SPEED);
  });

  it('잡지 않고 끌면 무시한다', () => {
    expect(drag(INITIAL_TURN, 300)).toBe(INITIAL_TURN);
  });
});
