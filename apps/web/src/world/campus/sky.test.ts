import { describe, expect, it } from 'vitest';
import { mixHex } from './pastel';
import { mixPalette, phaseAt, skyAt, skyIcon, SKY_PALETTES, sunDirection } from './sky';

const hm = (h: number, m = 0) => h * 60 + m;

describe('phaseAt', () => {
  it('06–09 아침, 09–17 낮, 17–19 노을, 19–06 밤', () => {
    expect(phaseAt(hm(7))).toBe('morning');
    expect(phaseAt(hm(12))).toBe('day');
    expect(phaseAt(hm(18))).toBe('sunset');
    expect(phaseAt(hm(23, 59))).toBe('night');
    expect(phaseAt(hm(3))).toBe('night');
  });
});

describe('skyAt', () => {
  it('구간 한가운데는 그 구간 색 그대로', () => {
    expect(skyAt(hm(12)).background).toBe(SKY_PALETTES.day.background);
    expect(skyAt(hm(7, 30)).background).toBe(SKY_PALETTES.morning.background);
    expect(skyAt(hm(18)).background).toBe(SKY_PALETTES.sunset.background);
    expect(skyAt(hm(3)).background).toBe(SKY_PALETTES.night.background);
  });

  it('경계 시각에는 앞뒤 구간을 반반 섞는다', () => {
    const s = skyAt(hm(9));
    expect(s.background).toBe(
      mixHex(SKY_PALETTES.morning.background, SKY_PALETTES.day.background, 0.5),
    );
    expect(s.sunIntensity).toBeCloseTo((1.7 + 2.1) / 2);
  });

  it('경계 앞뒤 15분(모두 30분)에 걸쳐 섞는다', () => {
    expect(skyAt(hm(18, 44)).night).toBe(0);
    expect(skyAt(hm(18, 50)).night).toBeCloseTo(1 / 6);
    expect(skyAt(hm(19, 15)).night).toBe(1);
    expect(skyAt(hm(5, 50)).night).toBeCloseTo(5 / 6);
    expect(skyAt(hm(6, 15)).night).toBe(0);
  });

  it('하루를 넘는 값도 0~24시로 감는다', () => {
    expect(skyAt(hm(36))).toEqual(skyAt(hm(12)));
    expect(skyAt(-60)).toEqual(skyAt(hm(23)));
  });

  it('빛은 항상 위에서 온다', () => {
    for (let m = 0; m < 1440; m += 10) expect(skyAt(m).sunDir[1]).toBeGreaterThan(0.2);
  });
});

describe('sunDirection', () => {
  it('아침에는 동쪽, 저녁에는 서쪽, 정오 무렵이 가장 높다', () => {
    expect(sunDirection(hm(7))[0]).toBeGreaterThan(0);
    expect(sunDirection(hm(18))[0]).toBeLessThan(0);
    expect(sunDirection(hm(12, 30))[1]).toBeGreaterThan(sunDirection(hm(7))[1]);
  });
});

describe('mixPalette / skyIcon', () => {
  it('t=0은 a, t=1은 b', () => {
    expect(mixPalette(SKY_PALETTES.day, SKY_PALETTES.night, 0)).toEqual(SKY_PALETTES.day);
    expect(mixPalette(SKY_PALETTES.day, SKY_PALETTES.night, 1)).toEqual(SKY_PALETTES.night);
  });

  it('구간별 아이콘', () => {
    expect([hm(7), hm(12), hm(18), hm(22)].map(skyIcon)).toEqual(['🌅', '☀️', '🌇', '🌙']);
  });
});
