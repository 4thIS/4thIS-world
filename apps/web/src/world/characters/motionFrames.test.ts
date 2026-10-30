import { describe, expect, it } from 'vitest';
import { MOTIONS, MOTION_DURATION_MS } from '@4this/shared';
import { motionFrame } from './motionFrames';
import { poseFrame } from './poses';

const stand = poseFrame('stand', 1, 0);
const sit = poseFrame('sitType', 1, 0);

describe('motionFrame', () => {
  it('모든 모션이 유한한 값을 낸다 (서 있을 때·앉았을 때)', () => {
    for (const kind of MOTIONS) {
      for (const base of [stand, sit]) {
        for (const ms of [0, 300, 1200, 2400]) {
          const f = motionFrame(base, kind, ms)!;
          const values = [
            f.bodyY,
            f.bodyPitch,
            f.bodyRoll,
            f.bodyYaw ?? 0,
            f.headPitch,
            ...f.arms.flatMap((a) => [a.swing, a.spread]),
            ...f.feet.flatMap((p) => [p.y, p.z]),
          ];
          expect(values.every(Number.isFinite)).toBe(true);
        }
      }
    }
  });

  it('한 번 하는 모션은 끝나면 null (원래 자세로)', () => {
    expect(motionFrame(stand, 'wave', MOTION_DURATION_MS)).toBeNull();
    expect(motionFrame(stand, 'wave', 1000)).not.toBeNull();
  });

  it('눕기는 끝나지 않고 바닥에 등을 대고 눕는다', () => {
    const f = motionFrame(stand, 'lie', 60_000)!;
    expect(f.bodyPitch).toBeCloseTo(-Math.PI / 2, 1);
    expect(f.bodyY).toBeLessThan(0.6);
  });

  it('만세는 두 팔을 번쩍, 손 흔들기는 한 팔만 든다', () => {
    const cheer = motionFrame(stand, 'cheer', 1000)!;
    expect(cheer.arms[0].swing).toBeLessThan(-2.5);
    expect(cheer.arms[1].swing).toBeLessThan(-2.5);
    const wave = motionFrame(stand, 'wave', 1000)!;
    expect(wave.arms[1].swing).toBeLessThan(-2);
    expect(wave.arms[0].swing).toBeGreaterThan(-1);
  });

  it('춤은 빙글 돌고, 점프는 높이 뛰고, 인사는 숙인다', () => {
    expect(Math.abs(motionFrame(stand, 'dance', 1000)!.bodyYaw ?? 0)).toBeGreaterThan(0.5);
    const heights = [400, 600, 800].map((ms) => motionFrame(stand, 'jump', ms)!.bodyY);
    expect(Math.max(...heights)).toBeGreaterThan(0.4);
    expect(motionFrame(stand, 'bow', 1300)!.bodyPitch).toBeGreaterThan(0.4);
  });

  it('앉아 있다가 춤·점프·인사를 하면 일어선다', () => {
    expect(motionFrame(sit, 'dance', 1000)!.bodyY).toBeLessThan(sit.bodyY - 0.2);
  });
});
