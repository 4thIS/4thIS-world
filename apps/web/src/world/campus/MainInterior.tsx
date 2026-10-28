import { useMemo } from 'react';
import { CAMPUS } from '@4this/shared';
import { floorY, SLAB_LIFT, WALL_T } from './buildingGeometry';
import { Blackboard, BoxInstances, Lectern, ServingCounter, Tables, WallSign } from './CodeProps';
import {
  chairAt,
  chunk,
  classroomFurniture,
  facingSeat,
  TABLE_TOP,
  tableBetween,
} from './furniture';
import { Model, type ModelItem } from './models';

const b = CAMPUS.buildings.main;
/** 북쪽 벽 안쪽 면 */
const NORTH = b.min[1] + WALL_T;
const WEST = b.min[0] + WALL_T;
const EAST = b.max[0] - WALL_T;
/** 식판 크기 (BoxInstances가 배열 참조로 지오메트리를 메모하므로 모듈 상수로 둔다) */
const TRAY_SIZE = [0.42, 0.03, 0.3] as const;

/** 본관 1F 식당: 북쪽 배식대(앞에 줄 = overflow), 4인 테이블 4개, 자리마다 식판 */
function Cafeteria() {
  const place = CAMPUS.places['main-1f'];
  const y = floorY(1) + SLAB_LIFT;
  const tables = useMemo(() => chunk(place.seats, 4).map((g) => tableBetween(g)), [place]);
  const chairs = useMemo(() => place.seats.map((s) => chairAt(s, y)), [place, y]);
  const trays = useMemo(
    () => place.seats.map((s) => facingSeat(s, 0.7, y + TABLE_TOP)),
    [place, y],
  );
  return (
    <group>
      <ServingCounter pos={[-3, y, NORTH + 0.4]} rotY={0} length={7} />
      <WallSign pos={[4, y + 2.3, NORTH + 0.02]} rotY={0} text="식당" bg="#f3c98b" />
      <Tables tables={tables} y={y} />
      <Model name="chair" items={chairs} />
      <BoxInstances items={trays} size={TRAY_SIZE} color="#eef0f6" />
      <Model
        name="pottedPlant"
        items={[
          { pos: [WEST + 0.5, y, b.max[1] - 0.7], rotY: 0 },
          { pos: [3, y, NORTH + 0.5], rotY: 0 },
        ]}
      />
      <Model name="trashcan" items={[{ pos: [1.6, y, NORTH + 0.4], rotY: 0 }]} />
    </group>
  );
}

/** 본관 2F 교양강의실: 큰 칠판, 12자리(책상+의자+노트북/PC), 교탁 */
function LectureHall() {
  const place = CAMPUS.places['main-2f'];
  const y = floorY(2) + SLAB_LIFT;
  const f = useMemo(() => classroomFurniture(place.seats, y), [place, y]);
  return (
    <group>
      <Blackboard pos={[0, y, NORTH + 0.03]} rotY={0} width={5.5} />
      <Lectern pos={[0, y, NORTH + 0.9]} rotY={0} />
      <WallSign
        pos={[-5.5, y + 2.35, NORTH + 0.02]}
        rotY={0}
        text="교양강의실"
        bg="#f3c98b"
        width={1.8}
      />
      <Model name="chairDesk" items={f.chairs} />
      <Model name="desk" items={f.desks} />
      <Model name="laptop" items={f.laptops} />
      <Model name="computerScreen" items={f.screens} />
      <Model name="computerKeyboard" items={f.keyboards} />
      <Model name="pottedPlant" items={[{ pos: [WEST + 0.5, y, NORTH + 0.5], rotY: 0 }]} />
    </group>
  );
}

/** 본관 3F 도서관: 벽을 따라 키 큰 책장(사이사이가 넘침 스탠딩), 열람 테이블 2개 + 스탠드 + 책 */
function Library() {
  const place = CAMPUS.places['main-3f'];
  const y = floorY(3) + SLAB_LIFT;
  const tables = useMemo(() => chunk(place.seats, 4).map((g) => tableBetween(g)), [place]);
  const chairs = useMemo(() => place.seats.map((s) => chairAt(s, y)), [place, y]);
  const books = useMemo(
    () => place.seats.map((s) => facingSeat(s, 0.7, y + TABLE_TOP)),
    [place, y],
  );
  const lamps = useMemo<ModelItem[]>(
    () => tables.map((t) => ({ pos: [t.center[0], y + TABLE_TOP, t.center[1]], rotY: 0 })),
    [tables, y],
  );
  // 서쪽 벽 책장 (앞면 +x), 동쪽 벽 책장 (앞면 -x), 북쪽 벽 넓은 책장 (앞면 +z)
  const shelves = useMemo<ModelItem[]>(
    () => [
      ...[-18.2, -16.4, -15.6, -14, -12.2].map((z): ModelItem => ({
        pos: [WEST + 0.25, y, z],
        rotY: Math.PI / 2,
      })),
      ...[-18.2, -16.6].map((z): ModelItem => ({ pos: [EAST - 0.25, y, z], rotY: -Math.PI / 2 })),
    ],
    [y],
  );
  const wide = useMemo<ModelItem[]>(
    () => [-4.8, -1.6, 1.6, 4.8].map((x) => ({ pos: [x, y, NORTH + 0.25], rotY: 0 })),
    [y],
  );
  return (
    <group>
      <WallSign pos={[0, y + 2.45, NORTH + 0.02]} rotY={0} text="도서관" bg="#f3c98b" />
      <Tables tables={tables} y={y} color="#e9d3bb" />
      <Model name="chairRounded" items={chairs} />
      <Model name="books" items={books} />
      <Model name="lampRoundTable" items={lamps} />
      <Model name="bookcaseOpen" items={shelves} />
      <Model name="bookcaseClosedWide" items={wide} />
    </group>
  );
}

export function MainInterior({ floor }: { floor: number }) {
  if (floor === 1) return <Cafeteria />;
  if (floor === 2) return <LectureHall />;
  return <Library />;
}
