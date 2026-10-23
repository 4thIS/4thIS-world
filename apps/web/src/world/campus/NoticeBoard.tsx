import { useEffect, useMemo } from 'react';
import { CAMPUS } from '@4this/shared';
import { labelTexture } from './signTexture';

const NOTES: readonly (readonly [x: number, y: number, color: string, tilt: number])[] = [
  [-0.55, 1.75, '#fff1a8', 0.08],
  [0.05, 1.8, '#ffd6e2', -0.06],
  [0.6, 1.72, '#cfe6fb', 0.05],
  [-0.3, 1.32, '#cdeedd', -0.04],
  [0.35, 1.3, '#e2dcf3', 0.07],
];

/**
 * 정문 옆 외부 일정 게시판 (CAMPUS.boardPos). 앞면이 남쪽(정문 쪽)을 보고 큰길 쪽으로 조금 돌아 있다.
 * 모델만 그린다. 클릭은 cw가 같은 자리(boardPos)에 두는 투명 클릭 영역(BoardHotspot)이 받는다.
 */
export function NoticeBoard() {
  const [x, z] = CAMPUS.boardPos;
  const header = useMemo(
    () => labelTexture('📋 게시판', { bg: '#ffb3c7', fg: '#ffffff', width: 384, height: 112 }),
    [],
  );
  useEffect(() => () => header.dispose(), [header]);

  return (
    <group position={[x, 0, z]} rotation-y={-0.35}>
      {[-0.95, 0.95].map((px) => (
        <mesh key={px} position={[px, 1.1, -0.02]} castShadow>
          <boxGeometry args={[0.14, 2.2, 0.14]} />
          <meshStandardMaterial color="#c9a17c" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 1.15, 0.1]} />
        <meshStandardMaterial color="#e8c9a6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.55, 0.051]}>
        <planeGeometry args={[1.7, 0.98]} />
        <meshStandardMaterial color="#fbf3e4" roughness={0.95} />
      </mesh>
      {NOTES.map(([nx, ny, color, tilt]) => (
        <mesh key={`${nx},${ny}`} position={[nx, ny, 0.056]} rotation-z={tilt}>
          <planeGeometry args={[0.42, 0.32]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 2.38, 0.02]}>
        <planeGeometry args={[1.2, 0.35]} />
        <meshBasicMaterial map={header} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}
