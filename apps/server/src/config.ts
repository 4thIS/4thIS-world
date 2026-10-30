import { DEFAULT_WEATHER_COORDS, type WeatherCoords } from './weather';

/** 서버 설정. 모든 값은 환경변수에서 읽는다 (팀 공통 결정 참고) */
export interface Config {
  port: number;
  /** SQLite 파일 경로. ':memory:'면 메모리 DB */
  dbPath: string;
  adminPassword: string;
  sessionSecret: string;
  /** 웹 빌드 폴더. null이면 정적 서빙을 하지 않는다 (wj#4) */
  webDist: string | null;
  /** NODE_ENV=production이면 쿠키에 secure를 붙인다 */
  production: boolean;
  /** 리버스 프록시 뒤에서 X-Forwarded-For로 IP를 읽을지 (TRUST_PROXY=1) */
  trustProxy: boolean;
  /** 실시간 날씨 좌표. null이면 날씨를 받지 않고 늘 맑음 (WEATHER=off, 테스트) */
  weather: WeatherCoords | null;
}

type Env = Record<string, string | undefined>;

function required(env: Env, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} 환경변수가 필요합니다. .env.example을 참고해 설정하세요.`);
  }
  return value;
}

/** WEATHER_LAT·WEATHER_LON (기본: 명지전문대학). WEATHER=off나 NODE_ENV=test면 끈다 */
function weatherCoords(env: Env): WeatherCoords | null {
  if (env.WEATHER === 'off' || env.NODE_ENV === 'test') return null;
  const lat = Number(env.WEATHER_LAT ?? DEFAULT_WEATHER_COORDS.lat);
  const lon = Number(env.WEATHER_LON ?? DEFAULT_WEATHER_COORDS.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    throw new Error(
      `WEATHER_LAT·WEATHER_LON 값이 올바르지 않습니다: ${env.WEATHER_LAT}, ${env.WEATHER_LON}`,
    );
  }
  return { lat, lon };
}

export function loadConfig(env: Env = process.env): Config {
  const adminPassword = required(env, 'ADMIN_PASSWORD');
  const sessionSecret = required(env, 'SESSION_SECRET');
  const port = Number(env.PORT ?? 8080);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT 값이 올바르지 않습니다: ${env.PORT}`);
  }
  return {
    port,
    dbPath: env.DB_PATH?.trim() || './data/world.db',
    adminPassword,
    sessionSecret,
    webDist: env.WEB_DIST?.trim() || null,
    production: env.NODE_ENV === 'production',
    trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
    weather: weatherCoords(env),
  };
}
