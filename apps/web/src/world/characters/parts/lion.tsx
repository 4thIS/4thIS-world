import { geo } from '../geometries';
import { useMat } from '../materials';
import { FurArm, Muzzle } from './common';
import type { AnimalParts, PartProps } from './types';

/** 갈기: 얼굴 둘레에 고리 모양으로 놓은 구 14개 + 뒤통수를 덮는 큰 구 */
const MANE_COUNT = 14;
const MANE = Array.from({ length: MANE_COUNT }, (_, i) => {
  const a = (i / MANE_COUNT) * Math.PI * 2;
  return [Math.cos(a) * 0.5, Math.sin(a) * 0.48 + 0.02, -0.1] as const;
});

function Face({ colors }: PartProps) {
  const mane = useMat(colors.mane);
  const fur = useMat(colors.fur);
  return (
    <>
      <Muzzle colors={colors} />
      {MANE.map((p, i) => (
        <mesh key={i} position={p} geometry={geo.sphere(0.17, 12, 10)} material={mane} castShadow />
      ))}
      <mesh
        position={[0, 0.02, -0.22]}
        scale={[1, 1, 0.6]}
        geometry={geo.sphere(0.5, 18, 14)}
        material={mane}
      />
      {/* 갈기 위로 살짝 보이는 둥근 귀 */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.34, 0.44, 0.02]}
          scale={[1, 1, 0.6]}
          geometry={geo.sphere(0.12, 12, 10)}
          material={fur}
        />
      ))}
    </>
  );
}

function Tail({ colors }: PartProps) {
  return (
    <>
      <mesh
        position={[0, 0.12, -0.12]}
        rotation-x={-0.9}
        geometry={geo.capsule(0.04, 0.32)}
        material={useMat(colors.fur)}
        castShadow
      />
      <mesh
        position={[0, 0.27, -0.27]}
        geometry={geo.sphere(0.08, 12, 8)}
        material={useMat(colors.mane)}
      />
    </>
  );
}

export const lion: AnimalParts = { Face, Tail, Arm: FurArm, footColor: (c) => c.dark };
