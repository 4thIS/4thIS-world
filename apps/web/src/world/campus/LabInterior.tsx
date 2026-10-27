import { useMemo } from 'react';
import { CAMPUS } from '@4this/shared';
import { floorY, SLAB_LIFT } from './buildingGeometry';
import { Table } from './CodeProps';
import { chairAt, DESK_TOP, facingSeat, TABLE_TOP, tableBetween } from './furniture';
import { Model, type ModelItem } from './models';

/** 연구동 1F: 불 꺼진 로비 (안내 데스크와 화분만, 바닥은 어둡게 — Building의 floorColors) */
function Lobby() {
  const y = floorY(1) + SLAB_LIFT;
  return (
    <group>
      <Model name="desk" items={[{ pos: [-15, y, -14.2], rotY: Math.PI }]} />
      <Model
        name="pottedPlant"
        items={[
          { pos: [-13.3, y, -11.8], rotY: 0 },
          { pos: [-16.7, y, -11.8], rotY: 0 },
        ]}
      />
    </group>
  );
}

/** 연구동 2F 연구실: 큰 사각 테이블 + 노트북 6대, 책장 파티션, 건너편 교수님 책상 */
function ResearchRoom() {
  const place = CAMPUS.places['lab-2f'];
  const prof = CAMPUS.professorSeat;
  const y = floorY(2) + SLAB_LIFT;
  const table = useMemo(() => tableBetween(place.seats), [place]);
  const chairs = useMemo(() => place.seats.map((s) => chairAt(s, y)), [place, y]);
  const laptops = useMemo(
    () => place.seats.map((s) => facingSeat(s, 0.85, y + TABLE_TOP)),
    [place, y],
  );
  // 교수님 책상 (professorSeat 기준) 위에 모니터·키보드·책
  const profDesk = facingSeat(prof, 0.7, y);
  const profScreen = facingSeat(prof, 0.9, y + DESK_TOP);
  const profKeys = facingSeat(prof, 0.55, y + DESK_TOP);
  const profBooks: ModelItem = {
    pos: [profDesk.pos[0], y + DESK_TOP, profDesk.pos[2] - 0.5],
    rotY: profDesk.rotY,
  };
  // 팀 테이블과 교수님 자리 사이 책장 파티션 (교수님 책상 앞은 비워 둔다), 앞면이 팀 쪽(-x)
  const partitionX = profDesk.pos[0] - 0.65;
  const partition: ModelItem[] = [-18.4, -17.6, -14, -13.2].map((z) => ({
    pos: [partitionX, y, z],
    rotY: -Math.PI / 2,
  }));
  // 남쪽 벽 책장 (넘칠 때 "책장 옆 스탠딩"), 앞면이 북쪽
  const southShelves: ModelItem[] = [-16.3, -14.6].map((x) => ({
    pos: [x, y, -11.45],
    rotY: Math.PI,
  }));
  return (
    <group>
      <Table center={table.center} size={table.size} y={y} />
      <Model name="chairDesk" items={[...chairs, chairAt(prof, y)]} />
      <Model name="laptop" items={laptops} />
      <Model name="desk" items={[profDesk]} />
      <Model name="computerScreen" items={[profScreen]} />
      <Model name="computerKeyboard" items={[profKeys]} shadows={false} />
      <Model name="books" items={[profBooks]} />
      <Model name="bookcaseOpen" items={partition} />
      <Model name="bookcaseClosedWide" items={southShelves} />
      <Model name="pottedPlant" items={[{ pos: [-10.6, y, -18.4], rotY: 0 }]} />
      <Model
        name="plantSmall"
        items={[{ pos: [table.center[0], y + TABLE_TOP, table.center[1]], rotY: 0 }]}
      />
    </group>
  );
}

export function LabInterior({ floor }: { floor: number }) {
  return floor === 1 ? <Lobby /> : <ResearchRoom />;
}
