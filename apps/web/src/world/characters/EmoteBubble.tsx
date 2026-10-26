import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { ActiveEmote } from '../contracts';
import { emoteFrame } from './overhead';
import { useHtmlPortal } from './useHtmlPortal';

/** 이름표(20)보다 위. 렌더마다 새 배열이면 Html이 DOM 루트를 다시 만들어서 모듈 상수로 둔다 */
const Z_RANGE: [number, number] = [30, 21];
/** 클릭을 가로채지 않게 한다. Html의 pointerEvents prop은 transform 모드 전용이라 스타일로 준다 */
const HTML_STYLE = { pointerEvents: 'none' } as const;

const bubbleStyle = {
  display: 'grid',
  placeItems: 'center',
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: '#ffffff',
  boxShadow: '0 4px 12px rgba(201, 165, 192, 0.45)',
  fontSize: 22,
  transform: 'scale(0)',
  userSelect: 'none',
} as const;

/**
 * 이모지 말풍선. emote.at(performance.now() ms)부터 3초 동안 튀어나왔다 사라진다.
 * 매 프레임 DOM 스타일만 바꿔서 React 렌더를 일으키지 않는다.
 */
export function EmoteBubble({ emote, height }: { emote: ActiveEmote; height: number }) {
  const el = useRef<HTMLDivElement>(null);
  const portal = useHtmlPortal();

  useFrame(() => {
    const div = el.current;
    if (!div) return;
    const f = emoteFrame(performance.now() - emote.at);
    if (!f) {
      div.style.display = 'none';
      return;
    }
    div.style.display = 'grid';
    div.style.opacity = String(f.opacity);
    div.style.transform = `translateY(${-f.rise}px) scale(${f.scale})`;
  });

  return (
    <group position-y={height}>
      <Html center portal={portal} zIndexRange={Z_RANGE} style={HTML_STYLE}>
        <div ref={el} style={bubbleStyle}>
          {emote.emoji}
        </div>
      </Html>
    </group>
  );
}
