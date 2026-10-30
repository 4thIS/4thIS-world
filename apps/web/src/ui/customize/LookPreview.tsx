import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, useState, type ReactNode, type RefObject } from 'react';
import type { Group } from 'three';
import type { Look } from '@4this/shared';
import { Character } from '../../world/characters/Character';
import { ANIMAL_EMOJI } from '../../world/characters/labels';
import { hasWebGL } from '../../world/sim/webgl';
import { INITIAL_TURN, drag, grab, release, tick, type TurnState } from './turntable';

/** 자식을 돌린다 (각도는 turn이 정한다) */
function Turntable({ turn, children }: { turn: RefObject<TurnState>; children: ReactNode }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    turn.current = tick(turn.current, delta);
    if (group.current) group.current.rotation.y = turn.current.angle;
  });
  return <group ref={group}>{children}</group>;
}

/**
 * 꾸미기 화면의 작은 3D 미리보기. 캐릭터가 천천히 돌고, 잡고 좌우로 끌면 그 방향으로 돌린다.
 * WebGL이 없으면 Canvas가 앱 전체를 멈추므로 이모지로 대신한다 (설계 문서 §10)
 */
export function LookPreview({ look }: { look: Look }) {
  const [webgl] = useState(hasWebGL);
  const turn = useRef<TurnState>(INITIAL_TURN);

  if (!webgl) {
    return (
      <div className="ui-preview ui-preview--flat" aria-hidden="true">
        <span className="ui-preview__emoji">{ANIMAL_EMOJI[look.animal]}</span>
        <p className="ui-note">3D 미리보기를 표시할 수 없어요</p>
      </div>
    );
  }

  return (
    <div
      className="ui-preview ui-preview--turn"
      aria-hidden="true"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        turn.current = grab(turn.current, e.clientX);
      }}
      onPointerMove={(e) => {
        turn.current = drag(turn.current, e.clientX);
      }}
      onPointerUp={() => {
        turn.current = release(turn.current);
      }}
      onPointerCancel={() => {
        turn.current = release(turn.current);
      }}
    >
      <Canvas
        shadows
        camera={{ position: [0, 1.1, 3], fov: 30 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.55, 0)}
      >
        <hemisphereLight args={['#fff6fb', '#c9e8c4', 1.4]} />
        <directionalLight position={[3, 5, 4]} intensity={1.8} castShadow />
        <Turntable turn={turn}>
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
