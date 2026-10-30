import { z } from 'zod';

/**
 * 실시간 날씨 (Open-Meteo, 학교 좌표). 서버가 10분마다 받아 두고 GET /api/weather로 준다.
 * 모든 브라우저가 같은 값을 받으므로 placement에 써도 결과가 같다.
 */

export const WEATHER_KINDS = ['clear', 'cloudy', 'rain', 'snow'] as const;
export type WeatherKind = (typeof WEATHER_KINDS)[number];

/** 비·눈이 오는 시간 (오늘 0~23시 각 시간) */
export const WET_KINDS = ['rain', 'snow'] as const;
export type WetKind = (typeof WET_KINDS)[number];

export const WeatherNowSchema = z.object({
  kind: z.enum(WEATHER_KINDS),
  /** 0~1. 비·눈의 세기 (파티클 양) */
  intensity: z.number().min(0).max(1),
  /** 지난 1시간 강수량 (mm) */
  precipitation: z.number(),
  /** 기온 (°C). 모르면 null */
  temperature: z.number().nullable(),
  /** WMO 날씨 코드 */
  code: z.number().int(),
});
export type WeatherNow = z.infer<typeof WeatherNowSchema>;

export const WeatherResponseSchema = z.object({
  now: WeatherNowSchema,
  /** 오늘(KST) 0~23시. 비·눈이 오면 그 종류, 아니면 null */
  hours: z.array(z.enum(WET_KINDS).nullable()).length(24),
  /** 마지막으로 받은 시각 (epoch ms). 한 번도 못 받았으면 null */
  updatedAt: z.number().nullable(),
});
export type WeatherResponse = z.infer<typeof WeatherResponseSchema>;

/** 날씨를 못 받았을 때 */
export const CLEAR_WEATHER: WeatherResponse = {
  now: { kind: 'clear', intensity: 0, precipitation: 0, temperature: null, code: 0 },
  hours: Array.from({ length: 24 }, () => null),
  updatedAt: null,
};

/** WMO 날씨 코드 + 강수량(mm) → 날씨 종류 */
export function weatherKindOf(code: number, precipitation: number): WeatherKind {
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain';
  if (precipitation > 0) return 'rain';
  if (code <= 1) return 'clear';
  return 'cloudy';
}

/** 비·눈 세기 0.2~1 (비는 4 mm/h, 눈은 2 mm/h에서 최대). 맑음·흐림은 0 */
export function intensityOf(kind: WeatherKind, precipitation: number): number {
  const full = kind === 'rain' ? 4 : kind === 'snow' ? 2 : 0;
  if (full === 0) return 0;
  return Math.min(1, Math.max(0.2, precipitation / full));
}

/** placement 입력: 오늘 각 시간에 비·눈이 오나 */
export function wetHoursOf(w: Pick<WeatherResponse, 'hours'>): boolean[] {
  return w.hours.map((h) => h !== null);
}

/** 관리자가 고르는 날씨: auto면 실제 날씨(Open-Meteo), 아니면 그 날씨로 고정 */
export const WEATHER_MODES = ['auto', ...WEATHER_KINDS] as const;
export type WeatherMode = (typeof WEATHER_MODES)[number];

/** 그 날씨로 하루 종일 고정한 응답 (비·눈이면 모든 시간이 젖은 날) */
export function fixedWeather(kind: WeatherKind): WeatherResponse {
  const wet = kind === 'rain' || kind === 'snow' ? kind : null;
  return {
    now: {
      kind,
      intensity: wet ? 0.7 : 0,
      precipitation: wet ? 2.5 : 0,
      temperature: kind === 'snow' ? -2 : 12,
      code: 0,
    },
    hours: CLEAR_WEATHER.hours.map(() => wet),
    updatedAt: null,
  };
}
