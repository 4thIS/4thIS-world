import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import { BUILDING_IDS, CAMPUS, type BuildingId } from '@4this/shared';
import { Campus } from '../../world/campus/Campus';

/** '1,2,3' → [1, 2, 3] (잘못되면 기본값) */
function vec3(param: string | null, fallback: [number, number, number]): [number, number, number] {
  const v = param?.split(',').map(Number);
  return v && v.length === 3 && v.every(Number.isFinite) ? [v[0]!, v[1]!, v[2]!] : fallback;
}

const params = new URLSearchParams(window.location.search);
const CAMERA = vec3(params.get('cam'), [38, 34, 40]);
const TARGET = vec3(params.get('target'), [0, 0, 0]);
const START_BUILDING = BUILDING_IDS.find((id) => id === params.get('building')) ?? null;
const START_FLOOR = params.get('floor') ? Number(params.get('floor')) : null;

const panel: React.CSSProperties = {
  position: 'fixed',
  left: 16,
  top: 16,
  padding: '10px 14px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.85)',
  color: '#5b4d6b',
  font: '13px/1.6 sans-serif',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const chip = (on: boolean): React.CSSProperties => ({
  border: 'none',
  borderRadius: 999,
  padding: '3px 10px',
  marginRight: 4,
  cursor: 'pointer',
  background: on ? '#c9bdf2' : '#f4ecfa',
  color: on ? '#fff' : '#5b4d6b',
});

/**
 * 캠퍼스 미리보기 개발 페이지 (?dev=campus).
 * - cam=x,y,z / target=x,y,z: 카메라 위치·바라보는 점 (스크린샷용)
 * - building=eng&floor=2: 포커스할 건물과 "이 층까지만 보기"
 */
export function CampusPreview() {
  const [focused, setFocused] = useState<BuildingId | null>(START_BUILDING);
  const [floor, setFloor] = useState<number | null>(START_FLOOR);
  const [log, setLog] = useState('건물을 눌러 보세요');
  const floors = focused ? CAMPUS.buildings[focused].floors : 0;

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows camera={{ position: CAMERA, fov: 32 }}>
        <Campus
          now={Date.now()}
          occupiedFloors={new Set()}
          focusedBuilding={focused}
          hiddenAboveFloor={floor}
          onBuildingClick={(id) => {
            setFocused(id);
            setFloor(null);
            setLog(`건물 클릭: ${id}`);
          }}
        />
        <OrbitControls makeDefault target={TARGET} maxPolarAngle={Math.PI * 0.45} />
      </Canvas>
      <div style={panel}>
        <span data-testid="campus-log">{log}</span>
        {focused && (
          <div>
            {CAMPUS.buildings[focused].name}:{' '}
            {Array.from({ length: floors }, (_, i) => i + 1).map((f) => (
              <button key={f} style={chip(floor === f)} onClick={() => setFloor(f)}>
                {f}F까지
              </button>
            ))}
            <button style={chip(floor === null)} onClick={() => setFloor(null)}>
              전체
            </button>
            <button style={chip(false)} onClick={() => setFocused(null)}>
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
