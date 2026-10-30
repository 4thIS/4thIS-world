import { MOTION_DURATION_MS, type Motion } from '@4this/shared';
import type { ArmFrame, PoseFrame } from './poses';

/**
 * 모션(모션 버튼)을 자세 위에 덧입힌다 (순수 함수). 앞 0.2초에 자세에서 모션으로 넘어가고,
 * 마지막 0.25초에 원래 자세로 돌아온다. 눕기는 끝나지 않는다.
 */

const IN_SEC = 0.2;
const OUT_SEC = 0.25;
const TOTAL_SEC = MOTION_DURATION_MS / 1000;

/** 바닥에 누운 몸통 높이 (몸통 반지름만큼) */
const LIE_LIFT = 0.44;

/** 서서 해야 하는 모션: 앉아 있었으면 잠깐 일어선다 */
const STANDING: ReadonlySet<Motion> = new Set<Motion>(['dance', 'bow', 'jump', 'lie']);

const arm = (swing: number, spread: number): ArmFrame => ({ swing, spread });
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

function lerpFrame(a: PoseFrame, b: PoseFrame, k: number): PoseFrame {
  return {
    bodyY: lerp(a.bodyY, b.bodyY, k),
    bodyRoll: lerp(a.bodyRoll, b.bodyRoll, k),
    bodyPitch: lerp(a.bodyPitch, b.bodyPitch, k),
    bodyYaw: lerp(a.bodyYaw ?? 0, b.bodyYaw ?? 0, k),
    headYaw: lerp(a.headYaw, b.headYaw, k),
    headPitch: lerp(a.headPitch, b.headPitch, k),
    headRoll: lerp(a.headRoll, b.headRoll, k),
    arms: [
      arm(lerp(a.arms[0].swing, b.arms[0].swing, k), lerp(a.arms[0].spread, b.arms[0].spread, k)),
      arm(lerp(a.arms[1].swing, b.arms[1].swing, k), lerp(a.arms[1].spread, b.arms[1].spread, k)),
    ],
    feet: [
      { y: lerp(a.feet[0].y, b.feet[0].y, k), z: lerp(a.feet[0].z, b.feet[0].z, k) },
      { y: lerp(a.feet[1].y, b.feet[1].y, k), z: lerp(a.feet[1].z, b.feet[1].z, k) },
    ],
    prop: k > 0.5 ? null : a.prop,
  };
}

/** 모션 자체의 자세 (e: 지난 초). base는 앉은 자세 등 원래 자세 */
function target(base: PoseFrame, kind: Motion, e: number): PoseFrame {
  const upright: PoseFrame = STANDING.has(kind)
    ? {
        ...base,
        bodyY: 0,
        bodyPitch: 0,
        feet: [
          { y: 0.08, z: 0.08 },
          { y: 0.08, z: 0.08 },
        ],
      }
    : base;
  const f: PoseFrame = { ...upright, bodyYaw: 0, prop: null };
  switch (kind) {
    case 'cheer': {
      // 두 팔 번쩍 + 콩콩 두 번
      f.arms = [arm(-2.9, 0.45), arm(-2.9, 0.45)];
      f.bodyY = upright.bodyY + Math.abs(Math.sin(e * Math.PI * 1.6)) * 0.22;
      f.headPitch = -0.25;
      return f;
    }
    case 'wave': {
      f.arms = [arm(0, 0.5), arm(-2.6, 0.35 + Math.sin(e * 12) * 0.45)];
      f.headRoll = Math.sin(e * 6) * 0.12;
      return f;
    }
    case 'firework': {
      // 두 팔을 들어 올리면 머리 위에서 불꽃이 터진다 (Fireworks)
      f.arms = [arm(-3, 0.25), arm(-3, 0.25)];
      f.headPitch = -0.45;
      return f;
    }
    case 'dance': {
      f.bodyYaw = (e / 1.3) * Math.PI * 2;
      f.bodyRoll = Math.sin(e * 8) * 0.15;
      f.bodyY = Math.abs(Math.sin(e * 8)) * 0.08;
      f.arms = [arm(-1.6 + Math.sin(e * 8) * 0.8, 0.6), arm(-1.6 - Math.sin(e * 8) * 0.8, 0.6)];
      return f;
    }
    case 'bow': {
      const bend = Math.sin(Math.min(1, e / (TOTAL_SEC - 0.4)) * Math.PI);
      f.bodyPitch = bend * 0.7;
      f.headPitch = bend * 0.3;
      f.arms = [arm(0.1, 0.15), arm(0.1, 0.15)];
      return f;
    }
    case 'jump': {
      // 한 번 크게 뛰었다 내려와 한 번 더 작게
      const big = e > 0.3 && e < 1.1 ? Math.sin(((e - 0.3) / 0.8) * Math.PI) * 0.9 : 0;
      const small = e > 1.3 && e < 1.8 ? Math.sin(((e - 1.3) / 0.5) * Math.PI) * 0.35 : 0;
      const h = big + small;
      f.bodyY = h;
      f.feet = [
        { y: 0.08 + h, z: 0.04 },
        { y: 0.08 + h, z: 0.04 },
      ];
      f.arms = h > 0.05 ? [arm(-2.7, 0.5), arm(-2.7, 0.5)] : [arm(0.3, 0.4), arm(0.3, 0.4)];
      return f;
    }
    case 'clap': {
      const beat = Math.abs(Math.sin(e * 10));
      f.arms = [arm(-1.35, 0.05 + beat * 0.3), arm(-1.35, 0.05 + beat * 0.3)];
      f.headPitch = -0.1;
      return f;
    }
    case 'lie': {
      f.bodyY = LIE_LIFT + Math.sin(e * 1.2) * 0.02;
      f.bodyPitch = -Math.PI / 2;
      f.headRoll = 0.25;
      f.arms = [arm(0, 0.25), arm(0, 0.25)];
      f.feet = [
        { y: 0.1, z: 0.3 },
        { y: 0.1, z: 0.3 },
      ];
      return f;
    }
  }
}

/** 받은 뒤 지난 시간(ms) → 덧입힌 자세. 한 번 하는 모션이 끝났으면 null */
export function motionFrame(base: PoseFrame, kind: Motion, elapsedMs: number): PoseFrame | null {
  const e = Math.max(0, elapsedMs) / 1000;
  const held = kind === 'lie';
  if (!held && e >= TOTAL_SEC) return null;
  const k = held ? Math.min(1, e / IN_SEC) : Math.min(1, e / IN_SEC, (TOTAL_SEC - e) / OUT_SEC);
  return lerpFrame(base, target(base, kind, e), Math.max(0, k));
}
