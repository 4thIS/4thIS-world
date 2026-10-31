import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Frustum, Matrix4, Vector3, type Group } from 'three';
import { ADMIN_ID, CAMPUS, HELD_MOTIONS, type PublicMember } from '@4this/shared';
import { useRealtime } from '../../store/realtime';
import { useSound } from '../../store/sound';
import { playSfxAt, playStep, speak } from '../../sound/audio';
import { stepTick, surfaceAt } from '../../sound/steps';
import { syllablesOf, voiceOf, volumeAt } from '../../sound/voice';
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
import { makesSteps } from './SoundListener';
import { resolvePose } from './resolvePose';
import { needsUmbrella } from './umbrella';

/** 누운 자리에서 이만큼(m) 벗어나면 일어난 것으로 본다 */
const LIE_RADIUS = 0.8;

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
  const chats = useRealtime((s) => s.chats[member.id]);
  const hit = useRealtime((s) => s.hits[member.id] ?? null);
  const motion = useRealtime((s) => s.motions[member.id] ?? null);
  /** 눕기 자리를 벗어났으면(시간표대로 걷기 시작 등) 그리지 않는다 */
  const lieValid = useRef(true);
  const [motionShown, setMotionShown] = useState(true);
  const camera = useThree((s) => s.camera);
  const voice = useMemo(() => voiceOf(member.look.animal, member.id), [member]);
  const voiced = useRef(0);
  const lastOpacity = useRef(1);
  const stride = useRef(0);

  // 새 말풍선이 오면 대사음: 소리를 켰고, 화면에 보이는 캐릭터만, 가까울수록 크게
  useEffect(() => {
    const latest = chats?.at(-1);
    if (!latest || latest.id <= voiced.current) return;
    voiced.current = latest.id;
    const group = ref.current;
    if (!useSound.getState().enabled || !group?.visible) return;
    const p = group.getWorldPosition(new Vector3());
    const frustum = new Frustum().setFromProjectionMatrix(
      new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    );
    if (!frustum.containsPoint(p)) return;
    speak(syllablesOf(latest.text, voice), volumeAt(camera.position.distanceTo(p)));
  }, [chats, camera, voice]);

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
    const m = useRealtime.getState().motions[member.id];
    const valid =
      !m ||
      !HELD_MOTIONS.has(m.kind) ||
      Math.hypot(group.position.x - m.pos[0], group.position.z - m.pos[1]) < LIE_RADIUS;
    if (valid !== lieValid.current) {
      lieValid.current = valid;
      setMotionShown(valid);
    }
    const u = pose !== null && needsUmbrella(pose, useWeather.getState().now?.kind ?? null);
    if (u !== umbrellaOn.current) {
      umbrellaOn.current = u;
      setUmbrella(u);
    }
    // 건물·정문을 드나들며 흐려지기 시작하면 '딸랑'
    const fade = pose?.opacity ?? 1;
    if (placed.current && lastOpacity.current >= 1 && fade < 1 && fade > 0) {
      playSfxAt('door', group.position);
    }
    lastOpacity.current = fade;
    if (!pose) {
      placed.current = false;
      return;
    }
    const p = group.position;
    const [x, y, z] = stepPosition([p.x, p.y, p.z], pose.position, dt, !placed.current);
    // 발소리: 걸은 거리를 모아 한 걸음마다 (내 캐릭터와 카메라 가까운 몇 명만)
    const step = stepTick(stride.current, placed.current ? Math.hypot(x - p.x, z - p.z) : 0);
    stride.current = step.carry;
    if (step.step && group.visible && (isMe || makesSteps(member.id))) {
      playStep(surfaceAt(x, y, z), { x, y, z }, isMe ? 1 : 0.6);
    }
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
      chats={chats}
      motion={motionShown ? motion : null}
      hit={hit}
      highlight={isMe}
      umbrella={umbrella}
      onClick={() => focusMember(member.id)}
    />
  );
}
