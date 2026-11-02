import type { WeatherNow } from '@4this/shared';

/** 계속 깔리는 환경 소리의 섞는 양. 0~1 (새·귀뚜라미는 켜짐/꺼짐) */
export interface AmbientMix {
  rain: number;
  wind: number;
  birds: boolean;
  crickets: boolean;
}

export const SILENT: AmbientMix = { rain: 0, wind: 0, birds: false, crickets: false };

/**
 * 날씨와 시각(KST 시, 0~24) → 환경 소리.
 * 비: 빗소리(세기 따라) · 눈: 낮은 바람 · 낮(7~18시) 새소리 · 밤(20~5시) 귀뚜라미. 비·눈이 오면 새·벌레는 쉰다
 */
export function ambientMix(weather: WeatherNow | null, hour: number): AmbientMix {
  const kind = weather?.kind ?? 'clear';
  const wet = kind === 'rain' || kind === 'snow';
  return {
    rain: kind === 'rain' ? 0.35 + 0.65 * Math.min(1, weather?.intensity ?? 0.5) : 0,
    wind: kind === 'snow' ? 0.6 : 0,
    birds: !wet && hour >= 7 && hour < 18,
    crickets: !wet && (hour >= 20 || hour < 5),
  };
}

/** 다음 새소리까지 (초): 3~9초 사이 */
export function nextChirpIn(random: () => number = Math.random): number {
  return 3 + random() * 6;
}
