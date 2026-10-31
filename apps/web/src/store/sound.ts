import { create } from 'zustand';
import {
  SOUND_CHANNELS,
  playSfx,
  setChannelVolume,
  setSoundEnabled,
  unlockAudio,
  type SoundChannel,
} from '../sound/audio';

/** 소리 켜기/끄기와 갈래별 크기. 기본은 꺼짐이고, 브라우저에 기억한다 */
const KEY = '4this-sound';
/** 예전(한 갈래) 크기. 목소리 크기로 옮긴다 */
const OLD_VOLUME_KEY = '4this-sound-volume';
const volumeKey = (ch: SoundChannel) => `4this-sound-volume-${ch}`;

export const DEFAULT_VOLUMES: Record<SoundChannel, number> = { music: 0.5, sfx: 0.7, voice: 0.7 };

function saved(): boolean {
  try {
    return window.localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

function readVolume(key: string): number | null {
  try {
    const raw = window.localStorage.getItem(key);
    const v = Number(raw);
    return raw !== null && v >= 0 && v <= 1 ? v : null;
  } catch {
    return null;
  }
}

export function savedVolumes(): Record<SoundChannel, number> {
  const out = { ...DEFAULT_VOLUMES };
  for (const ch of SOUND_CHANNELS) {
    out[ch] =
      readVolume(volumeKey(ch)) ??
      (ch === 'voice' ? readVolume(OLD_VOLUME_KEY) : null) ??
      DEFAULT_VOLUMES[ch];
  }
  return out;
}

interface SoundState {
  enabled: boolean;
  /** 갈래별 크기 0~1 */
  volumes: Record<SoundChannel, number>;
  toggle: () => void;
  setVolume: (ch: SoundChannel, v: number) => void;
}

const initialVolumes = typeof window === 'undefined' ? DEFAULT_VOLUMES : savedVolumes();
const initialEnabled = typeof window === 'undefined' ? false : saved();
for (const ch of SOUND_CHANNELS) setChannelVolume(ch, initialVolumes[ch]);
setSoundEnabled(initialEnabled);

export const useSound = create<SoundState>()((set, get) => ({
  // 기억해 둔 "켜짐"이라도 첫 클릭·키 입력 전에는 브라우저가 소리를 막는다 (installAudioUnlock)
  enabled: initialEnabled,
  volumes: initialVolumes,
  setVolume: (ch, v) => {
    const volume = Math.min(1, Math.max(0, v));
    try {
      window.localStorage.setItem(volumeKey(ch), String(volume));
    } catch {
      // 저장소가 막혀 있으면 이번 방문 동안만
    }
    setChannelVolume(ch, volume);
    set({ volumes: { ...get().volumes, [ch]: volume } });
  },
  toggle: () => {
    const enabled = !get().enabled;
    if (enabled) unlockAudio();
    setSoundEnabled(enabled);
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

/** 화면 버튼을 누르면 아주 작은 '톡' (3D 캔버스 클릭은 빼고) */
export function installClickSound(): () => void {
  const onClick = (e: MouseEvent) => {
    const target =
      e.target instanceof Element ? e.target.closest('button, [role="menuitem"]') : null;
    if (target && !(target as HTMLButtonElement).disabled) playSfx('click', 0.6);
  };
  window.addEventListener('click', onClick, true);
  return () => window.removeEventListener('click', onClick, true);
}
