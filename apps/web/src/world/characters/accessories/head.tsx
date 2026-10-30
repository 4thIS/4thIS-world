import type { HEADS } from '@4this/shared';
import { geo } from '../geometries';
import { useMat } from '../materials';

type HeadKind = (typeof HEADS)[number];

/** 머리 악세서리. 머리 중심 기준(몸 단위) */
export function HeadAccessory({ kind }: { kind: HeadKind }) {
  switch (kind) {
    case 'none':
      return null;
    case 'strawHat':
      return <StrawHat />;
    case 'beanie':
      return <Beanie />;
    case 'ribbon':
      return <Ribbon />;
    case 'cap':
      return <Cap />;
    case 'crown':
      return <Crown />;
    case 'flowerPin':
      return <FlowerPin />;
    case 'gradCap':
      return <GradCap />;
    case 'headphones':
      return <Headphones />;
  }
}

function StrawHat() {
  const straw = useMat('#ffe3a3');
  return (
    <group position-y={0.38}>
      <mesh geometry={geo.cylinder(0.62, 0.62, 0.04, 32)} material={straw} castShadow />
      <mesh position-y={0.14} geometry={geo.cylinder(0.32, 0.36, 0.26, 32)} material={straw} />
      <mesh
        position-y={0.05}
        geometry={geo.cylinder(0.365, 0.365, 0.07, 32)}
        material={useMat('#ff9fb6')}
      />
    </group>
  );
}

function Beanie() {
  return (
    <>
      <mesh
        position-y={0.06}
        geometry={geo.dome(0.52, Math.PI * 0.42)}
        material={useMat('#b9d9f7')}
        castShadow
      />
      <mesh
        position-y={0.26}
        rotation-x={Math.PI / 2}
        geometry={geo.torus(0.43, 0.06)}
        material={useMat('#9cc7ef')}
      />
      <mesh position-y={0.6} geometry={geo.ico(0.11)} material={useMat('#ffffff')} />
    </>
  );
}

function Ribbon() {
  const pink = useMat('#ff9fb6');
  return (
    <group position={[0.25, 0.42, 0.1]}>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position-x={s * 0.12}
          rotation-z={s * (Math.PI / 2)}
          geometry={geo.cone(0.12, 0.24, 12)}
          material={pink}
        />
      ))}
      <mesh position-z={0.02} geometry={geo.sphere(0.06, 10, 8)} material={pink} />
    </group>
  );
}

function Cap() {
  const lavender = useMat('#c9bdf2');
  return (
    <>
      <mesh
        position-y={0.08}
        geometry={geo.dome(0.52, Math.PI * 0.38)}
        material={lavender}
        castShadow
      />
      {/* 앞으로 나온 챙 */}
      <mesh
        position={[0, 0.3, 0.34]}
        rotation-x={0.15}
        geometry={geo.halfDisc(0.34, 0.03)}
        material={useMat('#b3a4ea')}
      />
      <mesh position-y={0.6} geometry={geo.sphere(0.05, 10, 8)} material={lavender} />
    </>
  );
}

function Crown() {
  const gold = useMat('#ffd36e', 'glossy');
  return (
    <group position-y={0.44}>
      <mesh geometry={geo.cylinder(0.25, 0.23, 0.12, 24)} material={gold} castShadow />
      {/* 뾰족한 꼭지 다섯 개 + 끝 구슬 */}
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} position={[Math.sin(a) * 0.22, 0.12, Math.cos(a) * 0.22]}>
            <mesh geometry={geo.cone(0.06, 0.14, 8)} material={gold} />
            <mesh position-y={0.09} geometry={geo.sphere(0.03, 8, 6)} material={gold} />
          </group>
        );
      })}
      <mesh
        position={[0, 0, 0.24]}
        geometry={geo.sphere(0.04, 10, 8)}
        material={useMat('#ff7eb6', 'glossy')}
      />
    </group>
  );
}

function FlowerPin() {
  const petal = useMat('#ffc4d8');
  return (
    <group position={[-0.32, 0.36, 0.2]} rotation={[0.3, -0.5, 0.4]}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0]}
            scale={[1, 1, 0.5]}
            geometry={geo.sphere(0.06, 10, 8)}
            material={petal}
          />
        );
      })}
      <mesh position-z={0.02} geometry={geo.sphere(0.04, 10, 8)} material={useMat('#ffe27a')} />
    </group>
  );
}

function GradCap() {
  const navy = useMat('#5b5f86');
  return (
    <>
      <mesh position-y={0.12} geometry={geo.dome(0.5, Math.PI * 0.32)} material={navy} castShadow />
      {/* 납작한 판 + 술 */}
      <group position-y={0.5} rotation-y={Math.PI / 4}>
        <mesh geometry={geo.roundedBox(0.72, 0.04, 0.72, 0.015)} material={navy} castShadow />
        <mesh position-y={0.03} geometry={geo.sphere(0.035, 8, 6)} material={useMat('#ffd36e')} />
        <mesh
          position={[0.34, -0.1, 0]}
          geometry={geo.cylinder(0.012, 0.03, 0.22, 6)}
          material={useMat('#ffd36e')}
        />
      </group>
    </>
  );
}

function Headphones() {
  const band = useMat('#ff9fb6', 'glossy');
  const cup = useMat('#fff6fb');
  return (
    <>
      {/* 머리 위를 넘는 띠 */}
      <mesh
        position-y={0.02}
        geometry={geo.torus(0.54, 0.035, Math.PI)}
        material={band}
        castShadow
      />
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.52, 0, 0]} rotation-z={Math.PI / 2}>
          <mesh geometry={geo.cylinder(0.15, 0.15, 0.1, 20)} material={band} />
          <mesh
            position-y={-s * 0.05}
            geometry={geo.cylinder(0.11, 0.11, 0.02, 20)}
            material={cup}
          />
        </group>
      ))}
    </>
  );
}
