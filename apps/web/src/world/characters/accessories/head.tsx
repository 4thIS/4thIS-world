import type { HEADS } from '@4this/shared';
import { geo } from '../geometries';
import { useMat } from '../materials';

type HeadKind = (typeof HEADS)[number];

/** 머리 악세서리. 머리 중심 기준(몸 단위) */
export function HeadAccessory({ kind }: { kind: HeadKind }) {
  switch (kind) {
    case 'none':
      return null;
    case 'strawHat':
      return <StrawHat />;
    case 'beanie':
      return <Beanie />;
    case 'ribbon':
      return <Ribbon />;
    case 'cap':
      return <Cap />;
  }
}

function StrawHat() {
  const straw = useMat('#ffe3a3');
  return (
    <group position-y={0.38}>
      <mesh geometry={geo.cylinder(0.62, 0.62, 0.04, 32)} material={straw} castShadow />
      <mesh position-y={0.14} geometry={geo.cylinder(0.32, 0.36, 0.26, 32)} material={straw} />
      <mesh
        position-y={0.05}
        geometry={geo.cylinder(0.365, 0.365, 0.07, 32)}
        material={useMat('#ff9fb6')}
      />
    </group>
  );
}

function Beanie() {
  return (
    <>
      <mesh
        position-y={0.06}
        geometry={geo.dome(0.52, Math.PI * 0.42)}
        material={useMat('#b9d9f7')}
        castShadow
      />
      <mesh
        position-y={0.26}
        rotation-x={Math.PI / 2}
        geometry={geo.torus(0.43, 0.06)}
        material={useMat('#9cc7ef')}
      />
      <mesh position-y={0.6} geometry={geo.ico(0.11)} material={useMat('#ffffff')} />
    </>
  );
}

function Ribbon() {
  const pink = useMat('#ff9fb6');
  return (
    <group position={[0.25, 0.42, 0.1]}>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position-x={s * 0.12}
          rotation-z={s * (Math.PI / 2)}
          geometry={geo.cone(0.12, 0.24, 12)}
          material={pink}
        />
      ))}
      <mesh position-z={0.02} geometry={geo.sphere(0.06, 10, 8)} material={pink} />
    </group>
  );
}

function Cap() {
  const lavender = useMat('#c9bdf2');
  return (
    <>
      <mesh
        position-y={0.08}
        geometry={geo.dome(0.52, Math.PI * 0.38)}
        material={lavender}
        castShadow
      />
      {/* 앞으로 나온 챙 */}
      <mesh
        position={[0, 0.3, 0.34]}
        rotation-x={0.15}
        geometry={geo.halfDisc(0.34, 0.03)}
        material={useMat('#b3a4ea')}
      />
      <mesh position-y={0.6} geometry={geo.sphere(0.05, 10, 8)} material={lavender} />
    </>
  );
}
