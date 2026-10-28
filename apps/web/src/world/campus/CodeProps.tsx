import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { BoxGeometry, DoubleSide, Object3D, type InstancedMesh } from 'three';
import type { Vec2 } from '@4this/shared';
import { TABLE_TOP, type TableBox } from './furniture';
import { itemMatrix, type ModelItem } from './models';
import { labelTexture } from './signTexture';

/**
 * 두 팩에 없는 가구는 코드로 만든다: 칠판·교탁·층 표지판·테이블·배식대·식판·파라솔.
 * 실내 소품은 그림자를 만들지 않는다(벽·바닥판이 만든다). 그림자 패스 드로우콜을 줄이기 위해서다.
 */

interface Placed {
  /** 바닥 위 자리 (x, y, z). y는 바닥 높이 */
  pos: readonly [number, number, number];
  /** 앞면(+z)이 보는 방향 */
  rotY: number;
}

/** 칠판: 초록 판 + 나무 테두리 + 분필 받침. 앞면이 rotY 쪽을 본다 */
export function Blackboard({ pos, rotY, width = 4 }: Placed & { width?: number }) {
  return (
    <group position={pos} rotation-y={rotY}>
      <mesh position={[0, 1.6, 0]}>
        <boxGeometry args={[width + 0.16, 1.36, 0.06]} />
        <meshStandardMaterial color="#e8c9a6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.6, 0.035]}>
        <planeGeometry args={[width, 1.2]} />
        <meshStandardMaterial color="#7fa894" roughness={0.95} />
      </mesh>
      {[1.95, 1.75, 1.55].map((y, i) => (
        <mesh key={y} position={[-width / 2 + 1 + i * 0.15, y, 0.04]}>
          <planeGeometry args={[1.4 - i * 0.3, 0.05]} />
          <meshBasicMaterial color="#f4f8f2" />
        </mesh>
      ))}
      <mesh position={[0, 0.88, 0.08]}>
        <boxGeometry args={[width * 0.9, 0.05, 0.12]} />
        <meshStandardMaterial color="#e8c9a6" roughness={0.9} />
      </mesh>
      <mesh position={[0.6, 0.92, 0.08]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.015, 0.015, 0.12, 6]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/** 교탁: 앞면 판 + 윗판 */
export function Lectern({ pos, rotY }: Placed) {
  return (
    <group position={pos} rotation-y={rotY}>
      <mesh position={[0, 0.55, 0]} receiveShadow>
        <boxGeometry args={[1, 1.1, 0.55]} />
        <meshStandardMaterial color="#e9cfb3" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.13, -0.03]}>
        <boxGeometry args={[1.12, 0.06, 0.66]} />
        <meshStandardMaterial color="#d8b593" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.6, 0.28]}>
        <boxGeometry args={[0.6, 0.3, 0.02]} />
        <meshStandardMaterial color="#ffb3c7" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** 벽에 붙이는 글자 표지판 ("1학년") */
export function WallSign({
  pos,
  rotY,
  text,
  bg = '#ffb3c7',
  width = 1.4,
}: Placed & { text: string; bg?: string; width?: number }) {
  const tex = useMemo(
    () => labelTexture(text, { bg, fg: '#ffffff', width: 384, height: 128, fontSize: 68 }),
    [text, bg],
  );
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={pos} rotation-y={rotY}>
      <planeGeometry args={[width, width / 3]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

/** 사각 테이블 여러 개: 윗판 InstancedMesh 1개 + 다리 InstancedMesh 1개 */
export function Tables({
  tables,
  y,
  color = '#f1d9bf',
  top = TABLE_TOP,
}: {
  tables: readonly TableBox[];
  y: number;
  color?: string;
  top?: number;
}) {
  const unit = useMemo(() => new BoxGeometry(1, 1, 1), []);
  useEffect(() => () => unit.dispose(), [unit]);
  const tops = useRef<InstancedMesh>(null);
  const legs = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const t = tops.current;
    const l = legs.current;
    if (!t || !l) return;
    const d = new Object3D();
    tables.forEach((tb, i) => {
      const [w, dd] = tb.size;
      d.position.set(tb.center[0], y + top - 0.03, tb.center[1]);
      d.scale.set(w, 0.06, dd);
      d.updateMatrix();
      t.setMatrixAt(i, d.matrix);
      const corners: Vec2[] = [
        [-w / 2 + 0.1, -dd / 2 + 0.1],
        [w / 2 - 0.1, -dd / 2 + 0.1],
        [-w / 2 + 0.1, dd / 2 - 0.1],
        [w / 2 - 0.1, dd / 2 - 0.1],
      ];
      corners.forEach(([x, z], k) => {
        d.position.set(tb.center[0] + x, y + (top - 0.06) / 2, tb.center[1] + z);
        d.scale.set(0.08, top - 0.06, 0.08);
        d.updateMatrix();
        l.setMatrixAt(i * 4 + k, d.matrix);
      });
    });
    t.instanceMatrix.needsUpdate = true;
    l.instanceMatrix.needsUpdate = true;
    t.computeBoundingSphere();
    l.computeBoundingSphere();
  }, [tables, y, top]);
  return (
    <group key={tables.length}>
      <instancedMesh ref={tops} args={[unit, undefined, tables.length]} receiveShadow>
        <meshStandardMaterial color={color} roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={legs} args={[unit, undefined, tables.length * 4]}>
        <meshStandardMaterial color="#d8b593" roughness={0.9} />
      </instancedMesh>
    </group>
  );
}

/** 같은 상자를 여러 자리에 (식판·책 더미 등). pos의 y는 상자 바닥 */
export function BoxInstances({
  items,
  size,
  color,
}: {
  items: readonly ModelItem[];
  size: readonly [number, number, number];
  color: string;
}) {
  const geometry = useMemo(
    () => new BoxGeometry(size[0], size[1], size[2]).translate(0, size[1] / 2, 0),
    [size],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    items.forEach((item, i) => mesh.setMatrixAt(i, itemMatrix(item)));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  return (
    <instancedMesh
      key={items.length}
      ref={ref}
      args={[geometry, undefined, items.length]}
      receiveShadow
    >
      <meshStandardMaterial color={color} roughness={0.8} />
    </instancedMesh>
  );
}

/** 식당 배식대: 하부장 + 윗판 + 유리 가림막 + 반찬통. 앞면(+z)이 줄 선 쪽 */
export function ServingCounter({ pos, rotY, length }: Placed & { length: number }) {
  const pots = Math.max(1, Math.floor(length / 0.9));
  return (
    <group position={pos} rotation-y={rotY}>
      <mesh position={[0, 0.45, 0]} receiveShadow>
        <boxGeometry args={[length, 0.9, 0.7]} />
        <meshStandardMaterial color="#f6d7c3" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.92, 0]}>
        <boxGeometry args={[length + 0.1, 0.05, 0.8]} />
        <meshStandardMaterial color="#e9e4ef" roughness={0.4} />
      </mesh>
      <mesh position={[0, 1.25, 0.32]}>
        <boxGeometry args={[length, 0.6, 0.02]} />
        <meshStandardMaterial color="#d6ecfa" transparent opacity={0.4} roughness={0.2} />
      </mesh>
      {Array.from({ length: pots }, (_, i) => (
        <mesh key={i} position={[-length / 2 + (length / pots) * (i + 0.5), 1.02, -0.05]}>
          <cylinderGeometry args={[0.2, 0.18, 0.16, 16]} />
          <meshStandardMaterial
            color={['#ffd9c2', '#fff1a8', '#cdeedd', '#ffd6e2'][i % 4]}
            roughness={0.6}
          />
        </mesh>
      ))}
    </group>
  );
}

/** 테라스 파라솔: 기둥 + 원뿔 지붕 */
export function Parasol({
  pos,
  color = '#ffb3c7',
}: {
  pos: readonly [number, number, number];
  color?: string;
}) {
  return (
    <group position={pos}>
      <mesh position-y={1.2} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 2.4, 8]} />
        <meshStandardMaterial color="#f4f0ea" roughness={0.7} />
      </mesh>
      <mesh position-y={2.3} castShadow>
        <coneGeometry args={[0.72, 0.4, 12, 1, true]} />
        <meshStandardMaterial color={color} roughness={0.8} side={DoubleSide} />
      </mesh>
    </group>
  );
}
