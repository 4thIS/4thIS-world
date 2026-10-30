import { geo } from './geometries';
import { useMat } from './materials';

/** 우산 색 (캐릭터마다 phase로 고른다) */
const CANOPY_COLORS = ['#ffb3c7', '#c9bdf2', '#a7dcb6', '#ffe3a3', '#a9cdf0'];

/** 머리 위로 든 우산 (몸 단위). 비·눈 올 때 바깥에서만 그린다 */
export function Umbrella({ phase }: { phase: number }) {
  const canopy = useMat(CANOPY_COLORS[Math.floor(phase) % CANOPY_COLORS.length]!);
  const stick = useMat('#8a7a8f');
  return (
    <group position={[0.32, 0, 0.05]}>
      <mesh position-y={1.55} geometry={geo.cylinder(0.03, 0.03, 1.6, 8)} material={stick} />
      <mesh
        position-y={2.25}
        scale={[1, 0.5, 1]}
        geometry={geo.dome(1, Math.PI / 2)}
        material={canopy}
        castShadow
      />
      <mesh position-y={2.78} geometry={geo.sphere(0.06, 8, 6)} material={stick} />
    </group>
  );
}
