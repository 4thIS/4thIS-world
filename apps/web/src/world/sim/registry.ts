import type { Object3D } from 'three';

/** 멤버 아이디 → 화면의 캐릭터 객체. 카메라 추적·E2E 조회가 읽는다 */
export const memberObjects = new Map<string, Object3D>();

export function registerMember(id: string, object: Object3D | null): void {
  if (object) memberObjects.set(id, object);
  else memberObjects.delete(id);
}
