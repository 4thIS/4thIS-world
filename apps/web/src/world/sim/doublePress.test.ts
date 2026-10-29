import { describe, expect, it } from 'vitest';
import { DOUBLE_PRESS_MS, isDoublePress } from './doublePress';

const press = (x: number, y: number, at: number) => ({ x, y, at });

describe('isDoublePress', () => {
  it('짧은 시간 안에 같은 곳을 두 번 누르면 더블 클릭', () => {
    expect(isDoublePress(press(100, 100, 0), press(104, 98, 200))).toBe(true);
  });

  it('너무 늦거나 멀면 아니다', () => {
    expect(isDoublePress(press(100, 100, 0), press(100, 100, DOUBLE_PRESS_MS + 1))).toBe(false);
    expect(isDoublePress(press(100, 100, 0), press(160, 100, 100))).toBe(false);
    expect(isDoublePress(null, press(100, 100, 0))).toBe(false);
  });
});
