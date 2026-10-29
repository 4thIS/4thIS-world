import type { TopBarProps } from '../contracts';
import { useUi } from '../store';

/** 왼쪽 위: 로고(누르면 소개) · 요일과 시각 · 하늘 아이콘 · 🏠 처음 시야로 · ❔ 조작법 */
export function TopBar({ clock, skyIcon, weatherLabel, onHome }: TopBarProps) {
  const open = useUi((s) => s.open);
  return (
    <header className="ov-topbar ui-card">
      <button
        type="button"
        className="ov-topbar__logo"
        aria-label="4thIS-world 소개"
        onClick={() => open('intro')}
      >
        <img src="/brand/favicon-64.png" alt="" width={22} height={22} />
        <b>4thIS-world</b>
      </button>
      {clock && (
        <span className="ov-topbar__clock" aria-label="지금 시각" title={weatherLabel}>
          {clock} {skyIcon}
        </span>
      )}
      <button
        type="button"
        className="ui-icon-btn ov-topbar__home"
        aria-label="처음 시야로"
        title="처음 시야로"
        onClick={onHome}
      >
        🏠
      </button>
      <button
        type="button"
        className="ui-icon-btn ov-topbar__help"
        aria-label="조작법"
        title="조작법"
        onClick={() => open('guide')}
      >
        ?
      </button>
    </header>
  );
}
