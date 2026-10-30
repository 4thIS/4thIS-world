import { useEffect, useId, useState, type FormEvent } from 'react';
import { WEEKDAY_LABELS, type ScheduleItem } from '@4this/shared';
import { slotToTime, SLOT_COUNT, timeToSlot } from './grid';
import { KindChips } from './KindChips';
import { kindPlace } from './kindPlaces';

const BOUNDS = Array.from({ length: SLOT_COUNT + 1 }, (_, i) => i);

interface BlockEditorProps {
  item: ScheduleItem;
  /** 방금 끌어서 만든 일정이면 true (취소하면 지운다) */
  isNew: boolean;
  onDone: (item: ScheduleItem) => void;
  onDelete: () => void;
  onCancel: () => void;
}

/**
 * 시간표 창 위에 겹쳐 뜨는 일정 창. 격자에서 끌어 만들거나 블록을 누르면 뜬다.
 * 요일·시작·끝·종류·제목을 넣고 완료. Esc·바깥 클릭·취소는 그만두기(새 일정이면 지운다).
 * Esc는 여기서 멈춰 아래 시간표 창까지 닫히지 않게 한다.
 */
export function BlockEditor({ item, isNew, onDone, onDelete, onCancel }: BlockEditorProps) {
  const titleId = useId();
  const [day, setDay] = useState(item.day);
  const [start, setStart] = useState(timeToSlot(item.start));
  const [end, setEnd] = useState(timeToSlot(item.end));
  const [kind, setKind] = useState(item.kind);
  const [title, setTitle] = useState(item.title ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onCancel();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (end <= start) {
      setError('끝 시각이 시작보다 늦어야 해요.');
      return;
    }
    onDone({
      day,
      start: slotToTime(start),
      end: slotToTime(end),
      kind,
      ...(title.trim() ? { title: title.trim() } : {}),
    });
  };

  return (
    <div
      className="ui-backdrop sch-editor__backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="ui-modal sch-editor"
      >
        <header className="ui-modal__head">
          <h2 id={titleId}>{isNew ? '새 일정' : '일정 고치기'}</h2>
        </header>
        <form className="ui-form" onSubmit={submit}>
          <div className="sch-form__row">
            <label className="ui-field">
              요일
              <select
                className="ui-select"
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
              >
                {WEEKDAY_LABELS.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-field">
              시작
              <select
                className="ui-select"
                value={start}
                onChange={(e) => setStart(Number(e.target.value))}
              >
                {BOUNDS.slice(0, -1).map((s) => (
                  <option key={s} value={s}>
                    {slotToTime(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="ui-field">
              끝
              <select
                className="ui-select"
                value={end}
                onChange={(e) => setEnd(Number(e.target.value))}
              >
                {BOUNDS.slice(1).map((s) => (
                  <option key={s} value={s}>
                    {slotToTime(s)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <KindChips value={kind} onChange={setKind} />
          <p className="ui-note sch-editor__place">📍 {kindPlace(kind)}에서 보내요</p>
          <label className="ui-field">
            제목 (선택, 20자까지)
            <input
              className="ui-input"
              maxLength={20}
              placeholder="예: 자료구조, 알바"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              // 새 일정이면 바로 제목부터 쓸 수 있게
              autoFocus={isNew}
            />
          </label>
          {error && (
            <p className="ui-alert" role="alert">
              {error}
            </p>
          )}
          <div className="ui-row ui-row--between">
            {isNew ? (
              <span />
            ) : (
              <button type="button" className="ui-btn" onClick={onDelete}>
                삭제
              </button>
            )}
            <div className="ui-row">
              <button type="button" className="ui-btn" onClick={onCancel}>
                취소
              </button>
              <button type="submit" className="ui-btn ui-btn--primary">
                완료
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
