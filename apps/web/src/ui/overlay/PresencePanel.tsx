import { useState } from 'react';
import { AnimalFace } from '../common/AnimalFace';
import type { PresencePanelProps } from '../contracts';

/**
 * 접속자 패널. 아래에 접속하지 않은 멤버(오프라인, 접기 가능)도 보여 준다.
 * 이름을 누르면 카메라가 그 캐릭터로 간다(onSelect).
 * 데스크톱은 오른쪽 카드, 640px 미만은 화면 아래 시트(overlay.css)
 */
export function PresencePanel({
  entries,
  offline,
  spectators,
  collapsed,
  onToggle,
  onSelect,
}: PresencePanelProps) {
  const [offlineOpen, setOfflineOpen] = useState(true);
  return (
    <aside
      className={collapsed ? 'ov-presence ui-card ov-presence--collapsed' : 'ov-presence ui-card'}
      aria-label="접속자"
    >
      <button
        type="button"
        className="ov-presence__head"
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <span>접속 중 {entries.length}</span>
        <span aria-hidden="true">{collapsed ? '▴' : '▾'}</span>
      </button>
      {!collapsed && (
        <>
          <ul className="ov-presence__list">
            {entries.map((e) => (
              <li key={e.id}>
                <button type="button" className="ov-presence__item" onClick={() => onSelect(e.id)}>
                  <AnimalFace look={e.look} size={26} />
                  <span className="ov-presence__name">
                    {e.username}
                    {e.isMe && <small> (나)</small>}
                  </span>
                  <span className="ov-presence__status">
                    {e.controlling ? '🎮 조종' : e.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="ov-presence__spectators">👀 구경 중 {spectators}</p>
          {offline.length > 0 && (
            <div className="ov-presence__offline">
              <button
                type="button"
                className="ov-presence__subhead"
                aria-expanded={offlineOpen}
                onClick={() => setOfflineOpen((v) => !v)}
              >
                <span>오프라인 {offline.length}</span>
                <span aria-hidden="true">{offlineOpen ? '▾' : '▸'}</span>
              </button>
              {offlineOpen && (
                <ul className="ov-presence__list" aria-label="오프라인 멤버">
                  {offline.map((e) => (
                    <li key={e.id}>
                      <button
                        type="button"
                        className="ov-presence__item ov-presence__item--offline"
                        onClick={() => onSelect(e.id)}
                      >
                        <AnimalFace look={e.look} size={22} />
                        <span className="ov-presence__name">
                          {e.username}
                          {e.isMe && <small> (나)</small>}
                        </span>
                        <span className="ov-presence__status">{e.status}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </aside>
  );
}
