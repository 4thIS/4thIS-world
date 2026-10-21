import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { DEFAULT_LOOK } from '@4this/shared';
import { Campus } from './campus/Campus';
import { Character } from './characters/Character';

/**
 * 3D 월드 진입점 (cw#1 뼈대). cw#3에서 sim이 멤버들을 배치한다.
 */
export function WorldCanvas() {
  return (
    <Canvas shadows camera={{ position: [38, 34, 40], fov: 32 }}>
      <color attach="background" args={['#fbeff6']} />
      <Campus
        now={Date.now()}
        occupiedFloors={new Set()}
        focusedBuilding={null}
        hiddenAboveFloor={null}
      />
      <Character look={DEFAULT_LOOK} pose="idle" name="샘플" />
      <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.42} />
    </Canvas>
  );
}
