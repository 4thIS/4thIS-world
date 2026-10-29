import { FLOOR_HEIGHT, type BuildingId, type Campus, type Vec2 } from '@4this/shared';
import { CONTROL_KEYS, keyDirection, toWorld } from './input';
import type { Vec3 } from './motion';

export interface CameraGoal {
  target: Vec3;
  position: Vec3;
}

/** 처음 화면: 남동쪽 위에서 캠퍼스 전체를 본다 */
export const OVERVIEW: CameraGoal = { target: [0, 0, 0], position: [38, 34, 40] };

/** 캐릭터를 따라갈 때 카메라와 캐릭터 사이 거리 (m) */
export const FOLLOW_DISTANCE = 16;

/** 건물을 클릭했을 때 카메라가 다가갈 곳: 건물 가운데를 남동쪽 위에서 본다 */
export function buildingGoal(id: BuildingId, campus: Campus): CameraGoal {
  const b = campus.buildings[id];
  const w = b.max[0] - b.min[0];
  const d = b.max[1] - b.min[1];
  const h = b.floors * FLOOR_HEIGHT;
  // 지붕 위 이름표와 포커스 표시(✓)까지 화면에 들어오게 가운데보다 조금 위를 본다
  const target: Vec3 = [(b.min[0] + b.max[0]) / 2, h / 2 + 2.5, (b.min[1] + b.max[1]) / 2];
  const distance = Math.max(w, d, h) * 1.2 + 12;
  const dir = [0.55, 0.6, 0.58];
  const len = Math.hypot(dir[0]!, dir[1]!, dir[2]!);
  return {
    target,
    position: [
      target[0] + (dir[0]! / len) * distance,
      target[1] + (dir[1]! / len) * distance,
      target[2] + (dir[2]! / len) * distance,
    ],
  };
}

/** 따라가기: 카메라가 목표보다 멀면 FOLLOW_DISTANCE까지 천천히 당긴다. 새 카메라 위치 */
export function followPosition(camera: Vec3, target: Vec3, k: number): Vec3 {
  const off: Vec3 = [camera[0] - target[0], camera[1] - target[1], camera[2] - target[2]];
  const len = Math.hypot(...off);
  if (len <= FOLLOW_DISTANCE || len === 0) return camera;
  const want = len + (FOLLOW_DISTANCE - len) * k;
  return [
    target[0] + (off[0] / len) * want,
    target[1] + (off[1] / len) * want,
    target[2] + (off[2] / len) * want,
  ];
}

/** 확대·축소 한계 (카메라와 바라보는 점 사이 거리, m) */
export const MIN_DISTANCE = 6;
export const MAX_DISTANCE = 90;

/** 바라보는 점이 나갈 수 없는 캠퍼스 범위 (x·z ∈ [-25, 25]) */
export const VIEW_HALF = 25;

/** 키보드 이동 속도: 1초에 (거리 × 이 값) m. 멀리서 보면 빨리, 가까이서 보면 천천히 */
export const KEY_PAN_PER_DISTANCE = 0.35;

/** Q/E 회전 속도 (rad/s) */
export const KEY_ROTATE_SPEED = 1.6;

const ROTATE_LEFT = 'KeyQ';
const ROTATE_RIGHT = 'KeyE';

export const CAMERA_KEYS: ReadonlySet<string> = new Set([
  ...CONTROL_KEYS,
  ROTATE_LEFT,
  ROTATE_RIGHT,
]);

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 바라보는 점이 캠퍼스 밖이면 안으로 되돌릴 [dx, dz]. 안이면 [0, 0] */
export function clampTarget(target: Vec3): Vec2 {
  const x = clamp(target[0], -VIEW_HALF, VIEW_HALF);
  const z = clamp(target[2], -VIEW_HALF, VIEW_HALF);
  return [x - target[0] || 0, z - target[2] || 0];
}

/** 눌린 키 → 이번 프레임에 바닥에서 움직일 [dx, dz]. look은 카메라가 보는 방향(x, z) */
export function keyPan(keys: ReadonlySet<string>, look: Vec2, distance: number, dt: number): Vec2 {
  const [x, z] = toWorld(keyDirection(keys), look);
  const step = distance * KEY_PAN_PER_DISTANCE * dt;
  return [x * step || 0, z * step || 0];
}

/** 눌린 키 → 이번 프레임의 회전각 (Q = +, E = -) */
export function keyRotate(keys: ReadonlySet<string>, dt: number): number {
  const dir = (keys.has(ROTATE_LEFT) ? 1 : 0) - (keys.has(ROTATE_RIGHT) ? 1 : 0);
  return dir * KEY_ROTATE_SPEED * dt;
}

/** 카메라를 바라보는 점의 세로축으로 angle만큼 돌린 새 위치 */
export function orbitY(camera: Vec3, target: Vec3, angle: number): Vec3 {
  const dx = camera[0] - target[0];
  const dz = camera[2] - target[2];
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [target[0] + dx * c + dz * s, camera[1], target[2] - dx * s + dz * c];
}

export interface CameraKeyState {
  /** 내 캐릭터 조종 중이면 WASD는 캐릭터 몫이다 */
  controlling: boolean;
  modalOpen: boolean;
  /** 입력칸에 글자를 쓰는 중 */
  typing: boolean;
}

/** 키보드로 카메라를 움직여도 되는가 */
export function acceptsCameraKeys(s: CameraKeyState): boolean {
  return !s.controlling && !s.modalOpen && !s.typing;
}
