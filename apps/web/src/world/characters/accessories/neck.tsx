import type { NECKS } from '@4this/shared';
import { geo } from '../geometries';
import { useMat } from '../materials';

type NeckKind = (typeof NECKS)[number];

/** 목 악세서리. 몸(body 그룹) 기준(몸 단위). 목은 y ≈ 0.86 */
export function NeckAccessory({ kind }: { kind: NeckKind }) {
  switch (kind) {
    case 'none':
      return null;
    case 'scarf':
      return <Scarf />;
    case 'bowtie':
      return <Bowtie />;
  }
}

function Scarf() {
  const mint = useMat('#a8dcc4');
  return (
    <group position-y={0.86}>
      <mesh rotation-x={Math.PI / 2} geometry={geo.torus(0.3, 0.08)} material={mint} castShadow />
      {/* 앞으로 늘어진 끝자락 */}
      <mesh
        position={[0.14, -0.16, 0.3]}
        rotation-z={0.15}
        geometry={geo.roundedBox(0.13, 0.28, 0.05, 0.025)}
        material={useMat('#8fd0b2')}
      />
    </group>
  );
}

function Bowtie() {
  const pink = useMat('#ff9fb6');
  return (
    <group position={[0, 0.86, 0.36]}>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position-x={s * 0.08}
          rotation-z={s * (Math.PI / 2)}
          geometry={geo.cone(0.07, 0.15, 10)}
          material={pink}
        />
      ))}
      <mesh geometry={geo.sphere(0.04, 10, 8)} material={useMat('#ff7f9e')} />
    </group>
  );
}
