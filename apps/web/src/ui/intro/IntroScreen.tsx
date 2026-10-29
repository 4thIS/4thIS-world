import { useState } from 'react';
import { useSession } from '../../store/session';
import { Modal } from '../common/Modal';
import { useUi } from '../store';
import { browserStore, hideIntroToday } from './introStorage';
import './intro.css';

/** 4thIS-world를 만든 사람 */
export const MAKERS = ['박찬우', '이우진', '박효민', '김태희'] as const;

/** 들어올 때마다 뜨는 소개 모달. "오늘 하루 보지 않기"를 고르면 다음 KST 자정까지 숨는다 */
export function IntroScreen() {
  const { open, close } = useUi();
  const guest = useSession((s) => !s.loading && s.session.kind === 'guest');
  const [hideToday, setHideToday] = useState(false);

  /** 닫기·구경하기·가입 모두 여기를 지난다 */
  const leave = (next?: () => void) => {
    if (hideToday) hideIntroToday(browserStore(), Date.now());
    // 소개를 닫고 나면(가입했다면 가입 흐름까지 끝나면) 조작법 가이드를 띄운다
    useUi.setState({ guideAfterClose: true });
    if (next) next();
    else close();
  };

  return (
    <Modal title="4thIS-world에 오신 걸 환영해요" onClose={() => leave()}>
      <div className="intro">
        <img className="intro__logo" src="/brand/logo-wide.png" alt="4thIS-world 로고" />
        <ul className="intro__list">
          <li>🗓️ 시간표대로 캐릭터가 강의실·연구실·식당·카페를 오가요</li>
          <li>🎨 동물 캐릭터를 내 맘대로 꾸며요</li>
          <li>👋 접속하면 같이 돌아다니고 이모지로 인사해요</li>
        </ul>
        <div className="intro__actions">
          {guest && (
            <button
              type="button"
              className="ui-btn ui-btn--primary"
              onClick={() => leave(() => open('signup'))}
            >
              가입하고 내 캐릭터 만들기
            </button>
          )}
          <button type="button" className="ui-btn" onClick={() => leave()}>
            {guest ? '구경하기' : '캠퍼스로 들어가기'}
          </button>
        </div>
        <label className="intro__hide">
          <input
            type="checkbox"
            checked={hideToday}
            onChange={(e) => setHideToday(e.target.checked)}
          />
          오늘 하루 보지 않기
        </label>
        <p className="intro__credits">{MAKERS.join(' · ')}</p>
      </div>
    </Modal>
  );
}
