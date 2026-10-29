import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { MOUSE, TOUCH, type Vector3 } from 'three';
import { CAMPUS } from '@4this/shared';
import { useRealtime } from '../../store/realtime';
import { useWorld } from '../../store/world';
import { useUi } from '../../ui/store';
import {
  CAMERA_KEYS,
  OVERVIEW,
  acceptsCameraKeys,
  buildingGoal,
  clampTarget,
  followPosition,
  keyPan,
  keyRotate,
  orbitY,
  type CameraGoal,
} from './camera';
import { isDoublePress, type Press } from './doublePress';
import { memberObjects } from './registry';

/** drei OrbitControls(makeDefault)에서 쓰는 부분만 */
interface OrbitLike {
  target: Vector3;
  mouseButtons: { LEFT?: MOUSE | null };
  touches: { ONE?: TOUCH | null };
  update: () => void;
  addEventListener: (type: 'start', listener: () => void) => void;
  removeEventListener: (type: 'start', listener: () => void) => void;
}

/** 입력칸에 글자를 쓰는 중인가 (그때 WASD는 글자다) */
function isTyping(): boolean {
  const el = document.activeElement;
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  );
}

/**
 * 카메라: 건물을 누르면 그 건물로 다가가고, focusedMember가 있으면 그 캐릭터를 따라간다.
 * goHome()이면 처음 시야로 돌아가고, 키보드(WASD·화살표 이동, Q/E 회전)로도 움직인다.
 * 바라보는 점은 캠퍼스 밖으로 나가지 않는다.
 */
export function CameraRig() {
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
  const camera = useThree((s) => s.camera);
  const focusedBuilding = useWorld((s) => s.focusedBuilding);
  const homeNonce = useWorld((s) => s.homeNonce);
  const goal = useRef<CameraGoal | null>(null);
  const keys = useRef(new Set<string>());

  useEffect(() => {
    goal.current = focusedBuilding ? buildingGoal(focusedBuilding, CAMPUS) : null;
  }, [focusedBuilding]);

  // 처음 렌더(0)는 건너뛰고, goHome()할 때마다 처음 시야로 날아간다
  useEffect(() => {
    if (homeNonce > 0) goal.current = OVERVIEW;
  }, [homeNonce]);

  // 왼쪽 끌기는 회전이지만, 더블 클릭(더블 탭)한 채로 끌면 그동안만 화면 이동이다.
  // OrbitControls보다 먼저 보도록 window 캡처 단계에서 듣는다
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (!controls) return;
    let last: Press | null = null;
    const down = (e: PointerEvent) => {
      if (e.target !== gl.domElement || e.button !== 0) return;
      const now: Press = { x: e.clientX, y: e.clientY, at: e.timeStamp };
      const pan = isDoublePress(last, now);
      last = pan ? null : now;
      controls.mouseButtons.LEFT = pan ? MOUSE.PAN : MOUSE.ROTATE;
      controls.touches.ONE = pan ? TOUCH.PAN : TOUCH.ROTATE;
    };
    const up = () => {
      controls.mouseButtons.LEFT = MOUSE.ROTATE;
      controls.touches.ONE = TOUCH.ROTATE;
    };
    window.addEventListener('pointerdown', down, true);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [controls, gl]);

  // 사용자가 끌기 시작하면 날아가던 카메라를 멈춘다
  useEffect(() => {
    if (!controls) return;
    const stop = () => (goal.current = null);
    controls.addEventListener('start', stop);
    return () => controls.removeEventListener('start', stop);
  }, [controls]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (CAMERA_KEYS.has(e.code) && !e.ctrlKey && !e.metaKey && !e.altKey)
        keys.current.add(e.code);
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const clear = () => keys.current.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
    };
  }, []);

  useFrame((_, dt) => {
    if (!controls) return;
    if (moveByKeys(controls, dt)) return;
    const { focusedMember } = useWorld.getState();
    const followed = focusedMember ? memberObjects.get(focusedMember) : undefined;

    if (followed?.visible) {
      // 목표가 움직인 만큼 카메라도 같이 옮겨 보는 각도를 지킨다
      const k = 1 - Math.exp(-4 * dt);
      const { x, y, z } = followed.position;
      const dx = (x - controls.target.x) * k;
      const dy = (y + 1 - controls.target.y) * k;
      const dz = (z - controls.target.z) * k;
      controls.target.set(controls.target.x + dx, controls.target.y + dy, controls.target.z + dz);
      camera.position.set(camera.position.x + dx, camera.position.y + dy, camera.position.z + dz);
      const t = controls.target;
      camera.position.set(
        ...followPosition(
          [camera.position.x, camera.position.y, camera.position.z],
          [t.x, t.y, t.z],
          k,
        ),
      );
      controls.update();
      return;
    }

    const g = goal.current;
    if (!g) {
      keepInside(controls);
      return;
    }
    const k = 1 - Math.exp(-3 * dt);
    const t = controls.target;
    t.set(
      t.x + (g.target[0] - t.x) * k,
      t.y + (g.target[1] - t.y) * k,
      t.z + (g.target[2] - t.z) * k,
    );
    const p = camera.position;
    p.set(
      p.x + (g.position[0] - p.x) * k,
      p.y + (g.position[1] - p.y) * k,
      p.z + (g.position[2] - p.z) * k,
    );
    controls.update();
    if (Math.hypot(g.position[0] - p.x, g.position[1] - p.y, g.position[2] - p.z) < 0.05) {
      goal.current = null; // 도착하면 사용자가 자유롭게 돌려 볼 수 있다
    }
  });

  /** 키보드로 움직였으면 true (그 프레임은 날아가기·따라가기를 하지 않는다) */
  function moveByKeys(c: OrbitLike, dt: number): boolean {
    if (keys.current.size === 0) return false;
    const ok = acceptsCameraKeys({
      controlling: useRealtime.getState().controlling,
      modalOpen: useUi.getState().screen !== null,
      typing: isTyping(),
    });
    if (!ok) return false;
    const t = c.target;
    const p = camera.position;
    const look: [number, number] = [t.x - p.x, t.z - p.z];
    const distance = p.distanceTo(t);
    const [dx, dz] = keyPan(keys.current, look, distance, dt);
    const angle = keyRotate(keys.current, dt);
    if (dx === 0 && dz === 0 && angle === 0) return false;
    goal.current = null;
    if (useWorld.getState().focusedMember) useWorld.getState().focusMember(null);
    t.set(t.x + dx, t.y, t.z + dz);
    p.set(p.x + dx, p.y, p.z + dz);
    if (angle !== 0) p.set(...orbitY([p.x, p.y, p.z], [t.x, t.y, t.z], angle));
    keepInside(c);
    return true;
  }

  /** 바라보는 점이 캠퍼스 밖이면 카메라와 함께 안으로 옮긴다 */
  function keepInside(c: OrbitLike) {
    const t = c.target;
    const [dx, dz] = clampTarget([t.x, t.y, t.z]);
    if (dx !== 0 || dz !== 0) {
      t.set(t.x + dx, t.y, t.z + dz);
      camera.position.set(camera.position.x + dx, camera.position.y, camera.position.z + dz);
    }
    c.update();
  }

  return null;
}
