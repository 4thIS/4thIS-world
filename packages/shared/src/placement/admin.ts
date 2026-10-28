import type { Seat } from '../campus/types';
import type { Look } from '../schema/look';
import type { Pose } from './types';

/**
 * 관리자 캐릭터: 사이트에 하나뿐인 가상 멤버.
 * 멤버 표에는 없고, 생김새는 서버 설정에 저장한다. 24시간 매일 광장 한가운데 서 있다.
 */
export const ADMIN_ID = 'admin';
export const ADMIN_NAME = '관리자';

/** 광장 중앙(그래프 노드 plaza), 정문(+z) 쪽을 본다 */
export const ADMIN_SPOT: Seat = { pos: [0, 3], facing: 0 };

/** 저장된 생김새가 없을 때. 멤버들과 구분되게 선글라스·나비넥타이 곰 */
export const DEFAULT_ADMIN_LOOK: Look = {
  animal: 'bear',
  color: 'default',
  head: 'none',
  eyes: 'sunglasses',
  neck: 'bowtie',
};

export function adminPose(): Pose {
  const [x, z] = ADMIN_SPOT.pos;
  return {
    position: [x, 0, z],
    facing: ADMIN_SPOT.facing,
    pose: 'stand',
    placeId: 'plaza',
    floor: 1,
    status: '광장',
    opacity: 1,
  };
}
