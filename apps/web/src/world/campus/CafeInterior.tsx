import { useMemo } from 'react';
import { CAMPUS } from '@4this/shared';
import { floorY, SLAB_LIFT, WALL_T } from './buildingGeometry';
import { BoxInstances, Parasol, Tables } from './CodeProps';
import {
  centroid,
  chairAt,
  chunk,
  facingPairs,
  facingSeat,
  TABLE_TOP,
  tableBetween,
} from './furniture';
import { TERRACE } from './layout';
import { Model, type ModelItem } from './models';

const b = CAMPUS.buildings.cafe;
/** 카운터 가운데 x (서쪽 벽에서 바리스타 설 자리만큼 띄움) */
const COUNTER_X = b.min[0] + WALL_T + 0.9;
const COUNTER_Z = [8.0, 8.86, 9.72, 10.58, 11.44];
/** 컵 크기 (BoxInstances가 배열 참조로 지오메트리를 메모하므로 모듈 상수로 둔다) */
const CUP_SIZE = [0.1, 0.12, 0.1] as const;

/** 카페 1층: 서쪽 카운터(kitchenBar)·커피머신·스툴, 2인 테이블 4개, 자리마다 컵 */
export function CafeInterior() {
  const place = CAMPUS.places.cafe;
  const y = floorY(1) + SLAB_LIFT;
  const tables = useMemo(() => chunk(place.seats, 2).map((g) => tableBetween(g)), [place]);
  const chairs = useMemo(() => place.seats.map((s) => chairAt(s, y)), [place, y]);
  const cups = useMemo(
    () => place.seats.map((s) => facingSeat(s, 0.35, y + TABLE_TOP)),
    [place, y],
  );
  const counter = useMemo<ModelItem[]>(
    () => COUNTER_Z.map((z) => ({ pos: [COUNTER_X, y, z], rotY: Math.PI / 2 })),
    [y],
  );
  const stools = useMemo<ModelItem[]>(
    () => [8.4, 9.7, 11].map((z) => ({ pos: [COUNTER_X + 0.8, y, z], rotY: -Math.PI / 2 })),
    [y],
  );
  return (
    <group>
      <Tables tables={tables} y={y} color="#f6e1cc" />
      <Model name="chairRounded" items={chairs} />
      <BoxInstances items={cups} size={CUP_SIZE} color="#ffffff" />
      <Model name="kitchenBar" items={counter} />
      <Model
        name="kitchenCoffeeMachine"
        items={[{ pos: [COUNTER_X - 0.05, y + 0.84, COUNTER_Z[0]!], rotY: -Math.PI / 2 }]}
      />
      <Model name="stoolBar" items={stools} />
      <Model name="pottedPlant" items={[{ pos: [b.max[0] - 0.6, y, b.min[1] + 0.6], rotY: 0 }]} />
    </group>
  );
}

/** 테라스 데크 두께. 캐릭터는 바깥 바닥(y = 0)에 서고 앉으므로 얇게 둬서 발이 묻히지 않게 한다 */
const DECK_H = 0.02;

/** 카페 바깥 테라스: 데크 + overflow 앞 4자리에 2인 테이블·의자·파라솔 */
export function CafeTerrace() {
  const pairs = useMemo(() => facingPairs(CAMPUS.places.cafe.overflow), []);
  const chairs = useMemo(() => pairs.flat().map((s) => chairAt(s, DECK_H)), [pairs]);
  const tables = useMemo(() => pairs.map((pair) => tableBetween(pair)), [pairs]);
  const w = TERRACE.max[0] - TERRACE.min[0];
  const d = TERRACE.max[1] - TERRACE.min[1];
  return (
    <group>
      <mesh
        position={[TERRACE.min[0] + w / 2, DECK_H / 2, TERRACE.min[1] + d / 2]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[w, DECK_H, d]} />
        <meshStandardMaterial color="#ecd2b8" roughness={0.9} />
      </mesh>
      <Tables tables={tables} y={DECK_H} color="#f6e1cc" />
      {pairs.map((pair) => {
        const c = centroid(pair);
        return <Parasol key={c.join(',')} pos={[c[0], DECK_H, c[1]]} />;
      })}
      <Model shadows name="chairRounded" items={chairs} />
    </group>
  );
}
