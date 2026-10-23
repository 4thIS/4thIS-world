import { geo } from '../geometries';
import { useMat } from '../materials';
import { WingArm } from './common';
import type { AnimalParts, PartProps } from './types';

function Face({ colors }: PartProps) {
  return (
    <>
      {/* 납작한 부리 */}
      <mesh
        position={[0, -0.1, 0.48]}
        scale={[1.3, 0.45, 0.9]}
        geometry={geo.sphere(0.17, 16, 10)}
        material={useMat(colors.beak, 'glossy')}
      />
      {/* 정수리 깃털 */}
      <mesh
        position={[0, 0.52, 0]}
        rotation-y={Math.PI / 2}
        geometry={geo.torus(0.08, 0.025, Math.PI * 1.4)}
        material={useMat(colors.fur)}
      />
    </>
  );
}

function Tail({ colors }: PartProps) {
  return (
    <mesh
      position={[0, 0, -0.04]}
      rotation-x={-2.2}
      geometry={geo.cone(0.14, 0.28, 10)}
      material={useMat(colors.fur)}
      castShadow
    />
  );
}

export const duck: AnimalParts = { Face, Tail, Arm: WingArm, footColor: (c) => c.beak };
