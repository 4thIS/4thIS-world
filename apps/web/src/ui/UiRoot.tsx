import { AccountMenu } from './account/AccountMenu';
import { PendingBanner } from './account/PendingBanner';
import { ScreenHost } from './ScreenHost';
import './ui.css';

/**
 * 화면 UI의 뿌리. App이 월드 위에 그린다.
 * th#2: 계정 메뉴·승인 대기 배너·모달(로그인·가입·관리자 로그인·꾸미기)
 */
export function UiRoot() {
  return (
    <div className="ui-root">
      <div className="ui-top-right">
        <AccountMenu />
      </div>
      <PendingBanner />
      <ScreenHost />
    </div>
  );
}
