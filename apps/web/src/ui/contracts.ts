import type { BoardEntry, BuildingId, Emoji, Look } from '@4this/shared';

/**
 * th가 만드는 표시용 컴포넌트의 props. 스토어·소켓 연결은 cw가 한다.
 * 파일 위치: apps/web/src/ui/overlay/<컴포넌트명>.tsx, 이름 있는 export
 */

export interface PresenceEntry {
  id: string;
  username: string;
  look: Look;
  status: string;
  controlling: boolean;
  isMe: boolean;
}

/** PresencePanel: 접속자 목록. 모바일에서는 하단 시트 */
export interface PresencePanelProps {
  entries: PresenceEntry[];
  /** 접속하지 않은 승인 멤버 (관리자 캐릭터 제외). status는 시간표상 지금 위치 */
  offline: PresenceEntry[];
  spectators: number;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (memberId: string) => void;
}

/** EmoteBar: 이모지 8개 버튼 */
export interface EmoteBarProps {
  disabled: boolean;
  onEmote: (emoji: Emoji) => void;
}

/** ChatInput: 말풍선 채팅 입력칸. onSend는 다듬어 비었으면 'empty', 너무 빠르면 'tooFast' */
export interface ChatInputProps {
  disabled: boolean;
  onSend: (text: string) => 'sent' | 'empty' | 'tooFast';
}

/** ControlButton: 조종하기 / 자동으로 */
export interface ControlButtonProps {
  controlling: boolean;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}

/** BoardPanel: 정문 게시판을 눌렀을 때 뜨는 외부 일정 목록 */
export interface BoardPanelProps {
  entries: BoardEntry[];
  onClose: () => void;
}

/** ConnectionBadge: 소켓 상태 */
export interface ConnectionBadgeProps {
  state: 'connected' | 'reconnecting';
}

/** BuildingPanel: 건물을 클릭했을 때 층 버튼 + 지금 있는 사람 */
export interface BuildingPanelProps {
  building: BuildingId;
  name: string;
  floors: number;
  hiddenAboveFloor: number | null;
  onFloor: (floor: number | null) => void;
  people: { id: string; username: string; status: string; floor: number }[];
  onClose: () => void;
}

/** TopBar: 로고·시각·로그인/메뉴 */
export interface TopBarProps {
  /** '수 14:10' */
  clock: string;
  /** '☀️' 같은 하늘 아이콘 (비·눈·흐림이면 🌧️·❄️·☁️) */
  skyIcon: string;
  /** 마우스를 올리면 보이는 날씨 설명: '서대문구 · 비 2.1mm · 12°C' */
  weatherLabel?: string;
  /** 대사음 켜짐 (🔊/🔈) */
  soundOn?: boolean;
  onToggleSound?: () => void;
  /** 대사음 크기 0~1 (켜져 있을 때 옆에 막대) */
  volume?: number;
  onVolume?: (v: number) => void;
  /** 🏠 처음 시야로 (포커스를 풀고 캠퍼스 전체를 본다) */
  onHome: () => void;
}

/** UiRoot가 그리는 메인 오버레이 전체. cw의 useOverlayProps()가 만든다 */
export interface OverlayProps {
  topBar: TopBarProps;
  presence: PresencePanelProps;
  emoteBar: EmoteBarProps;
  chat: ChatInputProps;
  control: ControlButtonProps;
  connection: ConnectionBadgeProps;
  /** 게시판을 열었을 때만 */
  board: BoardPanelProps | null;
  /** 건물을 클릭했을 때만 */
  building: BuildingPanelProps | null;
  /** 승인된 로그인 멤버면 true (조종·이모지 바 표시) */
  canControl: boolean;
}
