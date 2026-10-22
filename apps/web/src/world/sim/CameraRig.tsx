import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Vector3 } from 'three';
import { CAMPUS } from '@4this/shared';
import { useWorld } from '../../store/world';
import { buildingGoal, followPosition, type CameraGoal } from './camera';
import { memberObjects } from './registry';

/** drei OrbitControls(makeDefault)에서 쓰는 부분만 */
interface OrbitLike {
  target: Vector3;
  update: () => void;
}

/** 카메라: 건물을 누르면 그 건물로 다가가고, focusedMember가 있으면 그 캐릭터를 따라간다 */
export function CameraRig() {
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
  const camera = useThree((s) => s.camera);
  const focusedBuilding = useWorld((s) => s.focusedBuilding);
  const goal = useRef<CameraGoal | null>(null);

  useEffect(() => {
    goal.current = focusedBuilding ? buildingGoal(focusedBuilding, CAMPUS) : null;
  }, [focusedBuilding]);

  useFrame((_, dt) => {
    if (!controls) return;
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
    if (!g) return;
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

  return null;
}
