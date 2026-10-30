import { create } from 'zustand';
import { unlockAudio } from '../sound/audio';

/** 소리 켜기/끄기. 기본은 꺼짐이고, 브라우저에 기억한다 */
const KEY = '4this-sound';

function saved(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

interface SoundState {
  enabled: boolean;
  toggle: () => void;
}

export const useSound = create<SoundState>()((set, get) => ({
  // 기억해 둔 "켜짐"이라도 첫 클릭·키 입력 전에는 브라우저가 소리를 막는다 (installAudioUnlock)
  enabled: typeof window === 'undefined' ? false : saved(),
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
