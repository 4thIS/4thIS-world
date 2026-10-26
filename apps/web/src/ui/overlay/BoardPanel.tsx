import type { BoardPanelProps } from '../contracts';

/** 정문 게시판: 지금 외부 일정 중인 사람 (설계 문서 §7.2-4) */
export function BoardPanel({ entries, onClose }: BoardPanelProps) {
  return (
    <section className="ov-side ui-card" aria-label="외부 일정 게시판">
      <header className="ov-side__head">
        <b>📋 외부 일정 게시판</b>
        <button type="button" className="ui-icon-btn" aria-label="게시판 닫기" onClick={onClose}>
          ✕
        </button>
      </header>
      {entries.length === 0 ? (
        <p className="ui-note">지금은 외부 일정 중인 사람이 없어요.</p>
      ) : (
        <ul className="ov-side__list">
          {entries.map((e) => (
            <li key={e.memberId}>
              <b>{e.username}</b> · {e.title} <small>(~{e.until})</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
