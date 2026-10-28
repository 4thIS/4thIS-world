import type { BuildingPanelProps } from '../contracts';

/** 건물을 눌렀을 때: 층 버튼(위층 숨기기) + 지금 이 건물에 있는 사람 (설계 문서 §5.3) */
export function BuildingPanel({
  name,
  floors,
  hiddenAboveFloor,
  onFloor,
  people,
  onClose,
}: BuildingPanelProps) {
  const floorList = Array.from({ length: floors }, (_, i) => i + 1);
  const sorted = [...people].sort(
    (a, b) => a.floor - b.floor || a.username.localeCompare(b.username),
  );

  return (
    <section className="ov-side ui-card" aria-label={`${name} 정보`}>
      <header className="ov-side__head">
        <b>🏫 {name}</b>
        <button type="button" className="ui-icon-btn" aria-label="건물 닫기" onClick={onClose}>
          ✕
        </button>
      </header>
      {floors > 1 && (
        <div className="ui-row" role="group" aria-label="층 보기">
          <button
            type="button"
            className="ui-chip"
            aria-pressed={hiddenAboveFloor === null}
            onClick={() => onFloor(null)}
          >
            전체
          </button>
          {floorList.map((f) => (
            <button
              key={f}
              type="button"
              className="ui-chip"
              aria-pressed={hiddenAboveFloor === f}
              onClick={() => onFloor(f)}
            >
              {f}F
            </button>
          ))}
        </div>
      )}
      {sorted.length === 0 ? (
        <p className="ui-note">지금 이 건물에 아무도 없어요.</p>
      ) : (
        <ul className="ov-side__list">
          {sorted.map((p) => (
            <li key={p.id}>
              <small>{p.floor}F</small> <b>{p.username}</b> · {p.status}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
