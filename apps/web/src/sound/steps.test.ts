import { describe, expect, it } from 'vitest';
import { CAMPUS, FLOOR_HEIGHT } from '@4this/shared';
import { ambientMix, nextChirpIn } from './ambient';
import { STRIDE, nearest, stepFileUrls, stepTick, surfaceAt } from './steps';

describe('발소리', () => {
  it('바닥: 광장은 길, 판 구석은 잔디, 건물 안은 실내, 층 사이 높이는 계단', () => {
    expect(surfaceAt(0, 0, 3)).toBe('path');
    expect(surfaceAt(-23, 0, -23)).toBe('grass');
    const b = Object.values(CAMPUS.buildings)[0]!;
    const cx = (b.min[0] + b.max[0]) / 2;
    const cz = (b.min[1] + b.max[1]) / 2;
    expect(surfaceAt(cx, 0, cz)).toBe('indoor');
    expect(surfaceAt(cx, FLOOR_HEIGHT, cz)).toBe('indoor');
    expect(surfaceAt(cx, FLOOR_HEIGHT / 2, cz)).toBe('stairs');
  });

  it('보폭만큼 걸을 때마다 한 걸음, 순간이동은 빼고', () => {
    let carry = 0;
    let steps = 0;
    for (let i = 0; i < 100; i++) {
      const r = stepTick(carry, 0.05);
      carry = r.carry;
      if (r.step) steps++;
    }
    expect(steps).toBe(Math.floor(5 / STRIDE));
    expect(stepTick(0.5, 3)).toEqual({ carry: 0, step: false });
  });

  it('카메라에서 가까운 순으로 n명', () => {
    const members = [
      { id: 'far', x: 30, y: 0, z: 0 },
      { id: 'near', x: 1, y: 0, z: 0 },
      { id: 'mid', x: 10, y: 0, z: 0 },
    ];
    expect(nearest(members, { x: 0, y: 0, z: 0 }, 2)).toEqual(['near', 'mid']);
  });

  it('Kenney 파일 이름: 바닥 3종 × 5개', () => {
    const urls = stepFileUrls();
    expect(urls).toHaveLength(15);
    expect(urls).toContain('/sound/steps/footstep_grass_004.ogg');
  });
});

describe('환경 소리', () => {
  const w = (kind: 'clear' | 'rain' | 'snow' | 'cloudy', intensity = 0.5) => ({
    kind,
    intensity,
    precipitation: 0,
    temperature: 10,
    code: 0,
  });

  it('낮엔 새소리, 밤엔 귀뚜라미, 그 사이는 조용', () => {
    expect(ambientMix(w('clear'), 10)).toEqual({ rain: 0, wind: 0, birds: true, crickets: false });
    expect(ambientMix(w('cloudy'), 22).crickets).toBe(true);
    expect(ambientMix(w('clear'), 19)).toEqual({ rain: 0, wind: 0, birds: false, crickets: false });
    expect(ambientMix(null, 3).crickets).toBe(true);
  });

  it('비는 세기에 따라 빗소리, 눈은 바람. 비·눈이면 새·벌레는 쉰다', () => {
    const light = ambientMix(w('rain', 0.2), 10);
    const heavy = ambientMix(w('rain', 1), 10);
    expect(heavy.rain).toBeGreaterThan(light.rain);
    expect(light.birds).toBe(false);
    expect(ambientMix(w('snow'), 22)).toEqual({
      rain: 0,
      wind: 0.6,
      birds: false,
      crickets: false,
    });
  });

  it('새소리 간격은 3~9초', () => {
    expect(nextChirpIn(() => 0)).toBe(3);
    expect(nextChirpIn(() => 0.999)).toBeLessThan(9);
  });
});
