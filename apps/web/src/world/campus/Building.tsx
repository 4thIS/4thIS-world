import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  DoubleSide,
  LineBasicMaterial,
  MeshStandardMaterial,
  type Material,
  type Mesh,
  type Object3D,
} from 'three';
import { CAMPUS, FLOOR_HEIGHT, type BuildingId, type Vec2 } from '@4this/shared';
import { WALL_SIDES } from './buildingGeometry';
import { BUILDING_STYLES } from './buildingStyles';
import { approach, edgeOpacity, targetOpacity, wallFacesCamera } from './cutaway';
import { doorPoint, WALL_NORMALS, type WallSide } from './layout';
import { buildShell, disposeShell } from './shellGeometry';
import { labelTexture } from './signTexture';

export interface BuildingProps {
  id: BuildingId;
  /** 이 층보다 위층(과 옥상)을 숨긴다. null이면 모두 보임 */
  hiddenAboveFloor: number | null;
  focused: boolean;
  onClick?: (id: BuildingId) => void;
  /** 층마다 실내 가구 (floor는 1부터) */
  interior?: (floor: number) => ReactNode;
  /** 층별 바닥 색 (없으면 건물 기본 바닥 색) */
  floorColors?: Partial<Record<number, string>>;
}

interface SideMaterials {
  wall: MeshStandardMaterial;
  edge: LineBasicMaterial;
  /** glass[floor - 1] */
  glass: MeshStandardMaterial[];
}

const GLASS_OPACITY = 0.45;
/** 이보다 흐린 면(컷어웨이된 벽은 0.1)은 클릭을 통과시킨다 */
const CLICK_MIN_OPACITY = 0.3;

/**
 * 데이터(CAMPUS.buildings[id])로 조립한 건물: 바닥판·외벽(창문 구멍)·문·계단·옥상 난간.
 * 매 프레임 카메라 쪽 벽을 투명하게 하고(컷어웨이) 테두리선만 남긴다.
 */
export function Building({
  id,
  hiddenAboveFloor,
  focused,
  onClick,
  interior,
  floorColors,
}: BuildingProps) {
  const b = CAMPUS.buildings[id];
  const style = BUILDING_STYLES[id];
  const center: Vec2 = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2];
  const door = useMemo(() => doorPoint(b, CAMPUS.graph.nodes[b.doorNode]!), [b]);
  const shell = useMemo(() => buildShell(b, door, style.stairs), [b, door, style]);
  useEffect(() => () => disposeShell(shell), [shell]);

  const mats = useMemo(() => {
    const out = {} as Record<WallSide, SideMaterials>;
    for (const side of WALL_SIDES) {
      out[side] = {
        wall: new MeshStandardMaterial({ color: style.wall, roughness: 0.85, transparent: true }),
        edge: new LineBasicMaterial({ color: style.trim, transparent: true, opacity: 0 }),
        glass: Array.from(
          { length: b.floors },
          () =>
            new MeshStandardMaterial({
              color: '#d6ecfa',
              roughness: 0.2,
              transparent: true,
              opacity: GLASS_OPACITY,
              side: DoubleSide,
              depthWrite: false,
            }),
        ),
      };
    }
    return out;
  }, [b.floors, style]);
  useEffect(
    () => () => {
      for (const side of WALL_SIDES) {
        const m = mats[side];
        [m.wall, m.edge, ...m.glass].forEach((x: Material) => x.dispose());
      }
    },
    [mats],
  );

  const opacity = useRef<Record<WallSide, number>>({ n: 1, e: 1, s: 1, w: 1 });
  useFrame((state, delta) => {
    const cam = state.camera.position;
    const dt = Math.min(delta, 0.1);
    for (const side of WALL_SIDES) {
      const facing = wallFacesCamera(WALL_NORMALS[side], center, [cam.x, cam.z]);
      const cur = approach(opacity.current[side], targetOpacity(facing), dt);
      opacity.current[side] = cur;
      const m = mats[side];
      m.wall.opacity = cur;
      m.wall.depthWrite = cur > 0.99;
      m.edge.opacity = edgeOpacity(cur);
      m.edge.visible = m.edge.opacity > 0.01;
      for (const g of m.glass) g.opacity = GLASS_OPACITY * cur;
    }
  });

  const label = useMemo(
    () => labelTexture(b.name, { bg: style.trim, fg: '#ffffff', width: 384, height: 128 }),
    [b.name, style.trim],
  );
  useEffect(() => () => label.dispose(), [label]);

  const visibleFloor = (floor: number) => hiddenAboveFloor === null || floor <= hiddenAboveFloor;
  const roofY = b.floors * FLOOR_HEIGHT;
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!onClick) return;
    // three/R3F 레이캐스트는 visible을 보지 않는다. 숨긴 층이나 흐려진 벽은
    // 클릭을 가로채지 않고 안쪽 캐릭터·바닥으로 흘려보낸다.
    for (let o: Object3D | null = e.object; o; o = o.parent) {
      if (!o.visible) return;
      if (o === e.eventObject) break;
    }
    const mat = (e.object as Mesh).material as Material | Material[] | undefined;
    const first = Array.isArray(mat) ? mat[0] : mat;
    if (first && first.opacity < CLICK_MIN_OPACITY) return;
    e.stopPropagation();
    onClick(id);
  };

  return (
    <group onClick={click}>
      {Array.from({ length: b.floors }, (_, i) => {
        const floor = i + 1;
        return (
          <group key={floor} visible={visibleFloor(floor)}>
            <mesh geometry={shell.slabs[i]} receiveShadow castShadow>
              <meshStandardMaterial color={floorColors?.[floor] ?? style.floor} roughness={0.9} />
            </mesh>
            {shell.stairs[i] && (
              <mesh geometry={shell.stairs[i]!} receiveShadow castShadow>
                <meshStandardMaterial color={style.trim} roughness={0.85} />
              </mesh>
            )}
            {WALL_SIDES.map((side) => {
              const g = shell.walls[side][i]!;
              return (
                <group key={side}>
                  <mesh geometry={g.wall} material={mats[side].wall} castShadow receiveShadow />
                  <lineSegments geometry={g.outline} material={mats[side].edge} />
                  {g.glass && <mesh geometry={g.glass} material={mats[side].glass[i]} />}
                </group>
              );
            })}
            {interior?.(floor)}
          </group>
        );
      })}
      <mesh geometry={shell.doorFrame} castShadow>
        <meshStandardMaterial color={style.trim} roughness={0.8} />
      </mesh>
      <mesh geometry={shell.roof} visible={hiddenAboveFloor === null} castShadow receiveShadow>
        <meshStandardMaterial color={style.trim} roughness={0.85} />
      </mesh>
      <sprite
        position={[center[0], roofY + (focused ? 2.2 : 1.6), center[1]]}
        scale={focused ? [4.2, 1.4, 1] : [3, 1, 1]}
      >
        <spriteMaterial map={label} transparent depthWrite={false} toneMapped={false} />
      </sprite>
      {focused && <FocusRing min={b.min} max={b.max} color={style.trim} />}
    </group>
  );
}

/** 포커스된 건물 바닥 둘레에서 깜빡이는 띠 */
function FocusRing({ min, max, color }: { min: Vec2; max: Vec2; color: string }) {
  const ref = useRef<Mesh[]>([]);
  useFrame((state) => {
    const o = 0.55 + 0.35 * Math.sin(state.clock.elapsedTime * 3);
    for (const m of ref.current) if (m) (m.material as MeshStandardMaterial).opacity = o;
  });
  const pad = 0.6;
  const x0 = min[0] - pad;
  const x1 = max[0] + pad;
  const z0 = min[1] - pad;
  const z1 = max[1] + pad;
  const t = 0.3;
  const bars: [number, number, number, number][] = [
    [(x0 + x1) / 2, z0, x1 - x0 + t, t],
    [(x0 + x1) / 2, z1, x1 - x0 + t, t],
    [x0, (z0 + z1) / 2, t, z1 - z0],
    [x1, (z0 + z1) / 2, t, z1 - z0],
  ];
  return (
    <group>
      {bars.map(([x, z, w, d], i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) ref.current[i] = m;
          }}
          position={[x, 0.1, z]}
        >
          <boxGeometry args={[w, 0.06, d]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}
