import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_VOLUMES, savedVolumes, useSound } from './sound';

beforeEach(() => {
  localStorage.clear();
  useSound.setState({ enabled: false, volumes: DEFAULT_VOLUMES });
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

  it('갈래별 크기는 0~1로 자르고 기억한다', () => {
    useSound.getState().setVolume('sfx', 0.35);
    expect(useSound.getState().volumes.sfx).toBe(0.35);
    expect(localStorage.getItem('4this-sound-volume-sfx')).toBe('0.35');
    useSound.getState().setVolume('voice', 3);
    expect(useSound.getState().volumes.voice).toBe(1);
    expect(savedVolumes()).toEqual({ music: 0.5, sfx: 0.35, voice: 1 });
  });

  it('예전 한 갈래 크기는 목소리 크기로 옮긴다', () => {
    localStorage.setItem('4this-sound-volume', '0.2');
    expect(savedVolumes().voice).toBe(0.2);
  });
});
