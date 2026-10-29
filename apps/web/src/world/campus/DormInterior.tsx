import { useMemo } from 'react';
import { CAMPUS, type PlaceId, type Seat } from '@4this/shared';
import { BED_HEIGHT } from '../characters/poses';
import { floorY, SLAB_LIFT, WALL_T } from './buildingGeometry';
import { BoxInstances, Tables } from './CodeProps';
import { chairAt, chunk, forward, tableBetween } from './furniture';
import { Model, type ModelItem } from './models';

/** 침대 크기 (m). 길이는 발끝 방향(facing) */
const BED_LEN = 2;
const BED_W = 0.95;
const FRAME_H = BED_HEIGHT - 0.15;
/** 머리가 침대 밖으로 나오지 않게 침대를 머리 쪽으로 조금 민다 */
const HEAD_SHIFT = 0.15;

/** BoxInstances가 크기 배열 참조로 지오메트리를 메모하므로 모듈 상수로 둔다 */
const FRAME = [BED_LEN, FRAME_H, BED_W] as const;
const MATTRESS = [BED_LEN - 0.1, 0.15, BED_W - 0.06] as const;
const PILLOW = [0.35, 0.1, 0.6] as const;
const BLANKET = [1.1, 0.05, BED_W - 0.02] as const;
const TV = [0.12, 0.7, 1.3] as const;
const TV_STAND = [0.45, 0.5, 1.4] as const;
/** TV는 동쪽 벽 가운데쯤 */
const TV_X = CAMPUS.buildings.dorm.max[0] - WALL_T - 0.3;
const TV_Z = 11;

/** 자리(누운 사람의 발끝 방향 facing) → 침대 부품 위치. 침대는 x축(동서)으로 놓인다 */
function bedParts(seats: readonly Seat[], y: number) {
  const frames: ModelItem[] = [];
  const mattresses: ModelItem[] = [];
  const pillows: ModelItem[] = [];
  const blankets: ModelItem[] = [];
  for (const s of seats) {
    const [fx, fz] = forward(s.facing);
    const cx = s.pos[0] - fx * HEAD_SHIFT;
    const cz = s.pos[1] - fz * HEAD_SHIFT;
    frames.push({ pos: [cx, y, cz], rotY: 0 });
    mattresses.push({ pos: [cx, y + FRAME_H, cz], rotY: 0 });
    pillows.push({ pos: [cx - fx * 0.75, y + BED_HEIGHT, cz - fz * 0.75], rotY: 0 });
    blankets.push({ pos: [cx + fx * 0.4, y + BED_HEIGHT, cz + fz * 0.4], rotY: 0 });
  }
  return { frames, mattresses, pillows, blankets };
}

/** 기숙사 1층 휴게실: 4인 테이블 두 개·의자, 동쪽 벽 TV, 화분 */
function Lounge({ y }: { y: number }) {
  const b = CAMPUS.buildings.dorm;
  const place = CAMPUS.places['dorm-1f'];
  const tables = useMemo(() => chunk(place.seats, 4).map((g) => tableBetween(g)), [place]);
  const chairs = useMemo(() => place.seats.map((s) => chairAt(s, y)), [place, y]);
  const tv = useMemo(
    () => ({
      stand: [{ pos: [TV_X, y, TV_Z], rotY: 0 }] as ModelItem[],
      screen: [{ pos: [TV_X + 0.1, y + 0.6, TV_Z], rotY: 0 }] as ModelItem[],
      plants: [
        { pos: [b.min[0] + 0.7, y, b.min[1] + 0.7], rotY: 0 },
        { pos: [b.max[0] - 0.7, y, b.min[1] + 0.7], rotY: 0 },
      ] as ModelItem[],
    }),
    [b, y],
  );
  return (
    <group>
      <Tables tables={tables} y={y} color="#f3e3f6" />
      <Model name="chairRounded" items={chairs} />
      <BoxInstances items={tv.stand} size={TV_STAND} color="#d9c8ee" />
      <BoxInstances items={tv.screen} size={TV} color="#4a4458" />
      <Model name="pottedPlant" items={tv.plants} />
    </group>
  );
}

/** 기숙사 침실: 침대 6개 + 간이침대(넘침 자리) */
function Bedroom({ floor, y }: { floor: number; y: number }) {
  const place = CAMPUS.places[`dorm-${floor}f` as PlaceId];
  const beds = useMemo(() => bedParts([...place.seats, ...place.overflow], y), [place, y]);
  return (
    <group>
      <BoxInstances items={beds.frames} size={FRAME} color="#e8cfb4" />
      <BoxInstances items={beds.mattresses} size={MATTRESS} color="#ffffff" />
      <BoxInstances items={beds.pillows} size={PILLOW} color="#fde2ea" />
      <BoxInstances items={beds.blankets} size={BLANKET} color="#c9bdf2" />
    </group>
  );
}

/** 기숙사 n층: 1층 휴게실, 2·3층 침실 */
export function DormInterior({ floor }: { floor: number }) {
  const y = floorY(floor) + SLAB_LIFT;
  return floor === 1 ? <Lounge y={y} /> : <Bedroom floor={floor} y={y} />;
}
