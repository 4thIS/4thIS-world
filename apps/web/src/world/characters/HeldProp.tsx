import { geo } from './geometries';
import { useMat } from './materials';
import type { HeldProp } from './poses';

/** 오른손(어깨 피벗 기준 손끝 y = -0.3)에 드는 숟가락·컵 */
export function HandProp({ prop }: { prop: HeldProp | null }) {
  const metal = useMat('#dcd6e6', 'glossy');
  const cup = useMat('#ffffff');
  const coffee = useMat('#b98a6a');
  if (prop === 'spoon') {
    return (
      <group position={[0, -0.32, 0.06]} rotation-x={-1.2}>
        <mesh geometry={geo.cylinder(0.012, 0.012, 0.22, 6)} material={metal} />
        <mesh
          position-y={0.12}
          scale={[1, 0.4, 1.3]}
          geometry={geo.sphere(0.035, 10, 8)}
          material={metal}
        />
      </group>
    );
  }
  if (prop === 'cup') {
    return (
      <group position={[0, -0.33, 0.08]}>
        <mesh geometry={geo.cylinder(0.07, 0.06, 0.14, 16)} material={cup} />
        <mesh
          position-y={0.065}
          geometry={geo.cylinder(0.062, 0.062, 0.01, 16)}
          material={coffee}
        />
      </group>
    );
  }
  return null;
}

/** 두 손으로 앞에 펼쳐 든 책. 몸(body 그룹) 기준 */
export function BookProp() {
  const paper = useMat('#fffaf0');
  return (
    <group position={[0, 0.62, 0.48]} rotation-x={-0.5}>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position-x={s * 0.1}
          rotation-y={s * -0.25}
          geometry={geo.roundedBox(0.2, 0.26, 0.03, 0.01)}
          material={paper}
        />
      ))}
      <mesh
        position-z={-0.02}
        geometry={geo.roundedBox(0.42, 0.28, 0.02, 0.01)}
        material={useMat('#c9bdf2')}
      />
    </group>
  );
}
