import { beforeEach, describe, expect, it } from 'vitest';
import { useSound } from './sound';

beforeEach(() => {
  localStorage.clear();
  useSound.setState({ enabled: false });
});

describe('useSound', () => {
  it('기본은 꺼짐, 누르면 켜지고 브라우저에 기억한다', () => {
    expect(useSound.getState().enabled).toBe(false);
    useSound.getState().toggle();
    expect(useSound.getState().enabled).toBe(true);
    expect(localStorage.getItem('4this-sound')).toBe('on');
    useSound.getState().toggle();
    expect(localStorage.getItem('4this-sound')).toBe('off');
  });
});
