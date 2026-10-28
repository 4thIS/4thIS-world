import { useMemo } from 'react';
import { CAMPUS, rand01 } from '@4this/shared';
import { BUSHES, lampSpots, pathSegments, TRASH_CANS } from './layout';
import { Model, type ModelItem } from './models';

/** KayKit 바깥 소품: 벤치(benchSpots 자리 그대로), 가로등(길 따라), 덤불, 쓰레기통 */
export function OutdoorProps() {
  const benches = useMemo<ModelItem[]>(
    () => CAMPUS.benchSpots.map((s) => ({ pos: [s.pos[0], 0, s.pos[1]], rotY: s.facing })),
    [],
  );
  const lamps = useMemo<ModelItem[]>(
    () =>
      lampSpots(pathSegments(CAMPUS), CAMPUS).map((l) => ({
        pos: [l.pos[0], 0, l.pos[1]],
        rotY: l.rotY,
      })),
    [],
  );
  const bushes = useMemo<ModelItem[]>(
    () =>
      BUSHES.map((p, i) => ({
        pos: [p[0], 0, p[1]],
        rotY: rand01('bush', i) * Math.PI * 2,
        scale: 0.85 + rand01('bush-s', i) * 0.3,
      })),
    [],
  );
  const trash = useMemo<ModelItem[]>(
    () => TRASH_CANS.map((p, i) => ({ pos: [p[0], 0, p[1]], rotY: i * 1.1 })),
    [],
  );
  return (
    <group>
      <Model shadows name="bench" items={benches} />
      <Model shadows name="streetlight" items={lamps} />
      <Model shadows name="bush" items={bushes} />
      <Model shadows name="trash" items={trash} />
    </group>
  );
}
