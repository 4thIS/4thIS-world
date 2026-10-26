import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { Group } from 'three';
import { CAMPUS, professorAt } from '@4this/shared';
import { useWorld } from '../../store/world';
import { Character } from '../characters/Character';
import { PROFESSOR_LOOK } from '../contracts';
import { professorLine } from './labels';
import { HIDDEN_DISPLAY, displayOf, sameDisplay, type DisplayState } from './motion';
import { PROFESSOR_NAME, hiddenByCutaway } from './occupancy';

/** 말풍선이 떠 있는 시간 */
const BUBBLE_MS = 4000;

const bubbleStyle = {
  background: 'var(--card)',
  color: 'var(--ink)',
  padding: '6px 12px',
  borderRadius: 'var(--radius)',
  boxShadow: 'var(--shadow)',
  whiteSpace: 'nowrap',
  fontSize: 13,
  pointerEvents: 'none',
} as const;

/** 사자 교수님 NPC: 평일 09–18시 연구동 2F. 누르면 말풍선 한 줄 (§6.4) */
export function Professor() {
  const ref = useRef<Group>(null);
  const shown = useRef<DisplayState>(HIDDEN_DISPLAY);
  const clicks = useRef(0);
  const [display, setDisplay] = useState<DisplayState>(HIDDEN_DISPLAY);
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    if (!line) return;
    const id = setTimeout(() => setLine(null), BUBBLE_MS);
    return () => clearTimeout(id);
  }, [line]);

  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const world = useWorld.getState();
    const pose = professorAt(world.now(), CAMPUS);
    const hidden =
      pose !== null && hiddenByCutaway(pose, world.focusedBuilding, world.hiddenAboveFloor, CAMPUS);
    const next = displayOf(pose, hidden);
    if (!sameDisplay(next, shown.current)) {
      shown.current = next;
      setDisplay(next);
    }
    group.visible = next.visible;
    if (pose) {
      group.position.set(...pose.position);
      group.rotation.y = pose.facing;
    }
  });

  const onClick = () => {
    setLine(professorLine(useWorld.getState().now(), clicks.current++));
  };

  return (
    <group ref={ref} visible={false}>
      <Character
        look={PROFESSOR_LOOK}
        pose={display.pose}
        name={PROFESSOR_NAME}
        status={display.status}
        opacity={display.opacity}
        onClick={onClick}
      />
      {line && display.visible && (
        <Html position={[0, 2.4, 0]} center>
          <div style={bubbleStyle}>{line}</div>
        </Html>
      )}
    </group>
  );
}
