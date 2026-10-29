import {
  CLEAR_WEATHER,
  intensityOf,
  weatherKindOf,
  type WeatherResponse,
  type WetKind,
} from '@4this/shared';

/** 날씨를 받아 올 좌표 (기본: 명지전문대학, 서울 서대문구 가좌로 134) */
export interface WeatherCoords {
  lat: number;
  lon: number;
}

export const DEFAULT_WEATHER_COORDS: WeatherCoords = { lat: 37.5844, lon: 126.9251 };

/** 10분마다 받는다 (Open-Meteo 현재 값은 15분 간격) */
export const WEATHER_REFRESH_MS = 10 * 60_000;

/** Open-Meteo: 지금 날씨 + 오늘(KST) 시간별 날씨. 키가 필요 없다 */
export function openMeteoUrl({ lat, lon }: WeatherCoords): string {
  const q = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: 'weather_code,precipitation,temperature_2m',
    hourly: 'weather_code,precipitation',
    timezone: 'Asia/Seoul',
    forecast_days: '1',
  });
  return `https://api.open-meteo.com/v1/forecast?${q}`;
}

interface OpenMeteo {
  current: { weather_code: number; precipitation: number; temperature_2m?: number | null };
  hourly: { weather_code: (number | null)[]; precipitation: (number | null)[] };
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** 쓰는 칸만 확인한다 (서버에는 zod가 없어 직접 본다) */
function asOpenMeteo(json: unknown): OpenMeteo {
  const j = json as Partial<OpenMeteo> | null;
  const c = j?.current;
  const h = j?.hourly;
  if (
    !c ||
    !h ||
    !isNum(c.weather_code) ||
    !isNum(c.precipitation) ||
    !Array.isArray(h.weather_code) ||
    !Array.isArray(h.precipitation)
  ) {
    throw new Error('Open-Meteo 응답 모양이 다릅니다');
  }
  return j as OpenMeteo;
}

/** Open-Meteo 응답 → WeatherResponse. 모양이 다르면 던진다 */
export function parseOpenMeteo(json: unknown, now: number): WeatherResponse {
  const { current, hourly } = asOpenMeteo(json);
  const kind = weatherKindOf(current.weather_code, current.precipitation);
  const hours = Array.from({ length: 24 }, (_, h): WetKind | null => {
    const k = weatherKindOf(hourly.weather_code[h] ?? 0, hourly.precipitation[h] ?? 0);
    return k === 'rain' || k === 'snow' ? k : null;
  });
  return {
    now: {
      kind,
      intensity: intensityOf(kind, current.precipitation),
      precipitation: current.precipitation,
      temperature: current.temperature_2m ?? null,
      code: current.weather_code,
    },
    hours,
    updatedAt: now,
  };
}

interface WeatherServiceOptions {
  fetchJson?: (url: string) => Promise<unknown>;
  now?: () => number;
  /** 지금 날씨나 시간별 비·눈이 바뀌었을 때 */
  onChange?: () => void;
}

async function defaultFetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Open-Meteo ${res.status}`);
  return res.json();
}

/** 마지막으로 받은 날씨를 들고 있다가 GET /api/weather에 준다. 실패하면 이전 값을 유지한다 */
export class WeatherService {
  private value: WeatherResponse = CLEAR_WEATHER;
  private timer: NodeJS.Timeout | null = null;
  private readonly fetchJson: (url: string) => Promise<unknown>;
  private readonly now: () => number;
  private readonly onChange: () => void;

  constructor(
    private readonly coords: WeatherCoords,
    opts: WeatherServiceOptions = {},
  ) {
    this.fetchJson = opts.fetchJson ?? defaultFetchJson;
    this.now = opts.now ?? Date.now;
    this.onChange = opts.onChange ?? (() => {});
  }

  get(): WeatherResponse {
    return this.value;
  }

  async refresh(): Promise<void> {
    try {
      const next = parseOpenMeteo(await this.fetchJson(openMeteoUrl(this.coords)), this.now());
      const changed =
        JSON.stringify([next.now, next.hours]) !==
        JSON.stringify([this.value.now, this.value.hours]);
      this.value = next;
      if (changed) this.onChange();
    } catch {
      // 네트워크·응답 문제: 이전 값을 그대로 쓴다 (날씨 때문에 사이트가 멈추지 않게)
    }
  }

  /** 바로 한 번 받고, 그 뒤 interval마다 받는다 */
  start(interval = WEATHER_REFRESH_MS): void {
    void this.refresh();
    this.timer ??= setInterval(() => void this.refresh(), interval);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
