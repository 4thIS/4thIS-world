import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  CircleGeometry,
  Object3D,
  SphereGeometry,
  type InstancedMesh,
  type MeshBasicMaterial,
} from 'three';
import { CAMPUS } from '@4this/shared';
import { lampHead, lampSpots, pathSegments } from './layout';

const WARM = '#ffe7a3';

/**
 * 가로등 불빛: 전구 + 바닥의 빛 웅덩이 (각각 InstancedMesh 1개).
 * 점광원을 쓰지 않아서 가로등이 많아도 빛 계산이 늘지 않는다. night가 0이면 꺼진다.
 */
export function LampGlow({ night }: { night: number }) {
  const heads = useMemo(() => lampSpots(pathSegments(CAMPUS), CAMPUS).map(lampHead), []);
  const bulbGeo = useMemo(() => new SphereGeometry(0.16, 12, 8), []);
  const poolGeo = useMemo(() => new CircleGeometry(1.8, 24).rotateX(-Math.PI / 2), []);
  const bulbs = useRef<InstancedMesh>(null);
  const pools = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const b = bulbs.current;
    const p = pools.current;
    if (!b || !p) return;
    const d = new Object3D();
    heads.forEach(([x, y, z], i) => {
      d.position.set(x, y, z);
      d.updateMatrix();
      b.setMatrixAt(i, d.matrix);
      d.position.set(x, 0.12, z);
      d.updateMatrix();
      p.setMatrixAt(i, d.matrix);
    });
    b.instanceMatrix.needsUpdate = true;
    p.instanceMatrix.needsUpdate = true;
    b.computeBoundingSphere();
    p.computeBoundingSphere();
  }, [heads]);

  useLayoutEffect(() => {
    const pm = pools.current?.material as MeshBasicMaterial | undefined;
    if (pm) pm.opacity = 0.45 * night;
  }, [night]);

  return (
    <group>
      <instancedMesh ref={bulbs} args={[bulbGeo, undefined, heads.length]}>
        <meshBasicMaterial color={night > 0.05 ? WARM : '#f4f0ea'} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={pools} args={[poolGeo, undefined, heads.length]} visible={night > 0.01}>
        <meshBasicMaterial
          color={WARM}
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
