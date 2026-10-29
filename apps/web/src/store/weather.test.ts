import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLEAR_WEATHER, type WeatherResponse } from '@4this/shared';
import { overrideFromSearch, useWeather } from './weather';
import { useWorld } from './world';

const RAINY: WeatherResponse = {
  now: { kind: 'rain', intensity: 0.5, precipitation: 2, temperature: 12, code: 61 },
  hours: CLEAR_WEATHER.hours.map((_, h) => (h === 15 ? 'rain' : null)),
  updatedAt: 1,
};

beforeEach(() => {
  useWeather.setState(useWeather.getInitialState(), true);
  useWorld.setState(useWorld.getInitialState(), true);
});
afterEach(() => vi.unstubAllGlobals());

describe('overrideFromSearch (?weather=)', () => {
  it('rain·snow·cloudy·clear만 받고, 비·눈이면 하루 종일 젖은 날로 만든다', () => {
    const rain = overrideFromSearch('?weather=rain')!;
    expect(rain.now).toMatchObject({ kind: 'rain', intensity: 0.7 });
    expect(rain.hours.every((h) => h === 'rain')).toBe(true);
    expect(overrideFromSearch('?weather=cloudy')!.hours.every((h) => h === null)).toBe(true);
    expect(overrideFromSearch('?weather=tornado')).toBeNull();
    expect(overrideFromSearch('')).toBeNull();
  });
});

describe('useWeather', () => {
  it('GET /api/weather를 받아 지금 날씨를 담고, 월드에 젖은 시간을 넘긴다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(RAINY))));
    await useWeather.getState().load();
    expect(useWeather.getState().now?.kind).toBe('rain');
    const wet = useWorld.getState().wetHours;
    expect(wet[15]).toBe(true);
    expect(wet.filter(Boolean)).toHaveLength(1);
  });

  it('시연용 덮어쓰기가 있으면 서버 값 대신 쓴다', async () => {
    useWeather.setState({ override: overrideFromSearch('?weather=snow') });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(RAINY))));
    await useWeather.getState().load();
    expect(useWeather.getState().now?.kind).toBe('snow');
    expect(useWorld.getState().wetHours.every(Boolean)).toBe(true);
  });

  it('실패하면 그대로 둔다 (맑음)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('x')));
    await useWeather.getState().load();
    expect(useWeather.getState().now).toBeNull();
  });
});

describe('useWorld.setWetHours', () => {
  it('바뀌면 계획을 다시 만들게 하고, 같으면 그대로 둔다', () => {
    useWorld.getState().setWorld({ serverTime: Date.now(), members: [] });
    const plan = useWorld.getState().plan;
    useWorld.getState().setWetHours(Array.from({ length: 24 }, () => false));
    expect(useWorld.getState().plan).toBe(plan);
    useWorld.getState().setWetHours(Array.from({ length: 24 }, (_, h) => h === 3));
    expect(useWorld.getState().plan).toBeNull();
  });
});
