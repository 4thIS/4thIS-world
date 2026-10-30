import { geo } from '../geometries';
import { useMat } from '../materials';
import { FurArm } from './common';
import type { AnimalParts, PartProps } from './types';

function Face({ colors }: PartProps) {
  const fur = useMat(colors.fur);
  const inner = useMat(colors.innerEar);
  return (
    <>
      {/* 작은 주둥이 + 분홍 코 */}
      <mesh
        position={[0, -0.13, 0.42]}
        scale={[1.2, 0.75, 0.6]}
        geometry={geo.sphere(0.13, 14, 10)}
        material={useMat(colors.muzzle)}
      />
      <mesh
        position={[0, -0.08, 0.52]}
        scale={[1.3, 0.9, 1]}
        geometry={geo.sphere(0.04, 10, 8)}
        material={useMat(colors.nose, 'glossy')}
      />
      {/* 길게 선 귀 + 안쪽 분홍 */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.17, 0.42, -0.02]} rotation-z={-s * 0.12}>
          <mesh
            position-y={0.28}
            scale={[1, 1, 0.55]}
            geometry={geo.capsule(0.09, 0.42)}
            material={fur}
            castShadow
          />
          <mesh
            position={[0, 0.28, 0.035]}
            scale={[1, 1, 0.3]}
            geometry={geo.capsule(0.05, 0.34)}
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
      position={[0, -0.08, -0.03]}
      geometry={geo.ico(0.12)}
      material={useMat(colors.belly)}
      castShadow
    />
  );
}

export const rabbit: AnimalParts = { Face, Tail, Arm: FurArm, footColor: (c) => c.fur };
