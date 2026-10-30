import { geo } from '../geometries';
import { useMat } from '../materials';
import { WingArm } from './common';
import type { AnimalParts, PartProps } from './types';

function Face({ colors }: PartProps) {
  return (
    <>
      {/* 얼굴 앞쪽 흰 무늬 (눈 뒤) */}
      <mesh
        position={[0, -0.04, 0.2]}
        scale={[1.05, 0.85, 0.62]}
        geometry={geo.sphere(0.46, 24, 16)}
        material={useMat(colors.belly)}
      />
      {/* 작은 노란 부리 */}
      <mesh
        position={[0, -0.09, 0.5]}
        rotation-x={Math.PI / 2}
        scale={[1.3, 1, 0.7]}
        geometry={geo.cone(0.08, 0.14, 12)}
        material={useMat(colors.beak, 'glossy')}
      />
    </>
  );
}

function Tail({ colors }: PartProps) {
  return (
    <mesh
      position={[0, -0.18, -0.02]}
      rotation-x={-2.4}
      scale={[1.4, 1, 0.5]}
      geometry={geo.cone(0.1, 0.18, 10)}
      material={useMat(colors.dark)}
      castShadow
    />
  );
}

export const penguin: AnimalParts = { Face, Tail, Arm: WingArm, footColor: (c) => c.beak };
