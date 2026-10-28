import type { ThreeEvent } from '@react-three/fiber';
import { CAMPUS } from '@4this/shared';
import { useRealtime } from '../../store/realtime';

/**
 * 정문 게시판 자리에 놓는 보이지 않는 클릭 영역. 누르면 게시판 패널을 연다.
 * (게시판 모델은 hm의 Campus가 그리고, 클릭은 sim이 받는다)
 */
export function BoardHotspot() {
  const openBoard = useRealtime((s) => s.openBoard);
  const [x, z] = CAMPUS.boardPos;
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    openBoard();
  };
  return (
    <mesh
      position={[x, 1, z]}
      onClick={onClick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <boxGeometry args={[2, 2, 0.6]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
