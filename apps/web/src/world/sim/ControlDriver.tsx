import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { CAMPUS, CAMPUS_HALF, type Vec2 } from '@4this/shared';
import { useRealtime } from '../../store/realtime';
import { moverFloor, moverHeight, stepMover, type MoverState } from './indoor';
import { floorY } from '../campus/buildingGeometry';
import { CONTROL_KEYS, CONTROL_SPEED, keyDirection, toWorld } from './input';

/** 입력 칸에 글을 쓰는 중이면 키를 가로채지 않는다 */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/**
 * 내 캐릭터 조종 (§9): WASD·방향키는 카메라 기준으로 걷고, 바닥을 누르면(탭하면) 그 지점까지 걷는다.
 * 매 프레임 충돌을 풀어 로컬 위치를 옮기고, realtime.move가 초당 15회 이하로 서버에 보낸다.
 * 건물은 문으로 드나들고, 계단 끝으로 들어가면 위·아래층으로 오르내린다(indoor.ts).
 */
export function ControlDriver() {
  const controlling = useRealtime((s) => s.controlling);
  const camera = useThree((s) => s.camera);
  const keys = useRef(new Set<string>());
  const clickTarget = useRef<Vec2 | null>(null);
  const look = useRef(new Vector3());
  /** 계단 위인지까지 담은 내 위치. 조종을 시작할 때 local에서 만든다 */
  const mover = useRef<MoverState | null>(null);
  const floor = useRealtime((s) => s.local?.floor ?? 1);

  useEffect(() => {
    if (!controlling) return;
    const pressed = keys.current;
    const down = (e: KeyboardEvent) => {
      if (!CONTROL_KEYS.has(e.code) || isTyping(e.target)) return;
      e.preventDefault();
      pressed.add(e.code);
    };
    const up = (e: KeyboardEvent) => pressed.delete(e.code);
    const blur = () => pressed.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      pressed.clear();
      clickTarget.current = null;
      mover.current = null;
    };
  }, [controlling]);

  useFrame((_, dt) => {
    const rt = useRealtime.getState();
    const local = rt.local;
    if (!rt.controlling || !local) return;
    mover.current ??= { pos: [local.x, local.z], floor: local.floor, stair: null };
    const pos: Vec2 = mover.current.pos;

    let dir: Vec2 = [0, 0];
    const input = keyDirection(keys.current);
    if (input[0] !== 0 || input[1] !== 0) {
      camera.getWorldDirection(look.current);
      dir = toWorld(input, [look.current.x, look.current.z]);
      clickTarget.current = null;
    } else if (clickTarget.current) {
      const dx = clickTarget.current[0] - pos[0];
      const dz = clickTarget.current[1] - pos[1];
      const d = Math.hypot(dx, dz);
      if (d < 0.1) clickTarget.current = null;
      else dir = [dx / d, dz / d];
    }

    const moving = dir[0] !== 0 || dir[1] !== 0;
    const step = Math.min(CONTROL_SPEED * dt, 0.5);
    const nextState = moving
      ? stepMover(CAMPUS, mover.current, [pos[0] + dir[0] * step, pos[1] + dir[1] * step])
      : mover.current;
    mover.current = nextState;
    const next = nextState.pos;
    const stuck = moving && next[0] === pos[0] && next[1] === pos[1];
    if (stuck) clickTarget.current = null;
    rt.move(
      {
        x: next[0],
        z: next[1],
        y: moverHeight(nextState),
        floor: moverFloor(nextState),
        facing: moving ? Math.atan2(dir[0], dir[1]) : local.facing,
        moving: moving && !stuck,
      },
      performance.now(),
    );
  });

  const onFloor = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    clickTarget.current = [e.point.x, e.point.z];
  };

  if (!controlling) return null;
  // 조종 중에만 바닥 전체를 덮는 투명한 판을 깔아 클릭·탭 지점을 받는다 (지금 층 높이에)
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, floorY(floor) + 0.02, 0]} onPointerDown={onFloor}>
      <planeGeometry args={[CAMPUS_HALF * 2, CAMPUS_HALF * 2]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
