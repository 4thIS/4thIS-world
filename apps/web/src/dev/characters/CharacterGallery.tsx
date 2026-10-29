import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState, type CSSProperties } from 'react';
import {
  ANIMALS,
  COLOR_KEYS,
  EMOJIS,
  EYES,
  HEADS,
  NECKS,
  POSE_KINDS,
  type Look,
} from '@4this/shared';
import { PROFESSOR_LOOK, type ActiveEmote, type CharacterLook } from '../../world/contracts';
import { Character } from '../../world/characters/Character';
import {
  ANIMAL_LABELS,
  COLOR_LABELS,
  EYES_LABELS,
  HEAD_LABELS,
  NECK_LABELS,
  POSE_LABELS,
} from '../../world/characters/labels';
import { SEAT_HEIGHT, SITTING_POSES } from '../../world/characters/poses';

const GAP = 1.7;
const ROWS: CharacterLook['animal'][] = [...ANIMALS, 'lion'];

/** 악세서리 조합 줄 */
const COMBOS: Look[] = [
  { animal: 'dog', color: 'default', head: 'strawHat', eyes: 'glasses', neck: 'scarf' },
  { animal: 'cat', color: 'pink', head: 'beanie', eyes: 'sunglasses', neck: 'bowtie' },
  { animal: 'bear', color: 'mint', head: 'ribbon', eyes: 'none', neck: 'scarf' },
  { animal: 'duck', color: 'sky', head: 'cap', eyes: 'glasses', neck: 'bowtie' },
  { animal: 'cat', color: 'lemon', head: 'cap', eyes: 'none', neck: 'scarf' },
  { animal: 'bear', color: 'lavender', head: 'strawHat', eyes: 'sunglasses', neck: 'none' },
  { animal: 'dog', color: 'gray', head: 'beanie', eyes: 'none', neck: 'bowtie' },
  { animal: 'duck', color: 'peach', head: 'ribbon', eyes: 'sunglasses', neck: 'scarf' },
];

type Accessories = Pick<Look, 'color' | 'head' | 'eyes' | 'neck'>;

const panel: CSSProperties = {
  position: 'fixed',
  left: 16,
  top: 16,
  width: 300,
  maxHeight: 'calc(100% - 32px)',
  overflow: 'auto',
  padding: '14px 16px',
  borderRadius: 20,
  background: 'rgba(255, 255, 255, 0.88)',
  boxShadow: '0 10px 30px rgba(201, 165, 192, 0.25)',
  fontSize: 12,
  zIndex: 100,
};

const chip = (on: boolean): CSSProperties => ({
  border: 'none',
  margin: '0 4px 4px 0',
  padding: '4px 9px',
  borderRadius: 999,
  background: on ? '#c9bdf2' : '#f4ecfa',
  color: on ? '#fff' : '#5b4d6b',
  fontFamily: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
});

function ChipRow<K extends string>(props: {
  title: string;
  keys: readonly K[];
  labels: Record<K, string>;
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <b style={{ display: 'block', marginBottom: 4 }}>{props.title}</b>
      {props.keys.map((k) => (
        <button key={k} style={chip(props.value === k)} onClick={() => props.onChange(k)}>
          {props.labels[k]}
        </button>
      ))}
    </div>
  );
}

/** 의자 대신 쓰는 상자: 윗면이 SEAT_HEIGHT */
function Stool({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, SEAT_HEIGHT / 2, z - 0.05]} receiveShadow castShadow>
      <boxGeometry args={[0.55, SEAT_HEIGHT, 0.5]} />
      <meshStandardMaterial color="#f9d7e2" />
    </mesh>
  );
}

/**
 * 캐릭터 갤러리 (?dev=characters). 동물 5종 × 포즈 8개 격자 + 악세서리 조합 줄.
 * 왼쪽 패널에서 색·악세서리·이모지·하이라이트·투명도를 바꿔 본다.
 */
export function CharacterGallery() {
  const [acc, setAcc] = useState<Accessories>({
    color: 'default',
    head: 'none',
    eyes: 'none',
    neck: 'none',
  });
  const [emote, setEmote] = useState<ActiveEmote | null>(null);
  const [highlight, setHighlight] = useState(false);
  const [faded, setFaded] = useState(false);
  const opacity = faded ? 0.4 : 1;
  const x0 = (-(POSE_KINDS.length - 1) * GAP) / 2;

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows camera={{ position: [0, 9, 16], fov: 40 }}>
        <color attach="background" args={['#fbeff6']} />
        <hemisphereLight args={['#fff6fb', '#c9e8c4', 1.3]} />
        <directionalLight position={[8, 14, 6]} intensity={2} castShadow />
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[40, 30]} />
          <meshStandardMaterial color="#cdeec4" />
        </mesh>

        {ROWS.map((animal, row) =>
          POSE_KINDS.map((pose, col) => {
            const x = x0 + col * GAP;
            const z = -5 + row * GAP;
            const look: CharacterLook = animal === 'lion' ? PROFESSOR_LOOK : { animal, ...acc };
            return (
              <group key={`${animal}-${pose}`}>
                {SITTING_POSES.has(pose) && <Stool x={x} z={z} />}
                <Character
                  ref={(g) => {
                    g?.position.set(x, 0, z);
                  }}
                  look={look}
                  pose={pose}
                  name={ANIMAL_LABELS[animal]}
                  status={POSE_LABELS[pose]}
                  emote={emote}
                  highlight={highlight}
                  opacity={opacity}
                  onClick={() => setEmote({ emoji: '❤️', at: performance.now() })}
                />
              </group>
            );
          }),
        )}

        {COMBOS.map((look, i) => (
          <Character
            key={`combo-${i}`}
            ref={(g) => {
              g?.position.set(x0 + i * GAP, 0, -5 + ROWS.length * GAP + 0.6);
            }}
            look={look}
            pose="idle"
            name={`조합 ${i + 1}`}
            status={`${HEAD_LABELS[look.head]} · ${EYES_LABELS[look.eyes]} · ${NECK_LABELS[look.neck]}`}
            emote={emote}
            highlight={highlight}
            opacity={opacity}
          />
        ))}
        <OrbitControls makeDefault target={[0, 0.5, 0]} />
      </Canvas>

      <div style={panel}>
        <b style={{ fontSize: 14 }}>🐾 캐릭터 갤러리</b>
        <p style={{ margin: '4px 0 10px', opacity: 0.75 }}>
          줄: 강아지·고양이·곰·오리·사자 / 칸: 포즈 9종. 캐릭터를 누르면 ❤️
        </p>
        <ChipRow
          title="색"
          keys={COLOR_KEYS}
          labels={COLOR_LABELS}
          value={acc.color}
          onChange={(color) => setAcc({ ...acc, color })}
        />
        <ChipRow
          title="머리"
          keys={HEADS}
          labels={HEAD_LABELS}
          value={acc.head}
          onChange={(head) => setAcc({ ...acc, head })}
        />
        <ChipRow
          title="눈"
          keys={EYES}
          labels={EYES_LABELS}
          value={acc.eyes}
          onChange={(eyes) => setAcc({ ...acc, eyes })}
        />
        <ChipRow
          title="목"
          keys={NECKS}
          labels={NECK_LABELS}
          value={acc.neck}
          onChange={(neck) => setAcc({ ...acc, neck })}
        />
        <b style={{ display: 'block', marginBottom: 4 }}>이모지</b>
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            style={chip(emote?.emoji === emoji)}
            onClick={() => setEmote({ emoji, at: performance.now() })}
          >
            {emoji}
          </button>
        ))}
        <div style={{ marginTop: 8 }}>
          <button style={chip(highlight)} onClick={() => setHighlight(!highlight)}>
            하이라이트 링
          </button>
          <button style={chip(faded)} onClick={() => setFaded(!faded)}>
            반투명 0.4
          </button>
        </div>
      </div>
    </div>
  );
}
