import { describe, expect, it } from 'vitest';
import { POSE_KINDS } from '@4this/shared';
import {
  blinkScale,
  CHARACTER_SCALE,
  poseFrame,
  SEAT_HEIGHT,
  SIT_LIFT,
  SITTING_POSES,
  tailSwing,
  withStretch,
  BED_HEIGHT,
} from './poses';

describe('poseFrame', () => {
  it('모든 포즈가 유한한 값을 낸다', () => {
    for (const pose of POSE_KINDS) {
      for (const t of [0, 0.37, 5.2, 123.4]) {
        const f = poseFrame(pose, t, 1.3);
        const values = [
          f.bodyY,
          f.bodyRoll,
          f.bodyPitch,
          f.headYaw,
          f.headPitch,
          f.headRoll,
          ...f.arms.flatMap((a) => [a.swing, a.spread]),
          ...f.feet.flatMap((p) => [p.y, p.z]),
        ];
        expect(values.every(Number.isFinite)).toBe(true);
      }
    }
  });

  it('앉은 포즈는 몸통 아래가 의자 높이 근처에 온다', () => {
    expect((SIT_LIFT + 0.15) * CHARACTER_SCALE).toBeCloseTo(SEAT_HEIGHT - 0.04 * CHARACTER_SCALE);
    for (const pose of SITTING_POSES) {
      expect(poseFrame(pose, 2, 0).bodyY).toBeCloseTo(SIT_LIFT, 1);
    }
    expect(poseFrame('stand', 2, 0).bodyY).toBeLessThan(0.05);
  });

  it('걷기는 통통 튀고 두 발·두 팔이 번갈아 나간다', () => {
    const heights = [0, 0.1, 0.2, 0.3].map((t) => poseFrame('walk', t, 0).bodyY);
    expect(Math.max(...heights)).toBeGreaterThan(0.05);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(0);
    const f = poseFrame('walk', 0.2, 0);
    expect(Math.sign(f.feet[0].z - 0.08)).toBe(-Math.sign(f.feet[1].z - 0.08));
    expect(Math.sign(f.arms[0].swing)).toBe(-Math.sign(f.arms[1].swing));
  });

  it('자기는 침대 위에 등을 대고 누워 숨 쉬듯 살짝 오르내린다', () => {
    const a = poseFrame('sleep', 0, 0);
    const b = poseFrame('sleep', 1, 0);
    expect(a.bodyPitch).toBeCloseTo(-Math.PI / 2);
    // 몸통 아래가 침대 매트리스 위에 온다
    expect((a.bodyY - 0.42) * CHARACTER_SCALE).toBeGreaterThan(BED_HEIGHT - 0.05);
    expect(a.bodyY).not.toBe(b.bodyY);
    expect(a.prop).toBeNull();
  });

  it('포즈마다 맞는 소품을 든다', () => {
    expect(poseFrame('sitEat', 1, 0).prop).toBe('spoon');
    expect(poseFrame('sitRead', 1, 0).prop).toBe('book');
    expect(poseFrame('sitSip', 1, 0).prop).toBe('cup');
    expect(poseFrame('sitType', 1, 0).prop).toBeNull();
    expect(poseFrame('walk', 1, 0).prop).toBeNull();
  });

  it('타이핑은 팔을 앞으로 내밀고 가끔 고개를 든다', () => {
    expect(poseFrame('sitType', 3, 0).arms[0].swing).toBeLessThan(-0.9);
    const pitches = Array.from(
      { length: 80 },
      (_, i) => poseFrame('sitType', i * 0.1, 0).headPitch,
    );
    expect(Math.min(...pitches)).toBeLessThan(0);
    expect(Math.max(...pitches)).toBeCloseTo(0.25);
  });

  it('같은 입력이면 같은 결과', () => {
    expect(poseFrame('sitSip', 7.7, 2)).toEqual(poseFrame('sitSip', 7.7, 2));
  });
});

describe('withStretch', () => {
  it('20초 주기 중 2초 동안만 팔을 위로 든다', () => {
    const f = poseFrame('sitType', 1, 0);
    expect(withStretch(f, 1, 0).arms[0].swing).toBeLessThan(-2.5);
    expect(withStretch(f, 10, 0)).toBe(f);
  });
});

describe('blinkScale · tailSwing', () => {
  it('대부분 떠 있고 잠깐 감는다', () => {
    const samples = Array.from({ length: 300 }, (_, i) => blinkScale(i * 0.02, 0.5));
    const closed = samples.filter((s) => s < 1).length;
    expect(closed).toBeGreaterThan(0);
    expect(closed).toBeLessThan(samples.length * 0.1);
  });

  it('꼬리는 ±0.35 안에서 흔든다', () => {
    for (let i = 0; i < 50; i++) {
      expect(Math.abs(tailSwing('walk', i * 0.13, 1))).toBeLessThanOrEqual(0.35);
    }
  });
});
