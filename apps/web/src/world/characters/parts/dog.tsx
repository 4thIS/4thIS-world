import { geo } from '../geometries';
import { useMat } from '../materials';
import { FurArm, Muzzle } from './common';
import type { AnimalParts, PartProps } from './types';

function Face({ colors }: PartProps) {
  const dark = useMat(colors.dark);
  return (
    <>
      <Muzzle colors={colors} />
      {/* 늘어진 귀 */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.47, -0.02, -0.02]}
          rotation-z={s * 0.35}
          scale={[0.55, 1.15, 0.45]}
          geometry={geo.sphere(0.2, 16, 12)}
          material={dark}
          castShadow
        />
      ))}
    </>
  );
}

function Tail({ colors }: PartProps) {
  return (
    <mesh
      position={[0, 0.15, -0.04]}
      rotation-x={-0.7}
      geometry={geo.capsule(0.07, 0.22)}
      material={useMat(colors.dark)}
      castShadow
    />
  );
}

export const dog: AnimalParts = { Face, Tail, Arm: FurArm, footColor: (c) => c.dark };
