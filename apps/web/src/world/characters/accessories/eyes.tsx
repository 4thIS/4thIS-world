import type { EYES } from '@4this/shared';
import { geo } from '../geometries';
import { useMat } from '../materials';

type EyesKind = (typeof EYES)[number];

/** 눈 악세서리. 머리 중심 기준(몸 단위), 눈은 x = ±0.18, y = 0.04 */
export function EyesAccessory({ kind }: { kind: EyesKind }) {
  const frame = useMat(kind === 'glasses' ? '#9b86c9' : '#4f4766', 'glossy');
  const lens = useMat('#4f4766', 'glossy');
  if (kind === 'none') return null;
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
