import { mixHex } from './pastel';

/**
 * 실제 한국 시각에 따른 하늘·조명 (설계 문서 §5.5). 순수 함수.
 * 06–09 복숭아빛 아침 / 09–17 하늘색 낮 / 17–19 분홍·보라 노을 / 19–06 남색 밤.
 * 구간 경계 앞뒤 15분씩, 모두 30분에 걸쳐 섞는다.
 */

export type SkyPhase = 'morning' | 'day' | 'sunset' | 'night';

export interface SkyPalette {
  background: string;
  fog: string;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  /** 0(낮) ~ 1(밤): 창문 불빛·가로등 세기 */
  night: number;
}

export const SKY_PALETTES: Record<SkyPhase, SkyPalette> = {
  morning: {
    background: '#ffe3d3',
    fog: '#ffe3d3',
    sunColor: '#ffd9b8',
    sunIntensity: 1.7,
    hemiSky: '#fff0e6',
    hemiGround: '#d8e6c4',
    hemiIntensity: 1.15,
    night: 0,
  },
  day: {
    background: '#dff0fb',
    fog: '#e8f3fb',
    sunColor: '#fff3e6',
    sunIntensity: 2.1,
    hemiSky: '#fff6fb',
    hemiGround: '#c9e8c4',
    hemiIntensity: 1.3,
    night: 0,
  },
  sunset: {
    background: '#f4c4dc',
    fog: '#e6c3ea',
    sunColor: '#ffb3c7',
    sunIntensity: 1.4,
    hemiSky: '#f3d4ef',
    hemiGround: '#c9b8d8',
    hemiIntensity: 0.95,
    night: 0,
  },
  night: {
    background: '#2c3157',
    fog: '#2c3157',
    sunColor: '#aab8ff',
    sunIntensity: 0.45,
    hemiSky: '#5a6394',
    hemiGround: '#2d3350',
    hemiIntensity: 0.55,
    night: 1,
  },
};

/** 구간 경계 (분)와 앞뒤 구간 */
const BOUNDARIES: { at: number; from: SkyPhase; to: SkyPhase }[] = [
  { at: 6 * 60, from: 'night', to: 'morning' },
  { at: 9 * 60, from: 'morning', to: 'day' },
  { at: 17 * 60, from: 'day', to: 'sunset' },
  { at: 19 * 60, from: 'sunset', to: 'night' },
];
export const BLEND_MIN = 30;

export function phaseAt(min: number): SkyPhase {
  const m = ((min % 1440) + 1440) % 1440;
  if (m >= 360 && m < 540) return 'morning';
  if (m >= 540 && m < 1020) return 'day';
  if (m >= 1020 && m < 1140) return 'sunset';
  return 'night';
}

export function mixPalette(a: SkyPalette, b: SkyPalette, t: number): SkyPalette {
  const n = (x: number, y: number) => x * (1 - t) + y * t;
  return {
    background: mixHex(a.background, b.background, t),
    fog: mixHex(a.fog, b.fog, t),
    sunColor: mixHex(a.sunColor, b.sunColor, t),
    sunIntensity: n(a.sunIntensity, b.sunIntensity),
    hemiSky: mixHex(a.hemiSky, b.hemiSky, t),
    hemiGround: mixHex(a.hemiGround, b.hemiGround, t),
    hemiIntensity: n(a.hemiIntensity, b.hemiIntensity),
    night: n(a.night, b.night),
  };
}

export interface Sky extends SkyPalette {
  /** 해(밤에는 달) 쪽 단위 벡터. 빛은 이 방향에서 원점을 비춘다 */
  sunDir: [number, number, number];
}

const MOON_DIR: [number, number, number] = [-0.35, 0.85, 0.4];

function normalize(v: [number, number, number]): [number, number, number] {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** 해 방향: 06시에 동쪽(+x) 낮게 떠서 정오 무렵 가장 높고 19시에 서쪽(-x)으로 진다 */
export function sunDirection(min: number): [number, number, number] {
  const p = Math.min(1, Math.max(0, (min - 360) / (1140 - 360)));
  const elev = 0.3 + Math.sin(p * Math.PI) * 1.2;
  return normalize([Math.cos(p * Math.PI), elev, 0.45]);
}

/** KST 자정부터 지난 분 → 하늘·조명 */
export function skyAt(min: number): Sky {
  const m = ((min % 1440) + 1440) % 1440;
  let palette = SKY_PALETTES[phaseAt(m)];
  for (const b of BOUNDARIES) {
    const d = m - b.at;
    if (Math.abs(d) < BLEND_MIN / 2) {
      palette = mixPalette(
        SKY_PALETTES[b.from],
        SKY_PALETTES[b.to],
        (d + BLEND_MIN / 2) / BLEND_MIN,
      );
      break;
    }
  }
  const sun = sunDirection(m);
  const k = palette.night;
  const dir = normalize([
    sun[0] + (MOON_DIR[0] - sun[0]) * k,
    sun[1] + (MOON_DIR[1] - sun[1]) * k,
    sun[2] + (MOON_DIR[2] - sun[2]) * k,
  ]);
  return { ...palette, sunDir: dir };
}

/** 상단 바용 하늘 아이콘 */
export function skyIcon(min: number): string {
  return { morning: '🌅', day: '☀️', sunset: '🌇', night: '🌙' }[phaseAt(min)];
}
