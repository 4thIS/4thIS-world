import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useState, type ReactNode } from 'react';
import type { Group } from 'three';
import type { Look } from '@4this/shared';
import { Character } from '../../world/characters/Character';
import { ANIMAL_EMOJI } from '../../world/characters/labels';
import { hasWebGL } from '../../world/sim/webgl';

/** 자식을 천천히 돌린다 */
function Turntable({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.6;
  });
  return <group ref={group}>{children}</group>;
}

/**
 * 꾸미기 화면의 작은 3D 미리보기. 캐릭터가 천천히 돈다.
 * WebGL이 없으면 Canvas가 앱 전체를 멈추므로 이모지로 대신한다 (설계 문서 §10)
 */
export function LookPreview({ look }: { look: Look }) {
  const [webgl] = useState(hasWebGL);

  if (!webgl) {
    return (
      <div className="ui-preview ui-preview--flat" aria-hidden="true">
        <span className="ui-preview__emoji">{ANIMAL_EMOJI[look.animal]}</span>
        <p className="ui-note">3D 미리보기를 표시할 수 없어요</p>
      </div>
    );
  }

  return (
    <div className="ui-preview" aria-hidden="true">
      <Canvas
        shadows
        camera={{ position: [0, 1.1, 3], fov: 30 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.55, 0)}
      >
        <hemisphereLight args={['#fff6fb', '#c9e8c4', 1.4]} />
        <directionalLight position={[3, 5, 4]} intensity={1.8} castShadow />
        <Turntable>
          <Character look={look} pose="idle" />
        </Turntable>
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <circleGeometry args={[0.9, 40]} />
          <meshStandardMaterial color="#f6e3ef" />
        </mesh>
      </Canvas>
    </div>
  );
}
