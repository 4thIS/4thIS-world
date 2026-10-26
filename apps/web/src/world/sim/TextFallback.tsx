import { useEffect, useState } from 'react';
import { CAMPUS, sampleAt } from '@4this/shared';
import { useWorld } from '../../store/world';
import { ANIMAL_ICON, describeWhere, formatClock } from './labels';

interface Row {
  id: string;
  icon: string;
  username: string;
  where: string;
}

const card = {
  maxWidth: 480,
  margin: '48px auto',
  padding: 24,
  background: 'var(--card)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow)',
} as const;

/** WebGL을 못 쓸 때: sampleAt 결과로 "누가 어디 있나" 목록 (5초마다 갱신) */
export function TextFallback() {
  const [state, setState] = useState<{ clock: string; rows: Row[] }>({ clock: '', rows: [] });

  useEffect(() => {
    const tick = () => {
      const world = useWorld.getState();
      const t = world.now();
      const plan = world.ensurePlan();
      setState({
        clock: formatClock(t),
        rows: world.members.map((m) => ({
          id: m.id,
          icon: ANIMAL_ICON[m.look.animal],
          username: m.username,
          where: describeWhere(sampleAt(plan, m.id, t), CAMPUS),
        })),
      });
    };
    tick();
    const id = setInterval(tick, 5000);
    const unsub = useWorld.subscribe((s, prev) => {
      if (s.members !== prev.members) tick();
    });
    return () => {
      clearInterval(id);
      unsub();
    };
  }, []);

  return (
    <main style={card}>
      <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>3D 캠퍼스를 표시할 수 없어요</h1>
      <p style={{ margin: '0 0 16px', color: 'var(--ink-soft)' }}>
        이 브라우저는 WebGL을 지원하지 않아 목록으로 보여 드려요. ({state.clock})
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.9 }}>
        {state.rows.map((r) => (
          <li key={r.id}>
            {r.icon} <strong>{r.username}</strong> — {r.where}
          </li>
        ))}
      </ul>
    </main>
  );
}
