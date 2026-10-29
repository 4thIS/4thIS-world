import { MapControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useState, type ReactNode } from 'react';
import { useRealtime } from '../store/realtime';
import { useWorld } from '../store/world';
import { Campus } from './campus/Campus';
import { BoardHotspot } from './sim/BoardHotspot';
import { MAX_DISTANCE, MIN_DISTANCE, OVERVIEW } from './sim/camera';
import { CameraRig } from './sim/CameraRig';
import { CanvasBoundary } from './sim/CanvasBoundary';
import { ControlDriver } from './sim/ControlDriver';
import { installWorldDebug } from './sim/debug';
import { useFocusExit } from './sim/focusExit';
import { Professor } from './sim/Professor';
import { SimMembers } from './sim/SimMembers';
import { TextFallback } from './sim/TextFallback';
import { useWorldTick } from './sim/useWorldTick';
import { hasWebGL } from './sim/webgl';

/** Canvas 안의 장면: 캠퍼스 + 멤버 + 교수님 + 게시판 클릭 영역 + 조종 + 카메라 */
function WorldScene() {
  const { now, occupied } = useWorldTick();
  const focusedBuilding = useWorld((s) => s.focusedBuilding);
  const hiddenAboveFloor = useWorld((s) => s.hiddenAboveFloor);
  const focusBuilding = useWorld((s) => s.focusBuilding);
  return (
    <>
      <Campus
        now={now}
        occupiedFloors={occupied}
        focusedBuilding={focusedBuilding}
        hiddenAboveFloor={hiddenAboveFloor}
        onBuildingClick={focusBuilding}
      />
      <SimMembers />
      <Professor />
      <BoardHotspot />
      <ControlDriver />
      <CameraRig />
    </>
  );
}

/**
 * 3D 월드 진입점. 마운트되면 GET /api/world를 부르고 소켓을 연결한다
 * (autoLoad=false면 둘 다 하지 않는다: 개발 픽스처용).
 * WebGL이 없으면 텍스트 목록으로 대신한다.
 */
export function WorldCanvas({
  autoLoad = true,
  children,
}: {
  autoLoad?: boolean;
  /** Canvas 안에 더 그릴 것 (개발 페이지의 FPS 측정 등) */
  children?: ReactNode;
}) {
  const [webgl] = useState(hasWebGL);
  // Esc·빈 곳 클릭으로 건물 포커스·캐릭터 따라가기에서 빠져나온다
  const focusExit = useFocusExit();
  useEffect(() => {
    installWorldDebug();
    if (!autoLoad) return;
    void useWorld.getState().load();
    return useRealtime.getState().connect();
  }, [autoLoad]);

  if (!webgl) return <TextFallback />;
  // Canvas가 실패해도 위의 데이터·소켓 연결은 살아 있도록 경계는 Canvas만 감싼다
  return (
    <CanvasBoundary>
      <Canvas
        shadows
        camera={{ position: OVERVIEW.position, fov: 32 }}
        onPointerDown={focusExit.onPointerDown}
        onPointerMissed={focusExit.onPointerMissed}
      >
        <color attach="background" args={['#fbeff6']} />
        <WorldScene />
        {/* 지도식: 왼쪽 끌기 = 이동, 오른쪽 끌기 = 회전, 휠 = 커서 쪽으로 확대. 터치는 한 손가락 이동 */}
        <MapControls
          makeDefault
          target={OVERVIEW.target}
          maxPolarAngle={Math.PI * 0.42}
          minDistance={MIN_DISTANCE}
          maxDistance={MAX_DISTANCE}
          zoomToCursor
          dampingFactor={0.12}
        />
        {children}
      </Canvas>
    </CanvasBoundary>
  );
}
