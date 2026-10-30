import { useEffect, useState } from 'react';
import { useWorld } from './world';

/**
 * intervalMs마다 지금 시각(서버 기준)으로 다시 렌더한다. 시계·패널처럼 느리게 바뀌는 화면용.
 * 날짜가 바뀌었으면 이때 계획도 새로 만든다. 관리자가 시간을 옮겨 시계가 바뀌면 바로 다시 렌더한다.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => useWorld.getState().now());
  const clock = useWorld((s) => s.clock);
  useEffect(() => {
    const tick = () => {
      useWorld.getState().ensurePlan();
      setNow(useWorld.getState().now());
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, clock]);
  return now;
}
