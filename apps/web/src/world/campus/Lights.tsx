import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Color, Fog, type DirectionalLight, type HemisphereLight } from 'three';
import type { Sky } from './sky';

/** 해(그림자를 만드는 유일한 빛)까지 거리 */
const SUN_DISTANCE = 60;

/**
 * 하늘색·안개·반구광·해. sky가 바뀔 때(1분마다)만 갱신한다.
 * 그림자 범위는 50×50 판에 딱 맞춘다(±30 m).
 */
export function Lights({ sky }: { sky: Sky }) {
  const scene = useThree((s) => s.scene);
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);

  useEffect(() => {
    if (!(scene.background instanceof Color)) scene.background = new Color();
    (scene.background as Color).set(sky.background);
    if (!(scene.fog instanceof Fog)) scene.fog = new Fog(sky.fog, 80, 170);
    scene.fog.color.set(sky.fog);
    const s = sun.current;
    if (s) {
      s.color.set(sky.sunColor);
      s.intensity = sky.sunIntensity;
      s.position.set(
        sky.sunDir[0] * SUN_DISTANCE,
        sky.sunDir[1] * SUN_DISTANCE,
        sky.sunDir[2] * SUN_DISTANCE,
      );
    }
    const h = hemi.current;
    if (h) {
      h.color.set(sky.hemiSky);
      h.groundColor.set(sky.hemiGround);
      h.intensity = sky.hemiIntensity;
    }
  }, [scene, sky]);

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={10}
        shadow-camera-far={120}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
    </>
  );
}
