import { useThree } from '@react-three/fiber';
import { useMemo, type RefObject } from 'react';

/**
 * drei <Html>이 붙을 DOM(캔버스의 부모)을 고정해서 넘긴다.
 * 넘기지 않으면 Html이 events.connected가 생기는 첫 리렌더 때 DOM 루트를 한 번 지웠다 다시 만들며
 * "Attempted to synchronously unmount a root" 경고를 캐릭터 수만큼 낸다.
 */
export function useHtmlPortal(): RefObject<HTMLElement> {
  const gl = useThree((s) => s.gl);
  return useMemo(() => ({ current: gl.domElement.parentNode as HTMLElement }), [gl]);
}
