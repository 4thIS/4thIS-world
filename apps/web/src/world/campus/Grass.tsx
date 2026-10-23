import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, ConeGeometry, Object3D, type InstancedMesh } from 'three';
import { CAMPUS } from '@4this/shared';
import { pathSegments, scatterGrass } from './layout';

const LIGHT = new Color('#b5e3a8');
const DARK = new Color('#8fcf88');

/** 잔디 결: 작은 풀잎을 흩뿌린다 (InstancedMesh 1개, 그림자 없음) */
export function Grass({ tries = 7000 }: { tries?: number }) {
  const blades = useMemo(() => scatterGrass(CAMPUS, pathSegments(CAMPUS), tries), [tries]);
  const geometry = useMemo(() => new ConeGeometry(0.05, 0.28, 3).translate(0, 0.14, 0), []);
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const d = new Object3D();
    const c = new Color();
    blades.forEach((b, i) => {
      d.position.set(b.x, 0, b.z);
      d.rotation.set(b.tiltX, b.rotY, b.tiltZ);
      d.scale.setScalar(b.scale);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      mesh.setColorAt(i, c.copy(LIGHT).lerp(DARK, b.shade));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blades]);

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, blades.length]}>
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}
