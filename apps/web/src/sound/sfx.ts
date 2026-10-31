import { EMOJIS, type Emoji, type Motion, type Weapon } from '@4this/shared';

/**
 * 합성 효과음 레시피. 파일 없이 Web Audio 발진기·잡음으로 만든다 (audio.ts의 playSfx가 그린다).
 * 소리 하나 = 겹쳐 내는 층(Layer) 몇 개. 시간은 초, 주파수는 Hz.
 */
export type Wave = OscillatorType | 'noise';

export interface Layer {
  wave: Wave;
  /** 시작 높이 (잡음이면 필터 중심) */
  f0: number;
  /** 끝 높이. 없으면 f0 그대로 */
  f1?: number;
  /** 소리 시작부터 몇 초 뒤에 */
  at?: number;
  dur: number;
  gain: number;
  filter?: { type: BiquadFilterType; freq: number; q?: number };
}

export const SFX_NAMES = [
  'shotWater',
  'hitWater',
  'shotSnow',
  'hitSnow',
  'shotRay',
  'hitRay',
  'emote',
  'clap',
  'firework',
  'jump',
  'note',
  'door',
  'click',
  'notify',
] as const;
export type SfxName = (typeof SFX_NAMES)[number];

export const SFX: Record<SfxName, Layer[]> = {
  // 물총: '퓩' / '첨벙'
  shotWater: [
    {
      wave: 'noise',
      f0: 1800,
      dur: 0.12,
      gain: 0.35,
      filter: { type: 'bandpass', freq: 1800, q: 2 },
    },
    { wave: 'sine', f0: 900, f1: 380, dur: 0.1, gain: 0.25 },
  ],
  hitWater: [
    { wave: 'noise', f0: 1200, dur: 0.35, gain: 0.55, filter: { type: 'lowpass', freq: 1400 } },
    { wave: 'sine', f0: 320, f1: 120, dur: 0.16, gain: 0.3 },
  ],
  // 눈덩이: '휙' / '퍽'
  shotSnow: [
    {
      wave: 'noise',
      f0: 900,
      dur: 0.2,
      gain: 0.4,
      filter: { type: 'bandpass', freq: 900, q: 1.2 },
    },
  ],
  hitSnow: [
    { wave: 'noise', f0: 600, dur: 0.13, gain: 0.75, filter: { type: 'lowpass', freq: 700 } },
    { wave: 'sine', f0: 170, f1: 70, dur: 0.12, gain: 0.55 },
  ],
  // 광선총: '삐융' / '띠링'
  shotRay: [
    {
      wave: 'square',
      f0: 1500,
      f1: 300,
      dur: 0.22,
      gain: 0.16,
      filter: { type: 'lowpass', freq: 3200 },
    },
  ],
  hitRay: [
    { wave: 'triangle', f0: 1320, dur: 0.15, gain: 0.3 },
    { wave: 'triangle', f0: 1760, at: 0.08, dur: 0.25, gain: 0.3 },
  ],
  // 이모지: '뿅'
  emote: [{ wave: 'sine', f0: 520, f1: 1150, dur: 0.12, gain: 0.35 }],
  // 모션
  clap: [
    {
      wave: 'noise',
      f0: 1500,
      dur: 0.05,
      gain: 0.6,
      filter: { type: 'bandpass', freq: 1500, q: 1 },
    },
    {
      wave: 'noise',
      f0: 1500,
      at: 0.15,
      dur: 0.05,
      gain: 0.6,
      filter: { type: 'bandpass', freq: 1600, q: 1 },
    },
  ],
  firework: [
    { wave: 'sine', f0: 420, f1: 1500, dur: 0.5, gain: 0.12 },
    {
      wave: 'noise',
      f0: 900,
      at: 0.55,
      dur: 0.55,
      gain: 0.7,
      filter: { type: 'lowpass', freq: 900 },
    },
  ],
  jump: [
    {
      wave: 'square',
      f0: 300,
      f1: 720,
      dur: 0.15,
      gain: 0.13,
      filter: { type: 'lowpass', freq: 2000 },
    },
  ],
  note: [
    { wave: 'triangle', f0: 880, dur: 0.12, gain: 0.28 },
    { wave: 'triangle', f0: 1175, at: 0.1, dur: 0.18, gain: 0.28 },
  ],
  // 문: 작은 종 '딸랑'
  door: [
    { wave: 'sine', f0: 1568, dur: 0.5, gain: 0.22 },
    { wave: 'sine', f0: 2093, at: 0.07, dur: 0.45, gain: 0.18 },
  ],
  // 화면 버튼: 아주 작은 '톡'
  click: [{ wave: 'sine', f0: 1000, f1: 700, dur: 0.04, gain: 0.18 }],
  // 알림: '띠링'
  notify: [
    { wave: 'triangle', f0: 988, dur: 0.16, gain: 0.35 },
    { wave: 'triangle', f0: 1319, at: 0.13, dur: 0.38, gain: 0.35 },
  ],
};

/** 소리 길이 (초) */
export function sfxDuration(name: SfxName): number {
  return Math.max(...SFX[name].map((l) => (l.at ?? 0) + l.dur));
}

export function shotSfx(weapon: Weapon): SfxName {
  return weapon === 'water' ? 'shotWater' : weapon === 'snow' ? 'shotSnow' : 'shotRay';
}

export function hitSfx(weapon: Weapon): SfxName {
  return weapon === 'water' ? 'hitWater' : weapon === 'snow' ? 'hitSnow' : 'hitRay';
}

export function motionSfx(kind: Motion): SfxName {
  if (kind === 'clap' || kind === 'firework' || kind === 'jump') return kind;
  return 'note';
}

/** 이모지마다 '뿅' 높이를 조금씩 다르게 (1 = 원래 높이) */
export function emoteRate(emoji: Emoji): number {
  return 0.85 + EMOJIS.indexOf(emoji) * 0.06;
}

/**
 * 한꺼번에 너무 많이 내지 않게: 동시에 max개까지, 같은 소리가 mergeMs 안에 또 오면 하나로 친다.
 * now·durMs는 ms.
 */
export class SfxLimiter {
  private playing: number[] = [];
  private last = new Map<string, number>();

  constructor(
    private readonly max = 12,
    private readonly mergeMs = 40,
  ) {}

  tryPlay(name: string, now: number, durMs: number): boolean {
    const prev = this.last.get(name);
    if (prev !== undefined && now - prev < this.mergeMs) return false;
    this.playing = this.playing.filter((end) => end > now);
    if (this.playing.length >= this.max) return false;
    this.playing.push(now + durMs);
    this.last.set(name, now);
    return true;
  }
}
