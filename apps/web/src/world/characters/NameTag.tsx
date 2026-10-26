import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { Vector3, type Group } from 'three';
import { labelMode, labelText, type LabelMode } from './overhead';
import { useHtmlPortal } from './useHtmlPortal';

const tmp = new Vector3();
/** Html에 넘기는 배열은 모듈 상수로 둔다. 렌더마다 새 배열이면 Html이 DOM 루트를 다시 만든다 */
const Z_RANGE: [number, number] = [20, 0];
/**
 * 이름표가 클릭을 가로채지 않게 한다. drei Html의 pointerEvents prop은 transform 모드에서만
 * 쓰이므로, 래퍼 div 스타일로 준다 (자식은 pointer-events를 물려받는다)
 */
const HTML_STYLE = { pointerEvents: 'none' } as const;

const tagStyle = {
  padding: '3px 9px',
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.9)',
  color: '#7a5b8c',
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  boxShadow: '0 2px 8px rgba(201, 165, 192, 0.35)',
  fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
  userSelect: 'none',
} as const;

interface NameTagProps {
  name?: string;
  status?: string;
  /** 발밑 기준 높이(m) */
  height: number;
  opacity: number;
}

/** 이름표. 카메라 거리에 따라 `이름 · 상태` → 이름 → 숨김 (설계 문서 §6.3) */
export function NameTag({ name, status, height, opacity }: NameTagProps) {
  const anchor = useRef<Group>(null);
  const portal = useHtmlPortal();
  const modeRef = useRef<LabelMode>('name');
  const [mode, setMode] = useState<LabelMode>('name');

  useFrame(({ camera }) => {
    if (!anchor.current) return;
    const next = labelMode(camera.position.distanceTo(anchor.current.getWorldPosition(tmp)));
    if (next !== modeRef.current) {
      modeRef.current = next;
      setMode(next);
    }
  });

  const text = labelText(name, status, mode);
  // Html은 계속 붙여 두고 내용만 숨긴다 (Html을 떼었다 붙이면 DOM 루트를 매번 다시 만든다)
  return (
    <group ref={anchor} position-y={height}>
      <Html center portal={portal} zIndexRange={Z_RANGE} style={HTML_STYLE}>
        <div style={{ ...tagStyle, opacity, display: text && opacity > 0.05 ? 'block' : 'none' }}>
          {text}
        </div>
      </Html>
    </group>
  );
}
