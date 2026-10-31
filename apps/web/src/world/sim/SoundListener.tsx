import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { listener } from '../../sound/audio';
import { STEP_VOICES, nearest } from '../../sound/steps';
import { memberObjects } from './registry';

/** 발소리를 낼 캐릭터 (카메라에서 가까운 몇 명). 내 캐릭터는 늘 낸다 */
const stepMembers = new Set<string>();

export function makesSteps(memberId: string): boolean {
  return stepMembers.has(memberId);
}

/** 카메라 위치를 효과음 쪽에 알려 주고(멀리서 난 소리는 작게), 0.5초마다 발소리 낼 캐릭터를 고른다 */
export function SoundListener() {
  const since = useRef(0);
  useFrame(({ camera }, dt) => {
    listener.copy(camera.position);
    since.current += dt;
    if (since.current < 0.5) return;
    since.current = 0;
    const visible = [];
    for (const [id, o] of memberObjects) {
      if (o.visible) visible.push({ id, x: o.position.x, y: o.position.y, z: o.position.z });
    }
    stepMembers.clear();
    for (const id of nearest(visible, listener, STEP_VOICES)) stepMembers.add(id);
  });
  return null;
}
