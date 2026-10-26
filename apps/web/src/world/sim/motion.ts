import type { Pose, PoseKind } from '@4this/shared';

export type Vec3 = [number, number, number];

/** 위치가 목표를 따라가는 빠르기 (1/초). 클수록 바로 붙는다 */
export const POSITION_RATE = 12;
/** 방향이 목표를 따라가는 빠르기 (1/초) */
export const FACING_RATE = 10;
/** 목표가 이보다 멀리 튀면(층 이동·정문 출입) 보간하지 않고 옮긴다 (m) */
export const SNAP_DISTANCE = 2.5;

/** 지수 감쇠 보간: 프레임 속도와 상관없이 같은 빠르기로 목표에 다가간다 */
export function damp(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt);
}

/** 각도 보간. 짧은 쪽으로 돈다 */
export function dampAngle(current: number, target: number, rate: number, dt: number): number {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * (1 - Math.exp(-rate * dt));
}

/** 현재 위치에서 목표로 한 프레임만큼 다가간 위치. 처음이거나 멀리 튀면 바로 옮긴다 */
export function stepPosition(current: Vec3, target: Vec3, dt: number, first = false): Vec3 {
  const d = Math.hypot(target[0] - current[0], target[1] - current[1], target[2] - current[2]);
  if (first || d > SNAP_DISTANCE) return [target[0], target[1], target[2]];
  return [
    damp(current[0], target[0], POSITION_RATE, dt),
    damp(current[1], target[1], POSITION_RATE, dt),
    damp(current[2], target[2], POSITION_RATE, dt),
  ];
}

/** React state로 들고 있는 표시 값. 바뀔 때만 setState 한다 */
export interface DisplayState {
  visible: boolean;
  pose: PoseKind;
  status: string;
  /** 0.1 단위로 끊어 페이드 중에도 렌더가 몇 번만 일어나게 한다 */
  opacity: number;
}

export const HIDDEN_DISPLAY: DisplayState = {
  visible: false,
  pose: 'idle',
  status: '',
  opacity: 0,
};

/** 샘플 결과 → 표시 값. 부재(null)이거나 컷어웨이로 가려지면 보이지 않는다 */
export function displayOf(pose: Pose | null, hidden = false): DisplayState {
  if (!pose || hidden) return HIDDEN_DISPLAY;
  const opacity = Math.round(pose.opacity * 10) / 10;
  return { visible: opacity > 0, pose: pose.pose, status: pose.status, opacity };
}

export function sameDisplay(a: DisplayState, b: DisplayState): boolean {
  return (
    a.visible === b.visible && a.pose === b.pose && a.status === b.status && a.opacity === b.opacity
  );
}
