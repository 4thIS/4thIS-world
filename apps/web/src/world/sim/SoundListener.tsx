import { useFrame } from '@react-three/fiber';
import { listener } from '../../sound/audio';

/** 카메라 위치를 효과음 쪽에 알려 준다 (멀리서 난 소리는 작게) */
export function SoundListener() {
  useFrame(({ camera }) => {
    listener.copy(camera.position);
  });
  return null;
}
