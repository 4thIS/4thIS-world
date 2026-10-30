import { useOverlayProps } from '../store/overlay';
import { AccountMenu } from './account/AccountMenu';
import { PendingBanner } from './account/PendingBanner';
import { BoardPanel } from './overlay/BoardPanel';
import { BuildingPanel } from './overlay/BuildingPanel';
import { ChatInput } from './overlay/ChatInput';
import { ChatLog } from './overlay/ChatLog';
import { ConnectionBadge } from './overlay/ConnectionBadge';
import { ControlButton } from './overlay/ControlButton';
import { EmoteBar } from './overlay/EmoteBar';
import { MotionBar } from './overlay/MotionBar';
import { PresencePanel } from './overlay/PresencePanel';
import { TopBar } from './overlay/TopBar';
import { ScreenHost } from './ScreenHost';
import './ui.css';
import './overlay/overlay.css';

/**
 * 화면 UI의 뿌리. App이 월드 위에 그린다.
 * - 메인 오버레이: 데이터와 핸들러는 cw의 useOverlayProps()가 준다. 여기서는 배치만 한다
 * - 계정 메뉴·승인 대기 배너·모달(로그인·가입·꾸미기·시간표·관리자)은 th의 UI 스토어로 연다
 */
export function UiRoot() {
  const overlay = useOverlayProps();
  return (
    <div className="ui-root">
      <TopBar {...overlay.topBar} />
      <div className="ui-top-right">
        <ConnectionBadge {...overlay.connection} />
        <AccountMenu />
      </div>
      <PendingBanner />
      <PresencePanel {...overlay.presence} />
      {overlay.building && <BuildingPanel {...overlay.building} />}
      {overlay.board && <BoardPanel {...overlay.board} />}
      {overlay.canControl && (
        <div className="ov-bottom">
          <ControlButton {...overlay.control} />
          {/* 긴 채팅 바 + 오른쪽 이모지·모션 버튼(누르면 위로 펼쳐짐) */}
          <div className="ov-chatrow">
            <ChatInput {...overlay.chat} />
            <EmoteBar {...overlay.emoteBar} />
            <MotionBar {...overlay.motionBar} />
            <ChatLog {...overlay.chatLog} />
          </div>
        </div>
      )}
      {/* 구경꾼(조종 버튼이 없는 사람)도 채팅 기록은 본다 */}
      {!overlay.canControl && (
        <div className="ov-bottom">
          <div className="ov-chatrow ov-chatrow--log-only">
            <ChatLog {...overlay.chatLog} />
          </div>
        </div>
      )}
      <ScreenHost />
    </div>
  );
}
