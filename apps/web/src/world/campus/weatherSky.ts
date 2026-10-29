import type { WeatherNow } from '@4this/shared';
import { mixHex } from './pastel';
import type { Sky } from './sky';

/**
 * 날씨를 하늘·조명·바닥에 입힌다 (순수 함수). 시각에 따른 하늘(sky.ts) 위에 회색빛을 섞는다.
 * 창문 불빛·가로등 세기(night)는 시각만 따른다.
 */

/** 0(맑음) ~ 1(아주 흐림): 하늘을 얼마나 회색으로 섞을지 */
export function gloom(w: WeatherNow | null): number {
  if (!w) return 0;
  switch (w.kind) {
    case 'clear':
      return 0;
    case 'cloudy':
      return 0.35;
    case 'rain':
      return 0.45 + w.intensity * 0.3;
    case 'snow':
      return 0.3 + w.intensity * 0.2;
  }
}

/** 낮에는 밝은 회색, 밤에는 어두운 남회색 쪽으로 */
const GRAY_DAY = '#b9bfcc';
const GRAY_NIGHT = '#252942';

export function withWeather(sky: Sky, w: WeatherNow | null): Sky {
  const g = gloom(w);
  if (g === 0) return sky;
  const gray = mixHex(GRAY_DAY, GRAY_NIGHT, sky.night);
  return {
    ...sky,
    background: mixHex(sky.background, gray, g),
    fog: mixHex(sky.fog, gray, g),
    sunColor: mixHex(sky.sunColor, '#ffffff', g * 0.5),
    sunIntensity: sky.sunIntensity * (1 - g * 0.6),
    hemiSky: mixHex(sky.hemiSky, gray, g * 0.7),
    hemiIntensity: sky.hemiIntensity * (1 - g * 0.15),
  };
}

/** 최대 파티클 수 (비, 눈) */
export const MAX_RAIN = 1400;
export const MAX_SNOW = 800;

/** 지금 내릴 빗방울·눈송이 수 */
export function dropCount(w: WeatherNow | null): number {
  if (!w) return 0;
  if (w.kind === 'rain') return Math.round(MAX_RAIN * w.intensity);
  if (w.kind === 'snow') return Math.round(MAX_SNOW * w.intensity);
  return 0;
}

/** 0~1: 땅·지붕에 눈이 덮인 정도 */
export function snowCover(w: WeatherNow | null): number {
  return w?.kind === 'snow' ? 0.4 + w.intensity * 0.5 : 0;
}

/** 잔디 색: 비가 오면 살짝 어둡게, 눈이 오면 하얗게 */
export function groundTint(base: string, w: WeatherNow | null): string {
  if (w?.kind === 'rain') return mixHex(base, '#7fa07c', 0.25 + w.intensity * 0.2);
  const s = snowCover(w);
  return s > 0 ? mixHex(base, '#f6f8fc', s) : base;
}

/** 상단 바 아이콘: 맑으면 시각 아이콘 그대로 */
export function weatherIcon(w: WeatherNow | null, skyIcon: string): string {
  switch (w?.kind) {
    case 'rain':
      return '🌧️';
    case 'snow':
      return '❄️';
    case 'cloudy':
      return '☁️';
    default:
      return skyIcon;
  }
}

const KIND_LABEL: Record<WeatherNow['kind'], string> = {
  clear: '맑음',
  cloudy: '흐림',
  rain: '비',
  snow: '눈',
};

/** 마우스를 올리면 보이는 설명: '서대문구 · 비 2.1mm · 12°C' */
export function weatherLabel(w: WeatherNow | null): string {
  if (!w) return '날씨 정보 없음';
  const parts = ['서대문구', KIND_LABEL[w.kind]];
  if (w.kind === 'rain' || w.kind === 'snow') parts[1] += ` ${w.precipitation.toFixed(1)}mm`;
  if (w.temperature !== null) parts.push(`${Math.round(w.temperature)}°C`);
  return parts.join(' · ');
}
