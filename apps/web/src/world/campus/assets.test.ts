import { describe, expect, it } from 'vitest';
import { MODELS, SEAT_HEIGHT, type ModelSpec } from './assets';

describe('MODELS', () => {
  it('앉는 모델(벤치·의자)은 앉는 면이 SEAT_HEIGHT(0.45 m)에 온다', () => {
    const seats = Object.entries(MODELS as Record<string, ModelSpec>).filter(([, m]) => m.seatRaw);
    expect(seats.length).toBeGreaterThan(0);
    for (const [, m] of seats) expect(m.seatRaw! * m.scale).toBeCloseTo(SEAT_HEIGHT);
  });

  it('파일 경로는 /assets/kaykit 또는 /assets/kenney 아래에 있다', () => {
    for (const m of Object.values(MODELS as Record<string, ModelSpec>)) {
      expect(m.url).toMatch(/^\/assets\/(kaykit\/[\w]+\.gltf|kenney\/[\w]+\.glb)$/);
    }
  });
});
