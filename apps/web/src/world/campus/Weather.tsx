import { useFrame } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import {
  BoxGeometry,
  IcosahedronGeometry,
  Object3D,
  type BufferGeometry,
  type InstancedMesh,
} from 'three';
import { CAMPUS, CAMPUS_HALF, FLOOR_HEIGHT, type BuildingId, type WeatherNow } from '@4this/shared';
import { seededRandom } from './layout';
import { MAX_RAIN, MAX_SNOW, dropCount, snowCover } from './weatherSky';

/** 비·눈이 시작하는 높이 (m). 3층 건물 지붕(9.6 m)보다 위 */
const TOP = 16;
const RAIN_SPEED = 14;
const SNOW_SPEED = 1.6;

/** 건물 지붕 위는 비우고 바깥에만 내린다 (실내에 비가 오지 않게) */
function overBuilding(x: number, z: number): boolean {
  return Object.values(CAMPUS.buildings).some(
    (b) => x > b.min[0] - 0.3 && x < b.max[0] + 0.3 && z > b.min[1] - 0.3 && z < b.max[1] + 0.3,
  );
}

/** 캠퍼스 위 빈 하늘의 결정적 자리들 (x, 시작 높이, z) */
function dropSpots(n: number, seed: string): [number, number, number][] {
  const rand = seededRandom(seed);
  const out: [number, number, number][] = [];
  while (out.length < n) {
    const x = (rand() * 2 - 1) * CAMPUS_HALF;
    const z = (rand() * 2 - 1) * CAMPUS_HALF;
    if (!overBuilding(x, z)) out.push([x, rand() * TOP, z]);
  }
  return out;
}

const RAIN_SPOTS = dropSpots(MAX_RAIN, 'rain');
const SNOW_SPOTS = dropSpots(MAX_SNOW, 'snow');

/** 떨어지는 파티클 하나의 묶음. count개만 그린다 */
function Drops({
  spots,
  count,
  geometry,
  speed,
  color,
  opacity,
  drift,
}: {
  spots: readonly [number, number, number][];
  count: number;
  geometry: BufferGeometry;
  speed: number;
  color: string;
  opacity: number;
  /** 눈: 좌우로 하늘하늘 */
  drift: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  useLayoutEffect(() => {
    if (ref.current) ref.current.count = count;
  }, [count]);

  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh || count === 0) return;
    const t = clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const [x, y0, z] = spots[i]!;
      const y = TOP - ((((TOP - y0 + t * speed) % TOP) + TOP) % TOP);
      const sway = drift ? Math.sin(t * 0.8 + i) * 0.4 : 0;
      dummy.position.set(x + sway, y, z + (drift ? Math.cos(t * 0.6 + i * 1.3) * 0.3 : 0));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, spots.length]} frustumCulled={false}>
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </instancedMesh>
  );
}

/** 눈 쌓인 지붕: 층을 숨긴(컷어웨이) 건물은 빼고 지붕 위에 얇은 흰 판 */
function SnowCaps({ cover, hidden }: { cover: number; hidden: (id: BuildingId) => number | null }) {
  return (
    <group>
      {Object.values(CAMPUS.buildings).map((b) =>
        hidden(b.id) === null ? (
          <mesh
            key={b.id}
            position={[
              (b.min[0] + b.max[0]) / 2,
              b.floors * FLOOR_HEIGHT + 0.12,
              (b.min[1] + b.max[1]) / 2,
            ]}
          >
            <boxGeometry args={[b.max[0] - b.min[0] - 0.2, 0.06, b.max[1] - b.min[1] - 0.2]} />
            <meshStandardMaterial
              color="#fbfcff"
              transparent
              opacity={cover * 0.85}
              depthWrite={false}
            />
          </mesh>
        ) : null,
      )}
    </group>
  );
}

/** 비·눈 파티클과 눈 쌓인 지붕. 날씨가 맑으면 아무것도 그리지 않는다 */
export function Weather({
  weather,
  hidden,
}: {
  weather: WeatherNow | null;
  hidden: (id: BuildingId) => number | null;
}) {
  const rainGeo = useMemo(() => new BoxGeometry(0.035, 0.6, 0.035), []);
  const snowGeo = useMemo(() => new IcosahedronGeometry(0.08, 0), []);
  useEffect(
    () => () => {
      rainGeo.dispose();
      snowGeo.dispose();
    },
    [rainGeo, snowGeo],
  );
  const count = dropCount(weather);
  const cover = snowCover(weather);
  if (!weather || (count === 0 && cover === 0)) return null;
  return (
    <group>
      {weather.kind === 'rain' && (
        <Drops
          spots={RAIN_SPOTS}
          count={count}
          geometry={rainGeo}
          speed={RAIN_SPEED}
          color="#9fbde6"
          opacity={0.7}
          drift={false}
        />
      )}
      {weather.kind === 'snow' && (
        <Drops
          spots={SNOW_SPOTS}
          count={count}
          geometry={snowGeo}
          speed={SNOW_SPEED}
          color="#ffffff"
          opacity={0.9}
          drift
        />
      )}
      {cover > 0 && <SnowCaps cover={cover} hidden={hidden} />}
    </group>
  );
}
