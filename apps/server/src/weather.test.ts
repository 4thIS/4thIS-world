import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { API, CLEAR_WEATHER, WeatherResponseSchema } from '@4this/shared';
import { makeTestApp, type TestApp } from './testing';
import { WeatherService, openMeteoUrl, parseOpenMeteo } from './weather';

const NOW = Date.parse('2026-10-29T15:20:00+09:00');

/** Open-Meteo 응답 모양 (오늘 24시간) */
function openMeteo({ code = 61, precipitation = 2, rainHours = [15, 16] } = {}) {
  return {
    current: { time: '2026-10-29T15:15', weather_code: code, precipitation, temperature_2m: 12.4 },
    hourly: {
      time: Array.from({ length: 24 }, (_, h) => `2026-10-29T${String(h).padStart(2, '0')}:00`),
      weather_code: Array.from({ length: 24 }, (_, h) => (rainHours.includes(h) ? 61 : 3)),
      precipitation: Array.from({ length: 24 }, (_, h) => (rainHours.includes(h) ? 1.5 : 0)),
    },
  };
}

describe('parseOpenMeteo', () => {
  it('지금 날씨와 오늘 시간별 비·눈을 뽑는다', () => {
    const w = parseOpenMeteo(openMeteo(), NOW);
    expect(w.now).toEqual({
      kind: 'rain',
      intensity: 0.5,
      precipitation: 2,
      temperature: 12.4,
      code: 61,
    });
    expect(w.hours[15]).toBe('rain');
    expect(w.hours[14]).toBeNull();
    expect(w.updatedAt).toBe(NOW);
    expect(WeatherResponseSchema.safeParse(w).success).toBe(true);
  });

  it('모양이 이상하면 던진다', () => {
    expect(() => parseOpenMeteo({ nope: true }, NOW)).toThrow();
  });

  it('학교 좌표로 요청한다', () => {
    const url = openMeteoUrl({ lat: 37.5844, lon: 126.9251 });
    expect(url).toContain('latitude=37.5844');
    expect(url).toContain('longitude=126.9251');
    expect(url).toContain('timezone=Asia%2FSeoul');
  });
});

describe('WeatherService', () => {
  const coords = { lat: 37.5844, lon: 126.9251 };

  it('받으면 저장하고, 바뀌었을 때만 알린다', async () => {
    const fetchJson = vi.fn().mockResolvedValue(openMeteo());
    const changed = vi.fn();
    const s = new WeatherService(coords, { fetchJson, now: () => NOW, onChange: changed });
    expect(s.get()).toEqual(CLEAR_WEATHER);
    await s.refresh();
    expect(s.get().now.kind).toBe('rain');
    expect(changed).toHaveBeenCalledTimes(1);
    await s.refresh();
    expect(changed).toHaveBeenCalledTimes(1);
    fetchJson.mockResolvedValue(openMeteo({ code: 0, precipitation: 0, rainHours: [] }));
    await s.refresh();
    expect(s.get().now.kind).toBe('clear');
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it('실패하면 마지막 값을 유지한다', async () => {
    const fetchJson = vi.fn().mockResolvedValueOnce(openMeteo()).mockRejectedValue(new Error('x'));
    const s = new WeatherService(coords, { fetchJson, now: () => NOW });
    await s.refresh();
    await s.refresh();
    expect(s.get().now.kind).toBe('rain');
  });
});

describe('GET /api/weather', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(() => t.close());

  it('날씨를 끄면(테스트) 맑음을 준다', async () => {
    const res = await t.app.inject({ method: 'GET', url: API.weather });
    expect(res.statusCode).toBe(200);
    expect(WeatherResponseSchema.parse(res.json())).toEqual(CLEAR_WEATHER);
  });
});
