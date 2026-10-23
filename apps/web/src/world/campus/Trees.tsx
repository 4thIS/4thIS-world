import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, CylinderGeometry, IcosahedronGeometry, Object3D, type InstancedMesh } from 'three';
import { rand01 } from '@4this/shared';
import { TREES, type TreeKind } from './layout';

/** 잎 덩어리 4개의 [x, y, z, 반지름] (나무 배율 1 기준) */
const BLOBS: readonly (readonly [number, number, number, number])[] = [
  [0, 1.9, 0, 1],
  [0.5, 1.6, 0.2, 0.7],
  [-0.45, 1.65, -0.25, 0.72],
  [0.1, 2.4, -0.1, 0.65],
];

const LEAF_COLORS: Record<TreeKind, readonly string[]> = {
  cherry: ['#f6c4d4', '#f9d3df', '#f3b8cb'],
  green: ['#a8dba0', '#b5e3ad', '#9fd49a'],
};

/** 로우폴리 나무 (벚꽃·연두). 줄기 1개 + 잎 1개 InstancedMesh */
export function Trees() {
  const trunkGeo = useMemo(() => new CylinderGeometry(0.16, 0.24, 1.4, 8).translate(0, 0.7, 0), []);
  const leafGeo = useMemo(() => new IcosahedronGeometry(1, 1), []);
  const trunks = useRef<InstancedMesh>(null);
  const leaves = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const t = trunks.current;
    const l = leaves.current;
    if (!t || !l) return;
    const d = new Object3D();
    const c = new Color();
    TREES.forEach((tree, i) => {
      const s = tree.scale;
      const turn = rand01('tree', i) * Math.PI * 2;
      d.position.set(tree.pos[0], 0, tree.pos[1]);
      d.rotation.set(0, turn, 0);
      d.scale.setScalar(s);
      d.updateMatrix();
      t.setMatrixAt(i, d.matrix);
      BLOBS.forEach(([x, y, z, r], k) => {
        const cos = Math.cos(turn);
        const sin = Math.sin(turn);
        d.position.set(
          tree.pos[0] + (x * cos + z * sin) * s,
          y * s,
          tree.pos[1] + (z * cos - x * sin) * s,
        );
        d.rotation.set(0, turn + k, 0);
        d.scale.setScalar(r * s);
        d.updateMatrix();
        l.setMatrixAt(i * BLOBS.length + k, d.matrix);
        const colors = LEAF_COLORS[tree.kind];
        l.setColorAt(i * BLOBS.length + k, c.set(colors[(i + k) % colors.length]!));
      });
    });
    t.instanceMatrix.needsUpdate = true;
    l.instanceMatrix.needsUpdate = true;
    if (l.instanceColor) l.instanceColor.needsUpdate = true;
    t.computeBoundingSphere();
    l.computeBoundingSphere();
  }, []);

  return (
    <group>
      <instancedMesh
        ref={trunks}
        args={[trunkGeo, undefined, TREES.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#c9a17c" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={leaves}
        args={[leafGeo, undefined, TREES.length * BLOBS.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial flatShading roughness={0.85} />
      </instancedMesh>
    </group>
  );
}
