import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';
import { geo } from './geometries';
import { useMat } from './materials';

/**
 * 내 캐릭터 발밑의 분홍 링. 천천히 숨 쉬듯 커졌다 작아진다 (단위 m).
 * 장식이라 raycast를 막아 클릭·호버를 가로채지 않는다(visible=false여도 three는 raycast한다).
 * 켜고 끌 때 붙였다 떼지 않고 visible만 바꾼다(형제인 이름표 Html이 다시 만들어지지 않게).
 */
export function HighlightRing({ visible }: { visible: boolean }) {
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (visible) ring.current?.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.06);
  });
  return (
    <mesh
      ref={ring}
      visible={visible}
      raycast={() => null}
      position-y={0.02}
      rotation-x={-Math.PI / 2}
      geometry={geo.ring(0.38, 0.5)}
      material={useMat('#ffb3c7', 'blush')}
    />
  );
}
