import { describe, expect, it } from 'vitest';
import {
  CLEAR_WEATHER,
  WeatherResponseSchema,
  intensityOf,
  weatherKindOf,
  wetHoursOf,
} from './weather';

describe('weatherKindOf (WMO 날씨 코드)', () => {
  it('맑음·흐림·비·눈을 가른다', () => {
    expect(weatherKindOf(0, 0)).toBe('clear');
    expect(weatherKindOf(1, 0)).toBe('clear');
    expect(weatherKindOf(3, 0)).toBe('cloudy');
    expect(weatherKindOf(45, 0)).toBe('cloudy');
    expect(weatherKindOf(61, 1.2)).toBe('rain');
    expect(weatherKindOf(81, 3)).toBe('rain');
    expect(weatherKindOf(95, 5)).toBe('rain');
    expect(weatherKindOf(73, 0.8)).toBe('snow');
    expect(weatherKindOf(85, 0.5)).toBe('snow');
  });

  it('코드는 맑음·흐림인데 강수량이 있으면 비로 본다', () => {
    expect(weatherKindOf(2, 0.4)).toBe('rain');
  });
});

describe('intensityOf', () => {
  it('비·눈은 강수량에 따라 0.2~1, 나머지는 0', () => {
    expect(intensityOf('rain', 0.1)).toBeCloseTo(0.2);
    expect(intensityOf('rain', 2)).toBeCloseTo(0.5);
    expect(intensityOf('rain', 20)).toBe(1);
    expect(intensityOf('snow', 1)).toBeCloseTo(0.5);
    expect(intensityOf('cloudy', 3)).toBe(0);
  });
});

describe('WeatherResponse', () => {
  it('맑음 기본값이 스키마를 통과하고, 젖은 시간은 비·눈인 시간', () => {
    expect(WeatherResponseSchema.parse(CLEAR_WEATHER)).toEqual(CLEAR_WEATHER);
    expect(wetHoursOf(CLEAR_WEATHER).every((w) => !w)).toBe(true);
    const hours = CLEAR_WEATHER.hours.map((_, h) => (h === 9 ? 'rain' : h === 22 ? 'snow' : null));
    const wet = wetHoursOf({ ...CLEAR_WEATHER, hours });
    expect(wet.filter(Boolean)).toHaveLength(2);
    expect(wet[9]).toBe(true);
    expect(wet[22]).toBe(true);
  });
});
