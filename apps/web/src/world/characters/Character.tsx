import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { rand01 } from '@4this/shared';
import type { ActiveChat, CharacterProps } from '../contracts';
import { EyesAccessory } from './accessories/eyes';
import { HeadAccessory } from './accessories/head';
import { NeckAccessory } from './accessories/neck';
import { characterColors } from './colors';
import { ChatBubbles } from './ChatBubbles';
import { EmoteBubble } from './EmoteBubble';
import { Fireworks } from './Fireworks';
import { motionFrame } from './motionFrames';
import { geo } from './geometries';
import { BookProp, HandProp } from './HeldProp';
import { HighlightRing } from './HighlightRing';
import { OpacityStepContext, opacityStep, useMat } from './materials';
import { NameTag } from './NameTag';
import { ANIMAL_PARTS } from './parts';
import { Umbrella } from './Umbrella';
import {
  blinkScale,
  CHARACTER_SCALE,
  poseFrame,
  SIT_LIFT,
  SITTING_POSES,
  tailSwing,
  withStretch,
} from './poses';

/** 발밑 기준 이름표·말풍선 높이(m) */
const TAG_HEIGHT = 2.1 * CHARACTER_SCALE;
const EMOTE_HEIGHT = 2.6 * CHARACTER_SCALE;

/**
 * 동물 캐릭터 (설계 문서 §6). 뼈대 없이 구·캡슐을 조립한다.
 * - Group 원점 = 발밑. 위치·방향은 sim(cw)이 ref로 받은 Group을 매 프레임 직접 움직인다.
 * - 지오메트리·재질은 캐시를 공유한다. 그래서 뿌리에 dispose={null}을 건다.
 */
/** 말풍선이 없을 때 (렌더마다 새 배열을 만들지 않게) */
const NO_CHATS: readonly ActiveChat[] = [];

export function Character({
  look,
  pose,
  name,
  status,
  emote = null,
  chats = NO_CHATS,
  motion = null,
  highlight = false,
  opacity = 1,
  umbrella = false,
  onClick,
  ref,
}: CharacterProps) {
  const colors = useMemo(() => characterColors(look), [look.animal, look.color]);
  const parts = ANIMAL_PARTS[look.animal];
  const step = opacityStep(opacity);
  const phase = useMemo(() => rand01(name ?? '', look.animal) * 10, [name, look.animal]);
  const prop = useMemo(() => poseFrame(pose, 0, 0).prop, [pose]);

  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const footL = useRef<Group>(null);
  const footR = useRef<Group>(null);
  const hovered = useRef(false);

  // 호버 중에 언마운트되면 pointerout이 오지 않으니 여기서 커서를 되돌린다
  useEffect(
    () => () => {
      if (hovered.current) document.body.style.cursor = '';
    },
    [],
  );

  // 호버 중에 완전히 투명해지면(visible=false) pointerout이 오지 않으니 여기서 되돌린다
  const faded = step === 0;
  useEffect(() => {
    if (faded && hovered.current) {
      document.body.style.cursor = '';
      hovered.current = false;
    }
  }, [faded]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    let f = poseFrame(pose, t, phase);
    if (look.animal === 'lion' && pose === 'sitType') f = withStretch(f, t, phase);
    if (motion) f = motionFrame(f, motion.kind, performance.now() - motion.at) ?? f;
    if (body.current) {
      body.current.position.y = f.bodyY;
      body.current.rotation.set(f.bodyPitch, f.bodyYaw ?? 0, f.bodyRoll);
    }
    head.current?.rotation.set(f.headPitch, f.headYaw, f.headRoll);
    eyes.current?.scale.set(1, blinkScale(t, phase), 1);
    if (tail.current) tail.current.rotation.y = tailSwing(pose, t, phase);
    armL.current?.rotation.set(f.arms[0].swing, 0, -f.arms[0].spread);
    armR.current?.rotation.set(f.arms[1].swing, 0, f.arms[1].spread);
    footL.current?.position.set(-0.18, f.feet[0].y, f.feet[0].z);
    footR.current?.position.set(0.18, f.feet[1].y, f.feet[1].z);
  });

  const fur = useMat(colors.fur);
  const ink = useMat(colors.ink, 'glossy');
  const glint = useMat('#ffffff', 'glow');
  const cheek = useMat(colors.cheek, 'blush');
  const belly = useMat(colors.belly);
  const foot = useMat(parts.footColor(colors));
  const { Face, Tail, Arm } = parts;
  // 앉은 포즈는 몸이 올라가니 이름표·말풍선 앵커도 같이 올린다
  const lift = SITTING_POSES.has(pose) ? SIT_LIFT * CHARACTER_SCALE : 0;
  // 클릭 가능한 캐릭터만 R3F 상호작용 목록에 넣는다. 완전히 투명하면 아무것도 하지 않는다
  const interactive = onClick
    ? {
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (step === 0) return;
          e.stopPropagation();
          onClick();
        },
        onPointerOver: () => {
          if (step === 0) return;
          document.body.style.cursor = 'pointer';
          hovered.current = true;
        },
        onPointerOut: () => {
          if (!hovered.current) return;
          document.body.style.cursor = '';
          hovered.current = false;
        },
      }
    : null;

  return (
    <group ref={ref} dispose={null} visible={step > 0} {...interactive}>
      <OpacityStepContext value={step}>
        <HighlightRing visible={highlight} />
        <group scale={CHARACTER_SCALE}>
          {umbrella && <Umbrella phase={phase} />}
          <group ref={body}>
            {/* 둥근 몸통 + 배 */}
            <mesh
              position-y={0.55}
              scale={[1, 0.95, 0.9]}
              geometry={geo.sphere(0.42, 24, 18)}
              material={fur}
              castShadow
            />
            <mesh
              position={[0, 0.5, 0.26]}
              scale={[1, 1, 0.5]}
              geometry={geo.sphere(0.3, 20, 14)}
              material={belly}
            />
            <NeckAccessory kind={look.neck} />
            {prop === 'book' && <BookProp />}

            {/* 팔: 어깨 피벗 */}
            <group ref={armL} position={[-0.36, 0.78, 0.06]}>
              <Arm colors={colors} />
            </group>
            <group ref={armR} position={[0.36, 0.78, 0.06]}>
              <Arm colors={colors} />
              <HandProp prop={prop} />
            </group>

            {/* 꼬리 피벗: 엉덩이 뒤 */}
            <group ref={tail} position={[0, 0.55, -0.38]}>
              <Tail colors={colors} />
            </group>

            {/* 큰 머리 */}
            <group ref={head} position-y={1.25}>
              <mesh
                scale={[1.05, 0.95, 0.95]}
                geometry={geo.sphere(0.5, 28, 22)}
                material={fur}
                castShadow
              />
              <group ref={eyes}>
                {[-0.18, 0.18].map((x) => (
                  <group key={x}>
                    <mesh
                      position={[x, 0.04, 0.45]}
                      scale={[1, 1, 0.6]}
                      geometry={geo.sphere(0.07, 14, 10)}
                      material={ink}
                    />
                    {/* 눈 하이라이트 */}
                    <mesh
                      position={[x + 0.025, 0.07, 0.5]}
                      geometry={geo.sphere(0.022, 8, 6)}
                      material={glint}
                    />
                  </group>
                ))}
              </group>
              {/* 볼터치 */}
              {[-0.18, 0.18].map((x) => (
                <mesh
                  key={x}
                  position={[x * 1.55, -0.1, 0.43]}
                  rotation-y={x > 0 ? 0.5 : -0.5}
                  geometry={geo.circle(0.07)}
                  material={cheek}
                />
              ))}
              <Face colors={colors} />
              <HeadAccessory kind={look.head} />
              <EyesAccessory kind={look.eyes} />
            </group>
          </group>

          {/* 발은 몸 밖에 둬서 통통 튈 때도 땅에 붙어 있다 */}
          <group ref={footL} position={[-0.18, 0.08, 0.08]}>
            <mesh scale={[1, 0.55, 1.35]} geometry={geo.sphere(0.13, 14, 10)} material={foot} />
          </group>
          <group ref={footR} position={[0.18, 0.08, 0.08]}>
            <mesh scale={[1, 0.55, 1.35]} geometry={geo.sphere(0.13, 14, 10)} material={foot} />
          </group>
        </group>
      </OpacityStepContext>

      <NameTag name={name} status={status} height={TAG_HEIGHT + lift} opacity={opacity} />
      {motion?.kind === 'firework' && (
        <Fireworks key={motion.at} at={motion.at} height={EMOTE_HEIGHT + 0.6} />
      )}
      {emote && <EmoteBubble key={emote.at} emote={emote} height={EMOTE_HEIGHT + lift} />}
      {chats.length > 0 && (
        <ChatBubbles chats={chats} height={EMOTE_HEIGHT + lift} aboveEmote={emote !== null} />
      )}
    </group>
  );
}
