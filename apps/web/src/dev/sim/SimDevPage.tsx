import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { demoMembers, kstDate, kstMidnight, toMinutes } from '@4this/shared';
import { useWorld } from '../../store/world';
import { WorldCanvas } from '../../world/WorldCanvas';
import { UiRoot } from '../../ui/UiRoot';

/**
 * 시뮬레이션 개발 페이지 (?dev=sim). 서버 없이 가짜 멤버로 월드를 돌려 본다.
 *   ?dev=sim&n=30          멤버 수 (기본 30)
 *   ?dev=sim&at=12:00      오늘 KST 이 시각부터 시작
 *   ?dev=sim&speed=60      시계를 60배로 (1초에 1분)
 */
const params = new URLSearchParams(window.location.search);
const count = Number(params.get('n') ?? 30);
const speed = Number(params.get('speed') ?? 1);
const at = params.get('at');

/** 0.5초마다 평균 FPS를 DOM에 직접 쓴다 (React 렌더 없이) */
function FpsProbe({ target }: { target: RefObject<HTMLSpanElement | null> }) {
  const acc = useRef({ frames: 0, time: 0 });
  useFrame((_, dt) => {
    acc.current.frames++;
    acc.current.time += dt;
    if (acc.current.time >= 0.5 && target.current) {
      target.current.textContent = `${Math.round(acc.current.frames / acc.current.time)} fps`;
      acc.current = { frames: 0, time: 0 };
    }
  });
  return null;
}

const badge = {
  position: 'fixed',
  left: 12,
  bottom: 12,
  padding: '6px 12px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--card)',
  boxShadow: 'var(--shadow)',
  fontSize: 13,
} as const;

export function SimDevPage() {
  const [ready, setReady] = useState(false);
  const fps = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const world = useWorld.getState();
    world.setWorld({ serverTime: Date.now(), members: demoMembers(count) });
    if (at || speed !== 1) {
      const start = at ? kstMidnight(kstDate(Date.now())) + toMinutes(at) * 60_000 : Date.now();
      world.setClock(start, speed);
      world.ensurePlan();
    }
    setReady(true);
  }, []);

  if (!ready) return null;
  return (
    <div className="app">
      <WorldCanvas autoLoad={false}>
        <FpsProbe target={fps} />
      </WorldCanvas>
      <UiRoot />
      <div style={badge}>
        {count}명 · ×{speed} · <span ref={fps}>… fps</span>
      </div>
    </div>
  );
}
