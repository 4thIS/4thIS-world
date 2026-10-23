import { geo } from '../geometries';
import { useMat } from '../materials';
import { FurArm, Muzzle } from './common';
import type { AnimalParts, PartProps } from './types';

function Face({ colors }: PartProps) {
  const dark = useMat(colors.dark);
  const inner = useMat(colors.innerEar);
  return (
    <>
      <Muzzle colors={colors} />
      {/* 동그란 귀 */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh
            position={[s * 0.36, 0.4, -0.02]}
            scale={[1, 1, 0.6]}
            geometry={geo.sphere(0.15, 16, 12)}
            material={dark}
            castShadow
          />
          <mesh
            position={[s * 0.36, 0.4, 0.05]}
            scale={[1, 1, 0.4]}
            geometry={geo.sphere(0.08, 12, 8)}
            material={inner}
          />
        </group>
      ))}
    </>
  );
}

function Tail({ colors }: PartProps) {
  return (
    <mesh
      position={[0, -0.1, -0.02]}
      geometry={geo.sphere(0.1, 12, 8)}
      material={useMat(colors.fur)}
      castShadow
    />
  );
}

export const bear: AnimalParts = { Face, Tail, Arm: FurArm, footColor: (c) => c.dark };
