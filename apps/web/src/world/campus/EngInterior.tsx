import { useMemo } from 'react';
import { CAMPUS, type PlaceId } from '@4this/shared';
import { floorY, SLAB_LIFT, WALL_T } from './buildingGeometry';
import { Blackboard, Lectern, WallSign } from './CodeProps';
import { centroid, classroomFurniture } from './furniture';
import { Model } from './models';

/** 공학관 n층 강의실: 북쪽 벽 칠판·교탁·"n학년" 표지판, 좌석마다 책상+의자+노트북/PC */
export function EngInterior({ floor }: { floor: number }) {
  const b = CAMPUS.buildings.eng;
  const place = CAMPUS.places[`eng-${floor}f` as PlaceId];
  const y = floorY(floor) + SLAB_LIFT;
  const f = useMemo(() => classroomFurniture(place.seats, y), [place, y]);
  const cx = centroid(place.seats)[0];
  // 북쪽 벽 안쪽 면
  const wallZ = b.min[1] + WALL_T;

  return (
    <group>
      <Blackboard pos={[cx, y, wallZ + 0.03]} rotY={0} width={4.2} />
      <Lectern pos={[cx, y, b.min[1] + 1.9]} rotY={0} />
      <WallSign pos={[b.min[0] + 1.3, y + 2.35, wallZ + 0.02]} rotY={0} text={`${floor}학년`} />
      <Model name="chairDesk" items={f.chairs} />
      <Model name="desk" items={f.desks} />
      <Model name="laptop" items={f.laptops} />
      <Model name="computerScreen" items={f.screens} />
      <Model name="computerKeyboard" items={f.keyboards} />
      <Model
        name="pottedPlant"
        items={[
          { pos: [b.min[0] + 0.6, y, b.min[1] + 0.6], rotY: 0 },
          { pos: [b.max[0] - 0.6, y, b.min[1] + 0.6], rotY: 0 },
        ]}
      />
      <Model name="trashcan" items={[{ pos: [b.min[0] + 0.5, y, b.max[1] - 0.6], rotY: 0 }]} />
    </group>
  );
}
