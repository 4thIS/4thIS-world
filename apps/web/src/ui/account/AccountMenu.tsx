import { useState } from 'react';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { ANIMAL_EMOJI } from '../../world/characters/labels';
import { useUi, type Screen } from '../store';

interface MenuItem {
  label: string;
  run: () => void;
}

/** 오른쪽 위: 게스트면 로그인·가입 버튼, 로그인했으면 내 메뉴 */
export function AccountMenu() {
  const { session, loading, setSession } = useSession();
  const open = useUi((s) => s.open);
  const [expanded, setExpanded] = useState(false);

  if (loading) return null;

  if (session.kind === 'guest') {
    return (
      <div className="ui-row">
        <button type="button" className="ui-btn" onClick={() => open('login')}>
          로그인
        </button>
        <button type="button" className="ui-btn ui-btn--primary" onClick={() => open('signup')}>
          가입
        </button>
      </div>
    );
  }

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // 서버가 응답하지 않아도 화면에서는 로그아웃한다
    }
    setSession({ kind: 'guest' });
  };

  const go = (screen: Screen) => () => open(screen);
  const items: MenuItem[] =
    session.kind === 'member'
      ? [
          { label: '내 시간표', run: go('schedule') },
          { label: '캐릭터 꾸미기', run: go('customize') },
          { label: '로그아웃', run: logout },
        ]
      : [
          { label: '관리자 화면', run: go('admin') },
          { label: '관리자 설정', run: go('adminSettings') },
          { label: '로그아웃', run: logout },
        ];
  const title =
    session.kind === 'member'
      ? `${ANIMAL_EMOJI[session.me.look.animal]} ${session.me.username}`
      : '🛠️ 관리자';

  return (
    <div className="ui-menu">
      <button
        type="button"
        className="ui-btn"
        aria-haspopup="menu"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {title} ▾
      </button>
      {expanded && (
        <ul className="ui-menu__list" role="menu">
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                className="ui-menu__item"
                onClick={() => {
                  setExpanded(false);
                  item.run();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
