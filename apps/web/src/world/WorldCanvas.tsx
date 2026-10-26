import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useState, type ReactNode } from 'react';
import { useWorld } from '../store/world';
import { Campus } from './campus/Campus';
import { OVERVIEW } from './sim/camera';
import { CameraRig } from './sim/CameraRig';
import { Professor } from './sim/Professor';
import { SimMembers } from './sim/SimMembers';
import { TextFallback } from './sim/TextFallback';
import { useWorldTick } from './sim/useWorldTick';
import { hasWebGL } from './sim/webgl';

/** Canvas 안의 장면: 캠퍼스 + 멤버 + 교수님 + 카메라 */
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
      <CameraRig />
    </>
  );
}

/**
 * 3D 월드 진입점. 마운트되면 GET /api/world를 부른다 (autoLoad=false면 부르지 않는다: 개발 픽스처용).
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
  useEffect(() => {
    if (autoLoad) void useWorld.getState().load();
  }, [autoLoad]);

  if (!webgl) return <TextFallback />;
  return (
    <Canvas shadows camera={{ position: OVERVIEW.position, fov: 32 }}>
      <color attach="background" args={['#fbeff6']} />
      <WorldScene />
      <OrbitControls makeDefault target={OVERVIEW.target} maxPolarAngle={Math.PI * 0.42} />
      {children}
    </Canvas>
  );
}
