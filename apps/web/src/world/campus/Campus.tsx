import { BUILDING_IDS, CAMPUS, CAMPUS_HALF, FLOOR_HEIGHT } from '@4this/shared';
import type { CampusProps } from '../contracts';

/**
 * 임시 캠퍼스 (cw#1): 잔디 바닥 + 건물 자리 상자. hm#1~#4에서 실제 캠퍼스로 바꾼다.
 */
export function Campus({ onBuildingClick }: CampusProps) {
  return (
    <group>
      <ambientLight intensity={0.8} />
      <directionalLight position={[20, 30, 10]} intensity={1.5} castShadow />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[CAMPUS_HALF * 2, CAMPUS_HALF * 2]} />
        <meshStandardMaterial color="#cdeec4" />
      </mesh>
      {BUILDING_IDS.map((id) => {
        const b = CAMPUS.buildings[id];
        const w = b.max[0] - b.min[0];
        const d = b.max[1] - b.min[1];
        const h = b.floors * FLOOR_HEIGHT;
        return (
          <mesh
            key={id}
            position={[(b.min[0] + b.max[0]) / 2, h / 2, (b.min[1] + b.max[1]) / 2]}
            onClick={() => onBuildingClick?.(id)}
          >
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color="#f9c9d4" transparent opacity={0.35} />
          </mesh>
        );
      })}
    </group>
  );
}
