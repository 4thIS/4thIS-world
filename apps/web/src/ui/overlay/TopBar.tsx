import type { TopBarProps } from '../contracts';

/** 왼쪽 위: 로고 · 요일과 시각 · 하늘 아이콘 */
export function TopBar({ clock, skyIcon }: TopBarProps) {
  return (
    <header className="ov-topbar ui-card">
      <b className="ov-topbar__logo">🐾 4thIS-world</b>
      {clock && (
        <span className="ov-topbar__clock" aria-label="지금 시각">
          {clock} {skyIcon}
        </span>
      )}
    </header>
  );
}
