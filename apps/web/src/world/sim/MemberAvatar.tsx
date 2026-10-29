import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { Group } from 'three';
import { ADMIN_ID, CAMPUS, type PublicMember } from '@4this/shared';
import { useRealtime } from '../../store/realtime';
import { useSession } from '../../store/session';
import { useWeather } from '../../store/weather';
import { useWorld } from '../../store/world';
import { Character } from '../characters/Character';
import {
  FACING_RATE,
  HIDDEN_DISPLAY,
  dampAngle,
  displayOf,
  sameDisplay,
  stepPosition,
  type DisplayState,
} from './motion';
import { hiddenByCutaway } from './occupancy';
import { registerMember } from './registry';
import { resolvePose } from './resolvePose';
import { needsUmbrella } from './umbrella';

/**
 * 멤버 한 명. 매 프레임 resolvePose → ref의 위치·방향을 부드럽게 맞춘다.
 * 포즈·이름표·투명도는 바뀔 때만 React state로 올린다 (매 프레임 setState 금지).
 */
export function MemberAvatar({ member }: { member: PublicMember }) {
  const ref = useRef<Group>(null);
  const placed = useRef(false);
  const shown = useRef<DisplayState>(HIDDEN_DISPLAY);
  const [display, setDisplay] = useState<DisplayState>(HIDDEN_DISPLAY);
  const umbrellaOn = useRef(false);
  const [umbrella, setUmbrella] = useState(false);
  // 관리자 세션이면 관리자 캐릭터가 내 캐릭터다
  const isMe = useSession(
    (s) =>
      (s.session.kind === 'member' && s.session.me.id === member.id) ||
      (s.session.kind === 'admin' && member.id === ADMIN_ID),
  );
  const focusMember = useWorld((s) => s.focusMember);
  const emote = useRealtime((s) => s.emotes[member.id] ?? null);

  useEffect(() => {
    registerMember(member.id, ref.current);
    return () => registerMember(member.id, null);
  }, [member.id]);

  useFrame((_, dt) => {
    const group = ref.current;
    if (!group) return;
    const world = useWorld.getState();
    const pose = resolvePose(member.id, world.now());
    const hidden =
      pose !== null && hiddenByCutaway(pose, world.focusedBuilding, world.hiddenAboveFloor, CAMPUS);
    const next = displayOf(pose, hidden);
    if (!sameDisplay(next, shown.current)) {
      shown.current = next;
      setDisplay(next);
    }
    group.visible = next.visible;
    const u = pose !== null && needsUmbrella(pose, useWeather.getState().now?.kind ?? null);
    if (u !== umbrellaOn.current) {
      umbrellaOn.current = u;
      setUmbrella(u);
    }
    if (!pose) {
      placed.current = false;
      return;
    }
    const p = group.position;
    const [x, y, z] = stepPosition([p.x, p.y, p.z], pose.position, dt, !placed.current);
    p.set(x, y, z);
    group.rotation.y = placed.current
      ? dampAngle(group.rotation.y, pose.facing, FACING_RATE, dt)
      : pose.facing;
    placed.current = true;
  });

  return (
    <Character
      ref={ref}
      look={member.look}
      pose={display.pose}
      name={member.username}
      status={display.status}
      opacity={display.opacity}
      emote={emote}
      highlight={isMe}
      umbrella={umbrella}
      onClick={() => focusMember(member.id)}
    />
  );
}
