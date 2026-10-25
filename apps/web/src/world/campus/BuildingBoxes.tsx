import type { ThreeEvent } from '@react-three/fiber';
import { BUILDING_IDS, CAMPUS, FLOOR_HEIGHT, type BuildingId } from '@4this/shared';

/** 건물 자리 임시 상자 (hm#1). hm#2·hm#3에서 실제 건물로 바꾼다 */
export function BuildingBoxes({
  ids = BUILDING_IDS,
  focusedBuilding,
  onBuildingClick,
}: {
  ids?: readonly BuildingId[];
  focusedBuilding: BuildingId | null;
  onBuildingClick?: (id: BuildingId) => void;
}) {
  return (
    <group>
      {ids.map((id) => {
        const b = CAMPUS.buildings[id];
        const w = b.max[0] - b.min[0];
        const d = b.max[1] - b.min[1];
        const h = b.floors * FLOOR_HEIGHT;
        const click = (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onBuildingClick?.(id);
        };
        return (
          <mesh
            key={id}
            position={[(b.min[0] + b.max[0]) / 2, h / 2, (b.min[1] + b.max[1]) / 2]}
            onClick={click}
          >
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial
              color={focusedBuilding === id ? '#ffb3c7' : '#f9c9d4'}
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
