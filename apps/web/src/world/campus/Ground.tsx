import { useMemo } from 'react';
import { ExtrudeGeometry, Shape } from 'three';
import { BOARD_CORNER, BOARD_HALF } from './layout';

function roundedRect(half: number, r: number): Shape {
  const s = new Shape();
  const x = -half;
  const y = -half;
  const w = half * 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + w - r);
  s.quadraticCurveTo(x + w, y + w, x + w - r, y + w);
  s.lineTo(x + r, y + w);
  s.quadraticCurveTo(x, y + w, x, y + w - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

const BEVEL = 0.3;

/** 둥근 판 한 겹. top은 윗면 높이 */
function Slab({
  half,
  depth,
  color,
  top,
}: {
  half: number;
  depth: number;
  color: string;
  top: number;
}) {
  const geometry = useMemo(() => {
    const g = new ExtrudeGeometry(roundedRect(half - BEVEL, BOARD_CORNER), {
      depth,
      bevelEnabled: true,
      bevelSize: BEVEL,
      bevelThickness: BEVEL,
      bevelSegments: 3,
      curveSegments: 10,
    });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [half, depth]);
  // 돌린 뒤 윗면은 y = depth + BEVEL
  return (
    <mesh geometry={geometry} position-y={top - depth - BEVEL} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

/** 디오라마 판: 잔디 윗면(y = 0) 아래로 흙 띠와 흙 단면이 보인다 */
export function Ground() {
  return (
    <group>
      <Slab half={BOARD_HALF} depth={0.5} color="#bfe6b4" top={0} />
      <Slab half={BOARD_HALF - 0.15} depth={0.5} color="#d9b38e" top={-0.9} />
      <Slab half={BOARD_HALF - 0.35} depth={1.6} color="#e7c9a9" top={-1.9} />
    </group>
  );
}
