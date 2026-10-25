import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Color, Fog } from 'three';

/**
 * 임시 조명 (hm#1): 반구광 + 해 하나(그림자). hm#4에서 시각에 따른 하늘로 바꾼다.
 */
export function Lights() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.background = new Color('#fbeff6');
    scene.fog = new Fog('#fbeff6', 80, 160);
  }, [scene]);

  return (
    <>
      <hemisphereLight args={['#fff6fb', '#c9e8c4', 1.3]} />
      <directionalLight
        position={[24, 36, 14]}
        intensity={2.1}
        color="#fff3e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={110}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
    </>
  );
}
