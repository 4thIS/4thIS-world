import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CAMPUS } from '@4this/shared';
import { PLAZA, pathSegments, paverTiles } from './layout';

const PAVER_COLORS = ['#fbeedd', '#f5e2cc', '#f9e8d6'];

/** 경로 그래프를 따라 깐 보도블록 (InstancedMesh 1개) + 원형 광장 */
export function Paths() {
  const tiles = useMemo(() => paverTiles(pathSegments(CAMPUS), CAMPUS), []);
  const geometry = useMemo(() => new RoundedBoxGeometry(0.56, 0.08, 0.56, 1, 0.04), []);
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const d = new Object3D();
    const c = new Color();
    tiles.forEach((t, i) => {
      d.position.set(t.x, 0.03, t.z);
      d.rotation.set(0, t.rot, 0);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      mesh.setColorAt(i, c.set(PAVER_COLORS[t.shade]!));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [tiles]);

  return (
    <group>
      <instancedMesh ref={ref} args={[geometry, undefined, tiles.length]} receiveShadow>
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <mesh position={[PLAZA.center[0], 0.04, PLAZA.center[1]]} receiveShadow>
        <cylinderGeometry args={[PLAZA.r, PLAZA.r, 0.08, 48]} />
        <meshStandardMaterial color="#f7e0d0" roughness={0.9} />
      </mesh>
      <mesh position={[PLAZA.center[0], 0.09, PLAZA.center[1]]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[PLAZA.r * 0.7, 0.07, 8, 48]} />
        <meshStandardMaterial color="#f0c9b5" roughness={0.9} />
      </mesh>
      <mesh position={[PLAZA.center[0], 0.1, PLAZA.center[1]]} receiveShadow>
        <cylinderGeometry args={[0.9, 0.9, 0.12, 32]} />
        <meshStandardMaterial color="#f4d4c4" roughness={0.9} />
      </mesh>
    </group>
  );
}
