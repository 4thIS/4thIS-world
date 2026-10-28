import type { TopBarProps } from '../contracts';
import { useUi } from '../store';

/** 왼쪽 위: 로고(누르면 소개) · 요일과 시각 · 하늘 아이콘 */
export function TopBar({ clock, skyIcon }: TopBarProps) {
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
        <span className="ov-topbar__clock" aria-label="지금 시각">
          {clock} {skyIcon}
        </span>
      )}
    </header>
  );
}
