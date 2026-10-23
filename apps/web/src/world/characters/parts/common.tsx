import { geo } from '../geometries';
import { useMat } from '../materials';
import type { PartProps } from './types';

/** 털 팔: 어깨에서 아래로 늘어진 캡슐 */
export function FurArm({ colors }: PartProps) {
  return (
    <mesh
      position={[0, -0.16, 0]}
      geometry={geo.capsule(0.09, 0.2)}
      material={useMat(colors.fur)}
      castShadow
    />
  );
}

/** 오리 날개: 납작한 타원 */
export function WingArm({ colors }: PartProps) {
  return (
    <mesh
      position={[0.02, -0.14, -0.04]}
      scale={[0.35, 0.8, 1]}
      geometry={geo.sphere(0.2, 14, 10)}
      material={useMat(colors.dark)}
      castShadow
    />
  );
}

/** 주둥이 + 코 (강아지·고양이·곰·사자) */
export function Muzzle({ colors }: PartProps) {
  return (
    <>
      <mesh
        position={[0, -0.12, 0.42]}
        scale={[1.25, 0.8, 0.7]}
        geometry={geo.sphere(0.17, 16, 12)}
        material={useMat(colors.muzzle)}
      />
      <mesh
        position={[0, -0.07, 0.54]}
        scale={[1.3, 0.9, 1]}
        geometry={geo.sphere(0.055, 12, 8)}
        material={useMat(colors.nose, 'glossy')}
      />
    </>
  );
}
