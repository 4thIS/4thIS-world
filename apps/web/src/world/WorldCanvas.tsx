import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { BuildingId } from '@4this/shared';
import { useRealtime } from '../store/realtime';
import { useWeather } from '../store/weather';
import { useWorld } from '../store/world';
import { Campus } from './campus/Campus';
import { BoardHotspot } from './sim/BoardHotspot';
import { MAX_DISTANCE, MIN_DISTANCE, OVERVIEW } from './sim/camera';
import { CameraRig } from './sim/CameraRig';
import { FocusMarker } from './sim/FocusMarker';
import { Projectiles } from './sim/Projectiles';
import { SoundListener } from './sim/SoundListener';
import { CanvasBoundary } from './sim/CanvasBoundary';
import { ControlDriver } from './sim/ControlDriver';
import { installWorldDebug } from './sim/debug';
import { useFocusExit } from './sim/focusExit';
import { buildingAt } from './sim/indoor';
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
  const weather = useWeather((s) => s.now);
  // 조종해서 건물 안에 들어가면 그 층 위를 숨겨 안이 보이게 한다 ("eng:2" 같은 문자열로 구독)
  const inside = useRealtime((s) => {
    if (!s.controlling || !s.local) return null;
    const b = buildingAt([s.local.x, s.local.z]);
    return b ? `${b.id}:${s.local.floor}` : null;
  });
  const cutaway = useMemo(() => {
    if (!inside) return null;
    const [building, floor] = inside.split(':');
    return { building: building as BuildingId, floor: Number(floor) };
  }, [inside]);
  return (
    <>
      <Campus
        now={now}
        occupiedFloors={occupied}
        focusedBuilding={focusedBuilding}
        hiddenAboveFloor={hiddenAboveFloor}
        cutaway={cutaway}
        weather={weather}
        onBuildingClick={focusBuilding}
      />
      <SimMembers />
      <Professor />
      <BoardHotspot />
      <ControlDriver />
      <CameraRig />
      <FocusMarker />
      <SoundListener />
      <Projectiles />
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
    void useWeather.getState().load();
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
        {/* 왼쪽 끌기 = 회전, 오른쪽 끌기 = 이동, 휠 = 커서 쪽으로 확대. 더블 클릭 후 끌면 이동(CameraRig) */}
        <OrbitControls
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
