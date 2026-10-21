import type { OverlayProps } from '../ui/contracts';

const noop = () => {};

/**
 * 오버레이에 넣을 실시간 데이터와 핸들러. th의 UiRoot가 부른다.
 * cw#1: 빈 기본값. cw#3(시계·건물 패널)과 cw#4(접속자·조종·이모지·게시판)에서 채운다.
 */
export function useOverlayProps(): OverlayProps {
  return {
    topBar: { clock: '', skyIcon: '☀️' },
    presence: { entries: [], spectators: 0, collapsed: false, onToggle: noop, onSelect: noop },
    emoteBar: { disabled: true, onEmote: noop },
    control: { controlling: false, disabled: true, onStart: noop, onStop: noop },
    connection: { state: 'connected' },
    board: null,
    building: null,
    canControl: false,
  };
}
