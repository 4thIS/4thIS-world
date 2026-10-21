import { useLayoutEffect, useMemo, useRef } from 'react';
import { CylinderGeometry, DodecahedronGeometry, Object3D, type InstancedMesh } from 'three';
import { CAMPUS, rand01 } from '@4this/shared';
import { pondCircle } from './layout';

const STONES = 26;
const PADS: readonly (readonly [number, number, number])[] = [
  [0.35, 0.2, 0.42],
  [-0.4, 0.35, 0.34],
  [0.1, -0.45, 0.3],
  [-0.2, -0.1, 0.26],
  [0.55, -0.25, 0.28],
];

/** 연못: 물 + 돌 테두리 + 연잎. 원 충돌체(CAMPUS.colliders)와 같은 자리·크기 */
export function Pond() {
  const { center, r } = pondCircle(CAMPUS);
  const water = r - 0.4;
  const stoneGeo = useMemo(() => new DodecahedronGeometry(0.34, 0), []);
  const padGeo = useMemo(
    () => new CylinderGeometry(1, 1, 0.03, 16, 1, false, 0, Math.PI * 1.75),
    [],
  );
  const stones = useRef<InstancedMesh>(null);
  const pads = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const s = stones.current;
    const p = pads.current;
    if (!s || !p) return;
    const d = new Object3D();
    for (let i = 0; i < STONES; i++) {
      const a = (i / STONES) * Math.PI * 2;
      const rr = r - 0.22 + (rand01('stone', i) - 0.5) * 0.12;
      d.position.set(Math.cos(a) * rr, 0.06, Math.sin(a) * rr);
      d.rotation.set(0, rand01('stone-r', i) * 3, 0);
      d.scale.set(1, 0.6, 1).multiplyScalar(0.85 + rand01('stone-s', i) * 0.3);
      d.updateMatrix();
      s.setMatrixAt(i, d.matrix);
    }
    PADS.forEach(([x, z, size], i) => {
      d.position.set(x * water, 0.07, z * water);
      d.rotation.set(0, i * 1.3, 0);
      d.scale.set(size, 1, size);
      d.updateMatrix();
      p.setMatrixAt(i, d.matrix);
    });
    s.instanceMatrix.needsUpdate = true;
    p.instanceMatrix.needsUpdate = true;
    s.computeBoundingSphere();
    p.computeBoundingSphere();
  }, [r, water]);

  return (
    <group position={[center[0], 0, center[1]]}>
      <mesh position-y={0.03} receiveShadow>
        <cylinderGeometry args={[water + 0.1, water + 0.1, 0.06, 48]} />
        <meshStandardMaterial color="#bfe3f5" roughness={0.25} />
      </mesh>
      <instancedMesh ref={stones} args={[stoneGeo, undefined, STONES]} castShadow receiveShadow>
        <meshStandardMaterial color="#ded8e6" flatShading roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={pads} args={[padGeo, undefined, PADS.length]} receiveShadow>
        <meshStandardMaterial color="#9fd49a" roughness={0.8} />
      </instancedMesh>
      <mesh position={[PADS[0]![0] * water, 0.14, PADS[0]![1] * water]} castShadow>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color="#ffc4d6" roughness={0.7} />
      </mesh>
    </group>
  );
}
