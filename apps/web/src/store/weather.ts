import { create } from 'zustand';
import {
  WEATHER_KINDS,
  fixedWeather,
  wetHoursOf,
  type WeatherKind,
  type WeatherNow,
  type WeatherResponse,
} from '@4this/shared';
import { api } from '../api/endpoints';
import { useWorld } from './world';

/**
 * 실시간 날씨. 서버(GET /api/weather)가 10분마다 받아 둔 값을 쓰고,
 * 소켓 weather:changed가 오면 다시 받는다. ?weather=rain 같은 주소면 내 화면에서만 덮어쓴다(시연용).
 */
interface WeatherState {
  /** 지금 날씨. 아직 못 받았으면 null (맑음처럼 그린다) */
  now: WeatherNow | null;
  /** 시연용 덮어쓰기 (?weather=) */
  override: WeatherResponse | null;
  load: () => Promise<void>;
}

/** ?weather=rain|snow|cloudy|clear → 그 날씨로 고정한 응답. 비·눈이면 하루 종일 젖은 날 */
export function overrideFromSearch(search: string): WeatherResponse | null {
  const kind = new URLSearchParams(search).get('weather');
  if (!kind || !(WEATHER_KINDS as readonly string[]).includes(kind)) return null;
  return fixedWeather(kind as WeatherKind);
}

function apply(set: (s: Partial<WeatherState>) => void, w: WeatherResponse) {
  set({ now: w.now });
  useWorld.getState().setWetHours(wetHoursOf(w));
}

export const useWeather = create<WeatherState>()((set, get) => ({
  now: null,
  override: typeof window === 'undefined' ? null : overrideFromSearch(window.location.search),
  load: async () => {
    const { override } = get();
    if (override) {
      apply(set, override);
      return;
    }
    try {
      apply(set, await api.weather());
    } catch {
      // 날씨를 못 받아도 월드는 그대로 (맑음)
    }
  },
}));
