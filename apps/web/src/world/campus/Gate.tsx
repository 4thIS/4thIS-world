import { useEffect, useMemo } from 'react';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CAMPUS } from '@4this/shared';
import { GATE_Z, MAIN_ROAD_WIDTH } from './layout';
import { labelTexture } from './signTexture';

const PILLAR_X = MAIN_ROAD_WIDTH / 2 + 0.7;

/** 정문 아치 + "4thIS 캠퍼스" 간판. 앞(+z, 바깥)과 뒤(-z, 캠퍼스 안) 양쪽에 간판을 붙인다 */
export function Gate() {
  const x = CAMPUS.graph.nodes[CAMPUS.gateNode]![0];
  const pillarGeo = useMemo(() => new RoundedBoxGeometry(0.8, 3.6, 0.8, 3, 0.14), []);
  const beamGeo = useMemo(() => new RoundedBoxGeometry(PILLAR_X * 2 + 1, 0.7, 0.6, 3, 0.18), []);
  const sign = useMemo(
    () => labelTexture('4thIS 캠퍼스', { bg: '#ffffff', fg: '#7a5b8c', width: 640, height: 128 }),
    [],
  );
  useEffect(() => () => sign.dispose(), [sign]);

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
      {[1, -1].map((side) => (
        <mesh key={side} position={[0, 3.1, side * 0.31]} rotation-y={side > 0 ? 0 : Math.PI}>
          <planeGeometry args={[3.6, 0.72]} />
          <meshBasicMaterial map={sign} transparent toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
