import { Stats } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { CAMPUS, type Vec2 } from '@4this/shared';

/** 캐릭터 30명 대신 걷는 캡슐 (캐릭터와 비슷하게 각자 메시 2개 = 드로우콜 2개) */
export function CapsuleCrowd({ count = 30 }: { count?: number }) {
  const routes = useMemo(() => {
    const nodes = CAMPUS.graph.nodes;
    return Array.from({ length: count }, (_, i) => {
      const [a, b] = CAMPUS.graph.edges[i % CAMPUS.graph.edges.length]!;
      return { a: nodes[a]!, b: nodes[b]!, phase: i * 0.37, speed: 0.08 + (i % 5) * 0.02 };
    });
  }, [count]);
  const refs = useRef<(Group | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    routes.forEach((r, i) => {
      const g = refs.current[i];
      if (!g) return;
      const k = (Math.sin(t * r.speed * 2 + r.phase) + 1) / 2;
      const p: Vec2 = [r.a[0] + (r.b[0] - r.a[0]) * k, r.a[1] + (r.b[1] - r.a[1]) * k];
      g.position.set(p[0], Math.abs(Math.sin(t * 8 + i)) * 0.08, p[1]);
    });
  });
  return (
    <group>
      {routes.map((r, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
        >
          <mesh position-y={0.6} castShadow>
            <capsuleGeometry args={[0.3, 0.5, 4, 12]} />
            <meshStandardMaterial color="#f6dcc0" />
          </mesh>
          <mesh position-y={1.35} castShadow>
            <sphereGeometry args={[0.32, 16, 12]} />
            <meshStandardMaterial color="#fff1a8" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 드로우콜·삼각형 수를 DOM에 0.5초마다 적는다 (data-testid="perf-info") */
export function RenderInfo() {
  const gl = useThree((s) => s.gl);
  const last = useRef(0);
  useFrame((state) => {
    if (state.clock.elapsedTime - last.current < 0.5) return;
    last.current = state.clock.elapsedTime;
    const el = document.querySelector('[data-testid="perf-info"]');
    if (el) {
      const r = gl.info.render;
      el.textContent = `드로우콜 ${r.calls} · 삼각형 ${r.triangles}`;
    }
  });
  return null;
}

/** ?perf=1 일 때 Canvas 안에 넣는다: FPS 패널 + 렌더 정보 + 캡슐 30개 */
export function PerfTools() {
  return (
    <>
      <Stats />
      <RenderInfo />
      <CapsuleCrowd />
    </>
  );
}
