import { geo } from '../geometries';
import { useMat } from '../materials';
import { FurArm, Muzzle } from './common';
import type { AnimalParts, PartProps } from './types';

function Face({ colors }: PartProps) {
  const fur = useMat(colors.fur);
  const inner = useMat(colors.innerEar);
  const ink = useMat(colors.ink);
  return (
    <>
      <Muzzle colors={colors} />
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* 뾰족 귀 + 안쪽 분홍 */}
          <mesh
            position={[s * 0.28, 0.45, 0]}
            rotation-z={-s * 0.3}
            geometry={geo.cone(0.16, 0.3, 4)}
            material={fur}
            castShadow
          />
          <mesh
            position={[s * 0.28, 0.43, 0.07]}
            rotation-z={-s * 0.3}
            geometry={geo.cone(0.08, 0.16, 4)}
            material={inner}
          />
          {/* 수염 두 가닥 */}
          {[0, 1].map((k) => (
            <mesh
              key={k}
              position={[s * 0.3, -0.12 + k * 0.05, 0.47]}
              rotation-z={Math.PI / 2 + s * (k ? 0.15 : -0.05)}
              geometry={geo.cylinder(0.006, 0.006, 0.26, 4)}
              material={ink}
            />
          ))}
        </group>
      ))}
    </>
  );
}

function Tail({ colors }: PartProps) {
  return <mesh geometry={geo.catTail()} material={useMat(colors.fur)} castShadow />;
}

export const cat: AnimalParts = { Face, Tail, Arm: FurArm, footColor: (c) => c.dark };
