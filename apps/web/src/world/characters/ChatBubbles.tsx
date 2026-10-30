import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { ActiveChat } from '../contracts';
import { chatFrame } from './chatTiming';
import { useHtmlPortal } from './useHtmlPortal';

/** 이모지 말풍선(21~30)보다 위 */
const Z_RANGE: [number, number] = [40, 31];
const HTML_STYLE = { pointerEvents: 'none' } as const;

/** 말풍선 묶음: 바닥 가운데를 머리 위 점에 맞춘다. 오래된 것이 위, 새 것이 아래 */
const stackStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 6,
  transform: 'translate(-50%, -100%)',
} as const;

const bubbleStyle = {
  position: 'relative',
  // <Html> 바깥 상자는 너비가 0이라 글자 길이대로 넓어지게 한다
  width: 'max-content',
  maxWidth: 200,
  padding: '5px 11px',
  borderRadius: 14,
  background: '#ffffff',
  color: '#4a3a45',
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.35,
  textAlign: 'center',
  wordBreak: 'keep-all',
  overflowWrap: 'anywhere',
  whiteSpace: 'normal',
  boxShadow: '0 4px 12px rgba(201, 165, 192, 0.45)',
  transformOrigin: '50% 100%',
  transform: 'scale(0.1)',
  userSelect: 'none',
} as const;

/** 가장 새 말풍선 아래 꼬리 */
const tailStyle = {
  position: 'absolute',
  left: '50%',
  bottom: -5,
  width: 10,
  height: 10,
  marginLeft: -5,
  background: '#ffffff',
  transform: 'rotate(45deg)',
} as const;

/**
 * 머리 위 말풍선 채팅. 한 사람에게 최대 3개가 쌓이고, 새 말풍선이 오면 이전 것은 위로 밀린다.
 * 각 말풍선은 3초 뒤 사라지므로 위(오래된 것)부터 사라진다. 이모지가 떠 있으면 그 위로 올린다.
 */
export function ChatBubbles({
  chats,
  height,
  aboveEmote,
}: {
  chats: readonly ActiveChat[];
  height: number;
  aboveEmote: boolean;
}) {
  const portal = useHtmlPortal();
  const els = useRef(new Map<number, HTMLDivElement>());

  // <Html> 안은 R3F 바깥(별도 React 루트)이라 거기서 useFrame을 쓸 수 없다: 여기서 DOM 스타일만 바꾼다
  useFrame(() => {
    const t = performance.now();
    for (const c of chats) {
      const div = els.current.get(c.id);
      if (!div) continue;
      const f = chatFrame(t - c.at);
      if (!f) {
        div.style.display = 'none';
        continue;
      }
      div.style.display = 'block';
      div.style.opacity = String(f.opacity);
      div.style.transform = `scale(${f.scale})`;
    }
  });

  return (
    <group position-y={height}>
      <Html portal={portal} zIndexRange={Z_RANGE} style={HTML_STYLE}>
        <div style={{ ...stackStyle, paddingBottom: aboveEmote ? 30 : 0 }}>
          {chats.map((c, i) => (
            <div
              key={c.id}
              ref={(el) => {
                if (el) els.current.set(c.id, el);
                else els.current.delete(c.id);
              }}
              style={bubbleStyle}
            >
              {c.text}
              {i === chats.length - 1 && <span style={tailStyle} />}
            </div>
          ))}
        </div>
      </Html>
    </group>
  );
}
