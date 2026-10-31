import { useCallback, useState } from 'react';
import type { SoundChannel, TopBarProps } from '../contracts';
import { useUi } from '../store';
import { SoundPanel } from './SoundPanel';

const DEFAULT_VOLUMES: Record<SoundChannel, number> = { music: 0.5, sfx: 0.7, voice: 0.7 };

/** 왼쪽 위: 로고(누르면 소개) · 요일과 시각 · 하늘 아이콘 · 🏠 처음 시야로 · ❔ 조작법 */
export function TopBar({
  clock,
  skyIcon,
  weatherLabel,
  soundOn = false,
  onToggleSound,
  volumes = DEFAULT_VOLUMES,
  onVolume,
  onHome,
}: TopBarProps) {
  const open = useUi((s) => s.open);
  const [panel, setPanel] = useState(false);
  const closePanel = useCallback(() => setPanel(false), []);
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
      {onToggleSound && (
        <span className="ov-topbar__soundwrap">
          <button
            type="button"
            className="ui-icon-btn ov-topbar__sound"
            aria-label="소리"
            aria-expanded={panel}
            title="소리"
            onClick={() => setPanel((p) => !p)}
          >
            {soundOn ? '🔊' : '🔈'}
          </button>
          {panel && onVolume && (
            <SoundPanel
              soundOn={soundOn}
              onToggleSound={onToggleSound}
              volumes={volumes}
              onVolume={onVolume}
              onClose={closePanel}
            />
          )}
        </span>
      )}
    </header>
  );
}
