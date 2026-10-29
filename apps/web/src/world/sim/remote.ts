import {
  WALK_SPEED_MPS,
  facingOf,
  pathLength,
  type ControlMove,
  type Pose,
  type Vec2,
} from '@4this/shared';

/** 조종 중인 캐릭터의 이름표 */
export const CONTROL_STATUS = '🎮 조종 중';

/** 받은 조종 상태 하나. at은 받은 시각(Date.now) */
export type RemoteSample = ControlMove & { at: number };

/** 최근 두 상태. 10 Hz로 오니 둘 사이를 보간해 부드럽게 그린다 */
export interface RemoteTrack {
  prev: RemoteSample | null;
  last: RemoteSample;
}

export function pushSample(track: RemoteTrack | undefined, sample: RemoteSample): RemoteTrack {
  return { prev: track ? track.last : null, last: sample };
}

/** 조종 상태 → Pose (건물 위층·계단이면 y가 0보다 크다) */
export function controlPose(m: ControlMove): Pose {
  return {
    position: [m.x, m.y, m.z],
    facing: m.facing,
    pose: m.moving ? 'walk' : 'idle',
    placeId: 'transit',
    floor: m.floor,
    status: CONTROL_STATUS,
    opacity: 1,
  };
}

/**
 * 한 박자 늦게 그리기: 마지막 상태를 받은 뒤 지난 시간만큼 prev → last로 옮겨 간다.
 * 두 상태 사이 간격(보통 100 ms)이 지나면 last에 닿는다.
 */
export function remotePose(track: RemoteTrack, now: number): Pose {
  const { prev, last } = track;
  if (!prev) return controlPose(last);
  const span = Math.max(1, last.at - prev.at);
  const k = Math.min(1, Math.max(0, (now - last.at) / span));
  return controlPose({
    x: prev.x + (last.x - prev.x) * k,
    z: prev.z + (last.z - prev.z) * k,
    y: prev.y + (last.y - prev.y) * k,
    floor: last.floor,
    facing: k < 1 ? prev.facing : last.facing,
    moving: last.moving,
  });
}

/** 조종이 풀린 뒤 placement 자리까지 걸어서 돌아가는 길 */
export interface ReturnWalk {
  start: number;
  pts: Vec2[];
  length: number;
  status: string;
}

/** from → to 곧장 (길을 찾지 않고 최단 거리로) */
export function planReturn(from: Vec2, to: Vec2, start: number, status: string): ReturnWalk {
  const pts = from[0] === to[0] && from[1] === to[1] ? [from] : [from, to];
  return { start, pts, length: pathLength(pts), status };
}

/** 돌아가는 중이면 그 위치, 다 걸었으면 null (그때부터 placement가 그린다) */
export function sampleReturn(walk: ReturnWalk, now: number): Pose | null {
  const d = ((now - walk.start) / 1000) * WALK_SPEED_MPS;
  if (d >= walk.length || walk.pts.length < 2) return null;
  let rest = Math.max(0, d);
  for (let i = 1; i < walk.pts.length; i++) {
    const a = walk.pts[i - 1]!;
    const b = walk.pts[i]!;
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (rest <= seg || i === walk.pts.length - 1) {
      const k = seg > 0 ? Math.min(1, rest / seg) : 1;
      return {
        position: [a[0] + (b[0] - a[0]) * k, 0, a[1] + (b[1] - a[1]) * k],
        facing: facingOf(a, b),
        pose: 'walk',
        placeId: 'transit',
        floor: 1,
        status: walk.status,
        opacity: 1,
      };
    }
    rest -= seg;
  }
  return null;
}
