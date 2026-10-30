import { describe, expect, it } from 'vitest';
import type { WeatherNow } from '@4this/shared';
import { skyAt } from './sky';
import { dropCount, gloom, groundTint, snowCover, withWeather } from './weatherSky';

const now = (kind: WeatherNow['kind'], intensity = 0.5): WeatherNow => ({
  kind,
  intensity,
  precipitation: 1,
  temperature: 10,
  code: 0,
});

describe('withWeather', () => {
  const noon = skyAt(12 * 60);

  it('맑으면 하늘을 바꾸지 않는다', () => {
    expect(withWeather(noon, now('clear', 0))).toEqual(noon);
    expect(withWeather(noon, null)).toEqual(noon);
  });

  it('흐림·비·눈은 해를 약하게 하고 하늘을 회색빛으로', () => {
    const cloudy = withWeather(noon, now('cloudy', 0));
    const rain = withWeather(noon, now('rain', 1));
    expect(cloudy.sunIntensity).toBeLessThan(noon.sunIntensity);
    expect(rain.sunIntensity).toBeLessThan(cloudy.sunIntensity);
    expect(rain.background).not.toBe(noon.background);
    // 창문 불빛·가로등(night)은 시각만 따른다
    expect(rain.night).toBe(noon.night);
  });

  it('흐림 정도는 비가 셀수록 크다', () => {
    expect(gloom(now('clear', 0))).toBe(0);
    expect(gloom(now('rain', 1))).toBeGreaterThan(gloom(now('rain', 0.2)));
  });
});

describe('파티클·바닥', () => {
  it('비·눈 양은 세기에 비례하고 맑으면 0', () => {
    expect(dropCount(now('clear', 0))).toBe(0);
    expect(dropCount(now('rain', 1))).toBeGreaterThan(dropCount(now('rain', 0.2)));
    expect(dropCount(now('snow', 1))).toBeGreaterThan(0);
  });

  it('눈이 오면 땅이 하얘지고, 비가 오면 살짝 어두워진다', () => {
    expect(snowCover(now('snow', 1))).toBeGreaterThan(0.5);
    expect(snowCover(now('rain', 1))).toBe(0);
    expect(groundTint('#bfe6b4', now('clear', 0))).toBe('#bfe6b4');
    expect(groundTint('#bfe6b4', now('rain', 1))).not.toBe('#bfe6b4');
    expect(groundTint('#bfe6b4', now('snow', 1))).not.toBe('#bfe6b4');
  });
});
