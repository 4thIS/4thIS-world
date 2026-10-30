import type { NECKS } from '@4this/shared';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Group } from 'three';
import { geo } from '../geometries';
import { useMat } from '../materials';

type NeckKind = (typeof NECKS)[number];

/** 목 악세서리. 몸(body 그룹) 기준(몸 단위). 목은 y ≈ 0.86 */
export function NeckAccessory({ kind }: { kind: NeckKind }) {
  switch (kind) {
    case 'none':
      return null;
    case 'scarf':
      return <Scarf />;
    case 'bowtie':
      return <Bowtie />;
    case 'necktie':
      return <Necktie />;
    case 'cape':
      return <Cape />;
    case 'backpack':
      return <Backpack />;
  }
}

function Scarf() {
  const mint = useMat('#a8dcc4');
  return (
    <group position-y={0.86}>
      <mesh rotation-x={Math.PI / 2} geometry={geo.torus(0.3, 0.08)} material={mint} castShadow />
      {/* 앞으로 늘어진 끝자락 */}
      <mesh
        position={[0.14, -0.16, 0.3]}
        rotation-z={0.15}
        geometry={geo.roundedBox(0.13, 0.28, 0.05, 0.025)}
        material={useMat('#8fd0b2')}
      />
    </group>
  );
}

function Bowtie() {
  const pink = useMat('#ff9fb6');
  return (
    <group position={[0, 0.86, 0.36]}>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position-x={s * 0.08}
          rotation-z={s * (Math.PI / 2)}
          geometry={geo.cone(0.07, 0.15, 10)}
          material={pink}
        />
      ))}
      <mesh geometry={geo.sphere(0.04, 10, 8)} material={useMat('#ff7f9e')} />
    </group>
  );
}

function Necktie() {
  const blue = useMat('#7fa7e0');
  return (
    <>
      {/* 매듭 */}
      <mesh position={[0, 0.84, 0.3]} geometry={geo.sphere(0.055, 10, 8)} material={blue} />
      {/* 배를 따라 늘어진 넥타이 */}
      <mesh
        position={[0, 0.64, 0.41]}
        rotation-x={-0.35}
        geometry={geo.roundedBox(0.12, 0.34, 0.03, 0.03)}
        material={blue}
      />
      <mesh
        position={[0, 0.64, 0.43]}
        rotation-x={-0.35}
        geometry={geo.roundedBox(0.12, 0.05, 0.02, 0.01)}
        material={useMat('#ffffff')}
      />
    </>
  );
}

/** 등 뒤 망토: 목에서 아래로 퍼지는 납작한 원뿔대. 살랑살랑 흔들린다 */
function Cape() {
  const swing = useRef<Group>(null);
  useFrame(({ clock }) => {
    if (swing.current) swing.current.rotation.x = 0.12 + Math.sin(clock.elapsedTime * 2.4) * 0.05;
  });
  return (
    <group position={[0, 0.92, -0.2]}>
      <mesh
        position-z={0.08}
        rotation-x={Math.PI / 2}
        geometry={geo.torus(0.26, 0.035)}
        material={useMat('#ffd36e')}
      />
      <group ref={swing}>
        <mesh
          position={[0, -0.36, -0.16]}
          scale={[1, 1, 0.3]}
          geometry={geo.cylinder(0.26, 0.5, 0.72, 28)}
          material={useMat('#ff8fa3')}
          castShadow
        />
      </group>
    </group>
  );
}

function Backpack() {
  const bag = useMat('#ffd36e');
  const strap = useMat('#e8b54d');
  return (
    <>
      <mesh
        position={[0, 0.62, -0.42]}
        geometry={geo.roundedBox(0.44, 0.46, 0.2, 0.08)}
        material={bag}
        castShadow
      />
      {/* 앞주머니 */}
      <mesh
        position={[0, 0.54, -0.53]}
        geometry={geo.roundedBox(0.28, 0.2, 0.06, 0.03)}
        material={strap}
      />
      {/* 어깨끈 */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.2, 0.68, -0.02]}
          rotation-y={Math.PI / 2}
          scale={[1.45, 1, 1]}
          geometry={geo.torus(0.27, 0.025)}
          material={strap}
        />
      ))}
    </>
  );
}
