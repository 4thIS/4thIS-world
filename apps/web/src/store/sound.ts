import { create } from 'zustand';
import { unlockAudio } from '../sound/audio';

/** 소리 켜기/끄기. 기본은 꺼짐이고, 브라우저에 기억한다 */
const KEY = '4this-sound';
const VOLUME_KEY = '4this-sound-volume';
export const DEFAULT_VOLUME = 0.7;

function saved(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

function savedVolume(): number {
  try {
    const v = Number(window.localStorage.getItem(VOLUME_KEY));
    return window.localStorage.getItem(VOLUME_KEY) !== null && v >= 0 && v <= 1
      ? v
      : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

interface SoundState {
  enabled: boolean;
  /** 0~1 대사음 크기 */
  volume: number;
  toggle: () => void;
  setVolume: (v: number) => void;
}

export const useSound = create<SoundState>()((set, get) => ({
  // 기억해 둔 "켜짐"이라도 첫 클릭·키 입력 전에는 브라우저가 소리를 막는다 (installAudioUnlock)
  enabled: typeof window === 'undefined' ? false : saved(),
  volume: typeof window === 'undefined' ? DEFAULT_VOLUME : savedVolume(),
  setVolume: (v) => {
    const volume = Math.min(1, Math.max(0, v));
    try {
      window.localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      // 저장소가 막혀 있으면 이번 방문 동안만
    }
    set({ volume });
  },
  toggle: () => {
    const enabled = !get().enabled;
    if (enabled) unlockAudio();
    try {
      window.localStorage.setItem(KEY, enabled ? 'on' : 'off');
    } catch {
      // 저장소가 막혀 있으면 이번 방문 동안만
    }
    set({ enabled });
  },
}));

/** 켜 둔 채로 다시 들어왔으면 첫 클릭·키 입력 때 소리를 깨운다 */
export function installAudioUnlock(): () => void {
  const wake = () => {
    if (useSound.getState().enabled) unlockAudio();
  };
  window.addEventListener('pointerdown', wake);
  window.addEventListener('keydown', wake);
  return () => {
    window.removeEventListener('pointerdown', wake);
    window.removeEventListener('keydown', wake);
  };
}
