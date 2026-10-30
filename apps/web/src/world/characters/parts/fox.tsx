import { geo } from '../geometries';
import { useMat } from '../materials';
import { FurArm, Muzzle } from './common';
import type { AnimalParts, PartProps } from './types';

function Face({ colors }: PartProps) {
  const fur = useMat(colors.fur);
  const dark = useMat(colors.dark);
  const white = useMat(colors.belly);
  return (
    <>
      <Muzzle colors={colors} />
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* 크고 뾰족한 귀, 끝은 진하게 */}
          <mesh
            position={[s * 0.3, 0.47, 0]}
            rotation-z={-s * 0.28}
            geometry={geo.cone(0.18, 0.34, 4)}
            material={fur}
            castShadow
          />
          <mesh
            position={[s * 0.345, 0.6, 0]}
            rotation-z={-s * 0.28}
            geometry={geo.cone(0.075, 0.12, 4)}
            material={dark}
          />
          <mesh
            position={[s * 0.3, 0.45, 0.07]}
            rotation-z={-s * 0.28}
            geometry={geo.cone(0.09, 0.18, 4)}
            material={white}
          />
        </group>
      ))}
    </>
  );
}

/** 끝이 흰 큰 꼬리 */
function Tail({ colors }: PartProps) {
  return (
    <group rotation-x={-0.9}>
      <mesh
        position={[0, 0, -0.2]}
        scale={[0.75, 0.75, 1.5]}
        geometry={geo.sphere(0.17, 14, 10)}
        material={useMat(colors.fur)}
        castShadow
      />
      <mesh
        position={[0, 0, -0.42]}
        scale={[0.7, 0.7, 0.9]}
        geometry={geo.sphere(0.11, 12, 8)}
        material={useMat(colors.belly)}
      />
    </group>
  );
}

export const fox: AnimalParts = { Face, Tail, Arm: FurArm, footColor: (c) => c.dark };
