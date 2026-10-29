import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { CanvasTexture, SRGBColorSpace, type Sprite } from 'three';
import { CAMPUS } from '@4this/shared';
import { useWorld } from '../../store/world';
import { bobOffset, markerAnchor } from './markerAnchor';
import { memberObjects } from './registry';

/** 동그라미 없이 ✓만. 어느 바탕에서도 보이게 흰 테두리를 두른 분홍 ✓ */
function checkTexture(): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const check = () => {
    ctx.beginPath();
    ctx.moveTo(24, 66);
    ctx.lineTo(52, 94);
    ctx.lineTo(104, 34);
    ctx.stroke();
  };
  ctx.lineWidth = 34;
  ctx.strokeStyle = '#ffffff';
  check();
  ctx.lineWidth = 20;
  ctx.strokeStyle = '#ff6f9c';
  check();
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
