import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';
import type { Weapon } from '@4this/shared';
import { useRealtime, type ActiveShot } from '../../store/realtime';
import { shotPosition } from './shots';

const LOOK: Record<Weapon, { color: string; size: [number, number, number] }> = {
  water: { color: '#8ec9ff', size: [0.12, 0.12, 0.12] },
  snow: { color: '#ffffff', size: [0.2, 0.2, 0.2] },
  ray: { color: '#ff7eb6', size: [0.07, 0.07, 0.7] },
};

/** 날아가는 장난감 하나. 물총은 물방울 셋이 줄지어, 광선총은 길쭉한 빛줄기 */
function Projectile({ shot }: { shot: ActiveShot }) {
  const refs = useRef<(Mesh | null)[]>([]);
  const look = LOOK[shot.weapon];
  const trail = shot.weapon === 'water' ? [0, 0.04, 0.08] : [0];
  const yaw = Math.atan2(shot.dir[0], shot.dir[1]);

  useFrame(() => {
    const t = (performance.now() - shot.start) / 1000;
    trail.forEach((lag, i) => {
      const m = refs.current[i];
      if (!m) return;
      const p = shotPosition(shot, t - lag);
      m.visible = p !== null;
      if (p) m.position.set(p[0], p[1], p[2]);
    });
  });

  return (
    <>
      {trail.map((_, i) => (
        <mesh
          key={i}
          ref={(m) => {
            refs.current[i] = m;
          }}
          rotation-y={yaw}
          scale={look.size}
          visible={false}
        >
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial
            color={look.color}
            emissive={look.color}
            emissiveIntensity={shot.weapon === 'ray' ? 1.2 : 0.25}
            transparent
            opacity={shot.weapon === 'water' ? 0.8 : 1}
          />
        </mesh>
      ))}
    </>
  );
}

/** 지금 날아가는 장난감들 (물총·눈덩이·광선총) */
export function Projectiles() {
  const shots = useRealtime((s) => s.shots);
  return (
    <>
      {shots.map((s) => (
        <Projectile key={s.id} shot={s} />
      ))}
    </>
  );
}
