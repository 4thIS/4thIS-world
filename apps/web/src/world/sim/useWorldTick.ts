import { useEffect, useState } from 'react';
import { CAMPUS } from '@4this/shared';
import { useWorld } from '../../store/world';
import type { FloorKey } from '../contracts';
import { occupiedFloors, sameFloors, snapshotAt } from './occupancy';

/** Campus에 넘기는 느린 값: 하늘용 시각(10초마다)과 사람이 있는 층(2초마다, 바뀔 때만) */
export function useWorldTick(): { now: number; occupied: ReadonlySet<FloorKey> } {
  const [state, setState] = useState(() => ({
    now: useWorld.getState().now(),
    occupied: new Set<FloorKey>() as ReadonlySet<FloorKey>,
  }));

  useEffect(() => {
    const tick = () => {
      const world = useWorld.getState();
      const t = world.now();
      const occupied = occupiedFloors(
        snapshotAt(world.ensurePlan(), world.members, t, CAMPUS),
        CAMPUS,
      );
      setState((prev) => {
        const nowChanged = Math.abs(t - prev.now) >= 10_000;
        const floorsChanged = !sameFloors(prev.occupied, occupied);
        if (!nowChanged && !floorsChanged) return prev;
        return {
          now: nowChanged ? t : prev.now,
          occupied: floorsChanged ? occupied : prev.occupied,
        };
      });
    };
    tick();
    const id = setInterval(tick, 2000);
    const unsub = useWorld.subscribe((s, prev) => {
      if (s.members !== prev.members) tick();
    });
    return () => {
      clearInterval(id);
      unsub();
    };
  }, []);

  return state;
}
