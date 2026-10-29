import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, SRGBColorSpace, type Sprite } from 'three';
import { CAMPUS } from '@4this/shared';
import { myMemberId, useRealtime } from '../../store/realtime';
import { useWorld } from '../../store/world';
import { bobOffset, markerAnchor } from './markerAnchor';
import { memberObjects } from './registry';

/** 분홍 동그라미 안의 흰 ✓ */
function checkTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ff8fb1';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(36, 66);
  ctx.lineTo(56, 86);
  ctx.lineTo(93, 44);
  ctx.stroke();
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** 캐릭터 0.7 m, 건물 1.6 m */
const MEMBER_SIZE = 0.7;
const BUILDING_SIZE = 1.6;

/** 포커스된 캐릭터 머리 위·건물 지붕 위에 둥둥 떠다니는 ✓. 다른 물체에 가려지지 않는다 */
export function FocusMarker() {
  const ref = useRef<Sprite>(null);
  const texture = useMemo(checkTexture, []);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(({ clock }) => {
    const sprite = ref.current;
    if (!sprite) return;
    const { focusedBuilding, focusedMember } = useWorld.getState();
    // 내 캐릭터를 조종하는 동안에는 카메라가 나를 따라갈 뿐이라 표시하지 않는다(발밑 링이 있다)
    if (useRealtime.getState().controlling && focusedMember === myMemberId()) {
      sprite.visible = false;
      return;
    }
    const anchor = markerAnchor(focusedBuilding, focusedMember, CAMPUS);
    const bob = bobOffset(clock.elapsedTime);
    if (anchor?.kind === 'building') {
      const [x, y, z] = anchor.position;
      sprite.position.set(x, y + bob * 2, z);
      sprite.scale.setScalar(BUILDING_SIZE);
      sprite.visible = true;
      return;
    }
    const followed = anchor ? memberObjects.get(anchor.memberId) : undefined;
    if (anchor?.kind === 'member' && followed?.visible) {
      const p = followed.position;
      sprite.position.set(p.x, p.y + anchor.height + bob, p.z);
      sprite.scale.setScalar(MEMBER_SIZE);
      sprite.visible = true;
      return;
    }
    sprite.visible = false;
  });

  return (
    <sprite ref={ref} visible={false} renderOrder={10}>
      <spriteMaterial map={texture} transparent depthTest={false} toneMapped={false} />
    </sprite>
  );
}
