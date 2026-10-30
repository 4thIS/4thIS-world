import { useRealtime } from '../../store/realtime';
import { useWorld } from '../../store/world';
import { memberObjects } from './registry';

/** E2E·개발용 조회 창구. 3D 캔버스 안은 DOM이 없어서 Playwright가 이것으로 확인한다 */
export interface WorldDebug {
  /** 월드에 있는 멤버 아이디 */
  members: () => string[];
  /** 화면에 그려진 캐릭터 위치. 그려지지 않았으면 null */
  positionOf: (memberId: string) => { x: number; y: number; z: number; visible: boolean } | null;
  /** 조종 중인 멤버 아이디 (presence 기준) */
  controlling: () => string[];
  /** 지금 떠 있는 이모지 */
  emoteOf: (memberId: string) => string | null;
  /** 지금 떠 있는 말풍선 채팅 (오래된 것부터) */
  chatsOf: (memberId: string) => string[];
  /** 지금 하는 모션 */
  motionOf: (memberId: string) => string | null;
  /** 소켓 연결 상태 */
  connection: () => string;
}

declare global {
  interface Window {
    __world?: WorldDebug;
  }
}

/** 개발 서버이거나 VITE_E2E=1로 빌드했을 때만 window.__world를 단다 */
export function installWorldDebug(): void {
  if (!import.meta.env.DEV && import.meta.env.VITE_E2E !== '1') return;
  window.__world = {
    members: () => useWorld.getState().members.map((m) => m.id),
    positionOf: (id) => {
      const o = memberObjects.get(id);
      return o ? { x: o.position.x, y: o.position.y, z: o.position.z, visible: o.visible } : null;
    },
    controlling: () =>
      useRealtime
        .getState()
        .presence.members.filter((m) => m.controlling)
        .map((m) => m.id),
    emoteOf: (id) => useRealtime.getState().emotes[id]?.emoji ?? null,
    chatsOf: (id) => (useRealtime.getState().chats[id] ?? []).map((c) => c.text),
    motionOf: (id) => useRealtime.getState().motions[id]?.kind ?? null,
    connection: () => useRealtime.getState().connection,
  };
}
