import { useEffect, useMemo } from 'react';
import type { Vec2 } from '@4this/shared';
import { TABLE_TOP } from './furniture';
import { labelTexture } from './signTexture';

/** 두 팩에 없는 가구는 코드로 만든다: 칠판·교탁·층 표지판·큰 테이블 */

interface Placed {
  /** 바닥 위 자리 (x, y, z). y는 바닥 높이 */
  pos: readonly [number, number, number];
  /** 앞면(+z)이 보는 방향 */
  rotY: number;
}

/** 칠판: 초록 판 + 나무 테두리 + 분필 받침. 앞면이 rotY 쪽을 본다 */
export function Blackboard({ pos, rotY, width = 4 }: Placed & { width?: number }) {
  return (
    <group position={pos} rotation-y={rotY}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[width + 0.16, 1.36, 0.06]} />
        <meshStandardMaterial color="#e8c9a6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.6, 0.035]}>
        <planeGeometry args={[width, 1.2]} />
        <meshStandardMaterial color="#7fa894" roughness={0.95} />
      </mesh>
      {[1.95, 1.75, 1.55].map((y, i) => (
        <mesh key={y} position={[-width / 2 + 1 + i * 0.15, y, 0.04]}>
          <planeGeometry args={[1.4 - i * 0.3, 0.05]} />
          <meshBasicMaterial color="#f4f8f2" />
        </mesh>
      ))}
      <mesh position={[0, 0.88, 0.08]} castShadow>
        <boxGeometry args={[width * 0.9, 0.05, 0.12]} />
        <meshStandardMaterial color="#e8c9a6" roughness={0.9} />
      </mesh>
      <mesh position={[0.6, 0.92, 0.08]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.015, 0.015, 0.12, 6]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/** 교탁: 앞면 판 + 윗판 */
export function Lectern({ pos, rotY }: Placed) {
  return (
    <group position={pos} rotation-y={rotY}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 1.1, 0.55]} />
        <meshStandardMaterial color="#e9cfb3" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.13, -0.03]} castShadow>
        <boxGeometry args={[1.12, 0.06, 0.66]} />
        <meshStandardMaterial color="#d8b593" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.6, 0.28]}>
        <boxGeometry args={[0.6, 0.3, 0.02]} />
        <meshStandardMaterial color="#ffb3c7" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** 벽에 붙이는 글자 표지판 ("1학년") */
export function WallSign({
  pos,
  rotY,
  text,
  bg = '#ffb3c7',
  width = 1.4,
}: Placed & { text: string; bg?: string; width?: number }) {
  const tex = useMemo(
    () => labelTexture(text, { bg, fg: '#ffffff', width: 384, height: 128, fontSize: 68 }),
    [text, bg],
  );
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={pos} rotation-y={rotY}>
      <planeGeometry args={[width, width / 3]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

/** 사각 테이블: 윗판 + 다리 4개 */
export function Table({
  center,
  size,
  y,
  color = '#f1d9bf',
  top = TABLE_TOP,
}: {
  center: Vec2;
  size: Vec2;
  y: number;
  color?: string;
  top?: number;
}) {
  const [w, d] = size;
  const legs: Vec2[] = [
    [-w / 2 + 0.1, -d / 2 + 0.1],
    [w / 2 - 0.1, -d / 2 + 0.1],
    [-w / 2 + 0.1, d / 2 - 0.1],
    [w / 2 - 0.1, d / 2 - 0.1],
  ];
  return (
    <group position={[center[0], y, center[1]]}>
      <mesh position-y={top - 0.03} castShadow receiveShadow>
        <boxGeometry args={[w, 0.06, d]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {legs.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, (top - 0.06) / 2, z]} castShadow>
          <boxGeometry args={[0.08, top - 0.06, 0.08]} />
          <meshStandardMaterial color="#d8b593" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
