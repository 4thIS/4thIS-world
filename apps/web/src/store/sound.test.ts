import { beforeEach, describe, expect, it } from 'vitest';
import { useSound } from './sound';

beforeEach(() => {
  localStorage.clear();
  useSound.setState({ enabled: false, volume: 0.7 });
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

  it('크기는 0~1로 자르고 기억한다', () => {
    useSound.getState().setVolume(0.35);
    expect(useSound.getState().volume).toBe(0.35);
    expect(localStorage.getItem('4this-sound-volume')).toBe('0.35');
    useSound.getState().setVolume(3);
    expect(useSound.getState().volume).toBe(1);
  });
});
