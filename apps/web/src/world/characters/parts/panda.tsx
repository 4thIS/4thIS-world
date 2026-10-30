import { geo } from '../geometries';
import { useMat } from '../materials';
import { Muzzle } from './common';
import type { AnimalParts, PartProps } from './types';

/** 판다 무늬 색. 색을 바꿔도 무늬는 그대로 */
export const PANDA_INK = '#4f4650';

function Face({ colors }: PartProps) {
  const ink = useMat(PANDA_INK);
  return (
    <>
      <Muzzle colors={colors} />
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* 동그란 검은 귀 */}
          <mesh
            position={[s * 0.36, 0.4, -0.02]}
            scale={[1, 1, 0.6]}
            geometry={geo.sphere(0.15, 16, 12)}
            material={ink}
            castShadow
          />
          {/* 눈 둘레 무늬 (눈보다 살짝 뒤) */}
          <mesh
            position={[s * 0.19, 0.03, 0.4]}
            rotation-z={s * 0.5}
            scale={[0.8, 1.15, 0.5]}
            geometry={geo.sphere(0.12, 14, 10)}
            material={ink}
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

/** 검은 팔 */
function Arm() {
  return (
    <mesh
      position={[0, -0.16, 0]}
      geometry={geo.capsule(0.09, 0.2)}
      material={useMat(PANDA_INK)}
      castShadow
    />
  );
}

export const panda: AnimalParts = { Face, Tail, Arm, footColor: () => PANDA_INK };
