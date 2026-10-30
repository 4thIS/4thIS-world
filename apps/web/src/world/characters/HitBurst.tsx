import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { Object3D, type InstancedMesh } from 'three';
import type { Weapon } from '@4this/shared';
import { geo } from './geometries';

const COLOR: Record<Weapon, string> = { water: '#8ec9ff', snow: '#ffffff', ray: '#ffd36e' };
const COUNT = 18;
const LIFE = 0.7;

/** 맞은 순간 머리 둘레로 튀는 물방울·눈가루·반짝이. at은 맞는 순간 performance.now() ms */
export function HitBurst({ weapon, at, height }: { weapon: Weapon; at: number; height: number }) {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const dirs = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => {
        const a = (i / COUNT) * Math.PI * 2;
        return [Math.cos(a), 0.4 + (i % 3) * 0.3, Math.sin(a)] as const;
      }),
    [],
  );

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const age = (performance.now() - at) / 1000;
    dirs.forEach(([dx, dy, dz], i) => {
      if (age < 0 || age > LIFE) dummy.scale.setScalar(0);
      else {
        const out = age * 1.6;
        dummy.position.set(dx * out, height + dy * out - age * age * 2, dz * out);
        dummy.scale.setScalar(1 - age / LIFE);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={ref}
      args={[geo.sphere(0.06, 6, 4), undefined, COUNT]}
      frustumCulled={false}
    >
      <meshBasicMaterial color={COLOR[weapon]} toneMapped={false} />
    </instancedMesh>
  );
}
