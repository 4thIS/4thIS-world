import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';
import { geo } from './geometries';

/** 불꽃 두 번: 0.4초, 1.2초에 터진다 (초) */
const BURSTS = [0.4, 1.2];
const PER_BURST = 48;
const LIFE = 1.1;
const COLORS = ['#ff8fb1', '#ffd36e', '#a7dcb6', '#a9cdf0', '#c9bdf2', '#ffffff'];

/** 머리 위에서 터지는 파스텔 불꽃 (폭죽 모션). at은 performance.now() ms */
export function Fireworks({ at, height }: { at: number; height: number }) {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  // 파티클마다 날아가는 방향 (구 위에 고르게)
  const dirs = useMemo(
    () =>
      Array.from({ length: BURSTS.length * PER_BURST }, (_, i) => {
        const k = i % PER_BURST;
        const y = 1 - (2 * (k + 0.5)) / PER_BURST;
        const r = Math.sqrt(1 - y * y);
        const a = k * 2.399963 + Math.floor(i / PER_BURST);
        return [Math.cos(a) * r, y, Math.sin(a) * r] as const;
      }),
    [],
  );

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const c = new Color();
    dirs.forEach((_, i) => mesh.setColorAt(i, c.set(COLORS[i % COLORS.length]!)));
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [dirs]);

  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const t = (performance.now() - at) / 1000;
    dirs.forEach(([dx, dy, dz], i) => {
      const age = t - BURSTS[Math.floor(i / PER_BURST)]!;
      if (age < 0 || age > LIFE) {
        dummy.scale.setScalar(0);
      } else {
        const out = (1 - (1 - age / LIFE) ** 3) * 2.2;
        dummy.position.set(dx * out, height + dy * out - age * age * 0.8, dz * out);
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
      args={[geo.sphere(0.11, 6, 4), undefined, dirs.length]}
      frustumCulled={false}
    >
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  );
}
