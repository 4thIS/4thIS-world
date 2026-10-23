import type { PoseKind } from '@4this/shared';

/**
 * 캐릭터는 "몸 단위"(스케일 전)로 조립한 뒤 CHARACTER_SCALE을 곱한다.
 * 키는 약 1.73 단위 → 1.07 m.
 */
export const CHARACTER_SCALE = 0.62;

/** 의자·벤치 앉는 면 높이(m). 가구(hm)도 이 높이에 맞춘다 */
export const SEAT_HEIGHT = 0.45;

/** 몸통 아래 끝(몸 단위). 앉을 때 이 점이 SEAT_HEIGHT에 오도록 몸을 올린다 */
const TORSO_BOTTOM = 0.15;

/** 앉은 포즈의 몸 높이(몸 단위). 의자에 살짝 파묻히도록 0.04 낮춘다 */
export const SIT_LIFT = SEAT_HEIGHT / CHARACTER_SCALE - TORSO_BOTTOM - 0.04;

/** 손에 드는 소품 */
export type HeldProp = 'spoon' | 'book' | 'cup';

export interface ArmFrame {
  /** rotation.x. 음수면 앞으로 든다 */
  swing: number;
  /** 몸에서 벌어지는 정도. 왼팔은 -spread, 오른팔은 +spread가 rotation.z에 들어간다 */
  spread: number;
}

export interface FootFrame {
  y: number;
  z: number;
}

/** 한 프레임의 몸 상태. 길이는 몸 단위, 각도는 라디안 */
export interface PoseFrame {
  bodyY: number;
  bodyRoll: number;
  bodyPitch: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
  /** [왼팔, 오른팔] */
  arms: [ArmFrame, ArmFrame];
  /** [왼발, 오른발] */
  feet: [FootFrame, FootFrame];
  prop: HeldProp | null;
}

export const SITTING_POSES: ReadonlySet<PoseKind> = new Set<PoseKind>([
  'sitType',
  'sitEat',
  'sitRead',
  'sitSip',
  'sitRest',
]);

const REST_SPREAD = 0.5;

const arm = (swing: number, spread = REST_SPREAD): ArmFrame => ({ swing, spread });

/** period 초마다 length 초 동안 0 → 1 → 0으로 부드럽게 오르내린다 */
function pulse(t: number, period: number, length: number): number {
  const local = (((t % period) + period) % period) / length;
  return local < 1 ? Math.sin(local * Math.PI) : 0;
}

const standing = (): PoseFrame => ({
  bodyY: 0,
  bodyRoll: 0,
  bodyPitch: 0,
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
  arms: [arm(0), arm(0)],
  feet: [
    { y: 0.08, z: 0.08 },
    { y: 0.08, z: 0.08 },
  ],
  prop: null,
});

const seated = (): PoseFrame => ({
  ...standing(),
  bodyY: SIT_LIFT,
  feet: [
    { y: SIT_LIFT * 0.55, z: 0.36 },
    { y: SIT_LIFT * 0.55, z: 0.36 },
  ],
});

/**
 * 포즈·시각(초)·캐릭터별 위상으로 몸 상태를 만든다. 설계 문서 §6.2 동작표를 따른다.
 * 순수 함수라 vitest로 확인한다.
 */
export function poseFrame(pose: PoseKind, t: number, phase: number): PoseFrame {
  const p = t + phase;
  switch (pose) {
    case 'walk': {
      const tt = t * 7 + phase;
      const f = standing();
      f.bodyY = Math.abs(Math.sin(tt)) * 0.12;
      f.bodyRoll = Math.sin(tt) * 0.06;
      f.feet = [
        { z: 0.08 + Math.sin(tt) * 0.16, y: 0.08 + Math.max(0, Math.sin(tt)) * 0.08 },
        {
          z: 0.08 + Math.sin(tt + Math.PI) * 0.16,
          y: 0.08 + Math.max(0, Math.sin(tt + Math.PI)) * 0.08,
        },
      ];
      // 팔은 반대쪽 발과 같이 움직인다
      f.arms = [arm(-Math.sin(tt) * 0.6), arm(-Math.sin(tt + Math.PI) * 0.6)];
      return f;
    }
    case 'idle': {
      const f = standing();
      f.bodyY = Math.sin(p * 2) * 0.02;
      f.headYaw = Math.sin(p * 0.6) * 0.35;
      return f;
    }
    case 'stand': {
      const f = standing();
      f.bodyY = Math.sin(p * 2) * 0.015;
      f.bodyRoll = Math.sin(p * 1.2) * 0.04;
      f.headRoll = Math.sin(p * 1.2 + 0.6) * 0.03;
      return f;
    }
    case 'sitType': {
      const f = seated();
      const lookUp = pulse(p, 8, 1.4);
      f.bodyPitch = 0.08;
      f.headPitch = 0.25 - lookUp * 0.4;
      f.arms = [
        arm(-1.1 + Math.sin(p * 14) * 0.08, 0.25),
        arm(-1.1 + Math.sin(p * 14 + Math.PI) * 0.08, 0.25),
      ];
      return f;
    }
    case 'sitEat': {
      const f = seated();
      const scoop = (Math.sin(p * 3) + 1) / 2;
      f.headPitch = 0.15 - scoop * 0.1;
      f.arms = [arm(-0.6, 0.3), arm(-0.8 - scoop * 0.8, 0.3)];
      f.prop = 'spoon';
      return f;
    }
    case 'sitRead': {
      const f = seated();
      const turn = pulse(p, 6, 0.8);
      f.headPitch = 0.3;
      f.headYaw = Math.sin(p * 0.5) * 0.08;
      f.arms = [arm(-1.2, 0.2), arm(-1.2 + turn * 0.3, 0.2 + turn * 0.6)];
      f.prop = 'book';
      return f;
    }
    case 'sitSip': {
      const f = seated();
      const sip = pulse(p, 5, 1.5);
      f.headPitch = 0.05 - sip * 0.15;
      f.arms = [arm(-0.5, 0.3), arm(-0.9 - sip * 0.8, 0.3 - sip * 0.15)];
      f.prop = 'cup';
      return f;
    }
    case 'sitRest': {
      const f = seated();
      f.bodyY = SIT_LIFT + Math.sin(p * 1.5) * 0.015;
      f.bodyPitch = -0.08;
      f.headRoll = Math.sin(p * 0.7) * 0.08;
      f.arms = [arm(-0.3, 0.7), arm(-0.3, 0.7)];
      return f;
    }
  }
}

/** 사자 교수님이 가끔 기지개를 켠다 (설계 문서 §6.4). 20초마다 2초 동안 두 팔을 위로 뻗는다 */
export function withStretch(frame: PoseFrame, t: number, phase: number): PoseFrame {
  const s = pulse(t + phase, 20, 2);
  if (s === 0) return frame;
  const lerp = (a: number, b: number) => a + (b - a) * s;
  return {
    ...frame,
    headPitch: lerp(frame.headPitch, -0.3),
    arms: [
      arm(lerp(frame.arms[0].swing, -2.8), lerp(frame.arms[0].spread, 0.3)),
      arm(lerp(frame.arms[1].swing, -2.8), lerp(frame.arms[1].spread, 0.3)),
    ],
  };
}

/** 눈 세로 크기: 몇 초마다 0.12초 동안 감는다. 캐릭터마다 주기가 조금 다르다 */
export function blinkScale(t: number, phase: number): number {
  const period = 3 + (phase % 2);
  return (t + phase) % period < 0.12 ? 0.1 : 1;
}

/** 꼬리 좌우 흔들기 (rotation.y). 걸을 때 더 빠르다 */
export function tailSwing(pose: PoseKind, t: number, phase: number): number {
  const speed = pose === 'walk' ? 12 : 6;
  return Math.sin(t * speed + phase) * 0.35;
}
