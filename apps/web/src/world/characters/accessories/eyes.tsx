import type { EYES } from '@4this/shared';
import { geo } from '../geometries';
import { useMat } from '../materials';

type EyesKind = (typeof EYES)[number];

/** 눈 악세서리. 머리 중심 기준(몸 단위), 눈은 x = ±0.18, y = 0.04 */
export function EyesAccessory({ kind }: { kind: EyesKind }) {
  const frame = useMat(kind === 'glasses' ? '#9b86c9' : '#4f4766', 'glossy');
  const lens = useMat('#4f4766', 'glossy');
  if (kind === 'none') return null;
  if (kind === 'goggles') return <Goggles />;
  return (
    <>
      {[-0.18, 0.18].map((x) =>
        kind === 'glasses' ? (
          <mesh
            key={x}
            position={[x, 0.04, 0.5]}
            geometry={geo.torus(0.12, 0.018)}
            material={frame}
          />
        ) : (
          <mesh
            key={x}
            position={[x, 0.05, 0.5]}
            geometry={geo.roundedBox(0.27, 0.18, 0.04, 0.06)}
            material={lens}
          />
        ),
      )}
      <mesh
        position={[0, 0.06, 0.52]}
        rotation-z={Math.PI / 2}
        geometry={geo.cylinder(0.015, 0.015, 0.12, 6)}
        material={frame}
      />
    </>
  );
}

/** 스키 고글: 눈 위의 둥근 렌즈 둘 + 머리를 두르는 끈 */
function Goggles() {
  const frame = useMat('#ffa36e', 'glossy');
  const lens = useMat('#a8dcf7', 'glossy');
  return (
    <>
      {[-0.18, 0.18].map((x) => (
        <group key={x} position={[x, 0.05, 0.47]} rotation-x={Math.PI / 2}>
          <mesh geometry={geo.cylinder(0.14, 0.14, 0.08, 20)} material={frame} />
          <mesh position-y={0.042} geometry={geo.cylinder(0.11, 0.11, 0.01, 20)} material={lens} />
        </group>
      ))}
      <mesh
        position-y={0.05}
        rotation-x={Math.PI / 2}
        scale={[1.06, 0.96, 1]}
        geometry={geo.torus(0.5, 0.03)}
        material={useMat('#5b5f86')}
      />
    </>
  );
}
