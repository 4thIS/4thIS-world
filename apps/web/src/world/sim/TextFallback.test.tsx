import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOOK } from '@4this/shared';
import { useWorld } from '../../store/world';
import { TextFallback } from './TextFallback';
import { hasWebGL } from './webgl';

const WED_1435 = Date.parse('2026-10-21T14:35:00+09:00');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(WED_1435);
  useWorld.setState(useWorld.getInitialState(), true);
  useWorld.getState().setWorld({
    serverTime: WED_1435,
    members: [
      {
        id: 'a',
        username: '철수',
        look: DEFAULT_LOOK,
        schedules: [{ day: 2, start: '14:00', end: '16:00', kind: 'lecture2' }],
      },
      { id: 'b', username: '영희', look: { ...DEFAULT_LOOK, animal: 'duck' }, schedules: [] },
    ],
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TextFallback', () => {
  it('jsdom에는 WebGL이 없다', () => {
    expect(hasWebGL()).toBe(false);
  });

  it('누가 어디 있는지 목록으로 보여 준다', () => {
    render(<TextFallback />);
    expect(screen.getByText(/3D 캠퍼스를 표시할 수 없어요/)).toBeTruthy();
    expect(screen.getByText('철수').parentElement?.textContent).toBe(
      '🐶 철수 — 공학관 2층 · 2학년 강의',
    );
    expect(screen.getByText('영희').parentElement?.textContent).toBe('🦆 영희 — 캠퍼스 밖');
  });

  it('5초마다 새로 계산한다', () => {
    render(<TextFallback />);
    vi.setSystemTime(Date.parse('2026-10-21T16:10:00+09:00'));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('철수').parentElement?.textContent).toBe('🐶 철수 — 캠퍼스 밖');
  });
});
