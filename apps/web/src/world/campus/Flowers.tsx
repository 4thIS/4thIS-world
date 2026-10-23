import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, CylinderGeometry, Object3D, SphereGeometry, type InstancedMesh } from 'three';
import type { Vec2 } from '@4this/shared';
import { FLOWER_BEDS, scatterInDisc } from './layout';

const PETALS = ['#ffb3c7', '#fff1a8', '#c9bdf2', '#ffd4b3', '#ffffff'];

/** 꽃밭: 줄기 1개 + 꽃송이 1개 InstancedMesh */
export function Flowers() {
  const spots = useMemo<Vec2[]>(
    () =>
      FLOWER_BEDS.flatMap((bed, i) => scatterInDisc(bed.center, bed.r, bed.count, `flower-${i}`)),
    [],
  );
  const stemGeo = useMemo(() => new CylinderGeometry(0.02, 0.02, 0.3, 4).translate(0, 0.15, 0), []);
  const headGeo = useMemo(() => new SphereGeometry(0.11, 8, 6), []);
  const stems = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const s = stems.current;
    const h = heads.current;
    if (!s || !h) return;
    const d = new Object3D();
    const c = new Color();
    spots.forEach(([x, z], i) => {
      d.position.set(x, 0, z);
      d.updateMatrix();
      s.setMatrixAt(i, d.matrix);
      d.position.set(x, 0.32, z);
      d.updateMatrix();
      h.setMatrixAt(i, d.matrix);
      h.setColorAt(i, c.set(PETALS[i % PETALS.length]!));
    });
    s.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
    if (h.instanceColor) h.instanceColor.needsUpdate = true;
    s.computeBoundingSphere();
    h.computeBoundingSphere();
  }, [spots]);

  return (
    <group>
      <instancedMesh ref={stems} args={[stemGeo, undefined, spots.length]}>
        <meshStandardMaterial color="#8fc98a" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[headGeo, undefined, spots.length]} castShadow>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </group>
  );
}
