import { useEffect, useMemo } from 'react';
import { SRGBColorSpace, TextureLoader } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CAMPUS } from '@4this/shared';
import { GATE_Z, MAIN_ROAD_WIDTH } from './layout';

const PILLAR_X = MAIN_ROAD_WIDTH / 2 + 0.7;
/** 로고 간판 판 (로고 비율 약 3.36:1). 기둥 사이(안쪽 폭 3.8 m)에 들어간다 */
const BOARD_W = 3.6;
const BOARD_H = 1.08;
const BOARD_D = 0.7;
const LOGO_URL = '/brand/logo-wide.png';

/** 정문 아치 + 4thIS-world 로고 간판. 앞(+z, 바깥)과 뒤(-z, 캠퍼스 안) 양쪽에 로고를 붙인다 */
export function Gate() {
  const x = CAMPUS.graph.nodes[CAMPUS.gateNode]![0];
  const pillarGeo = useMemo(() => new RoundedBoxGeometry(0.8, 3.6, 0.8, 3, 0.14), []);
  const beamGeo = useMemo(() => new RoundedBoxGeometry(PILLAR_X * 2 + 1, 0.7, 0.6, 3, 0.18), []);
  const boardGeo = useMemo(() => new RoundedBoxGeometry(BOARD_W, BOARD_H, BOARD_D, 3, 0.16), []);
  // Suspense 없이 불러온다. 다 받기 전에는 흰 판만 보인다
  const logo = useMemo(() => {
    const tex = new TextureLoader().load(LOGO_URL);
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => () => logo.dispose(), [logo]);

  return (
    <group position={[x, 0, GATE_Z]}>
      {[-PILLAR_X, PILLAR_X].map((px) => (
        <group key={px} position-x={px}>
          <mesh geometry={pillarGeo} position-y={1.8} castShadow receiveShadow>
            <meshStandardMaterial color="#fde2ea" roughness={0.85} />
          </mesh>
          <mesh position-y={3.85} castShadow>
            <sphereGeometry args={[0.46, 16, 12]} />
            <meshStandardMaterial color="#ffb3c7" roughness={0.8} />
          </mesh>
        </group>
      ))}
      <mesh geometry={beamGeo} position-y={3.1} castShadow receiveShadow>
        <meshStandardMaterial color="#c9bdf2" roughness={0.85} />
      </mesh>
      <mesh geometry={boardGeo} position-y={3.2} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh
          key={side}
          position={[0, 3.2, side * (BOARD_D / 2 + 0.01)]}
          rotation-y={side > 0 ? 0 : Math.PI}
        >
          <planeGeometry args={[BOARD_W - 0.16, (BOARD_W - 0.16) / 3.36]} />
          <meshBasicMaterial map={logo} transparent toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
