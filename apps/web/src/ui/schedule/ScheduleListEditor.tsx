import { useState, type FormEvent } from 'react';
import { KIND_INFO, KINDS, WEEKDAY_LABELS, type Kind, type ScheduleItem } from '@4this/shared';
import { slotToTime, SLOT_COUNT, sortedEntries, timeToSlot } from './grid';

interface ScheduleListEditorProps {
  items: ScheduleItem[];
  overlaps: ReadonlySet<number>;
  onChange: (items: ScheduleItem[]) => void;
}

interface Draft {
  day: number;
  start: number;
  end: number;
  kind: Kind;
  title: string;
}

const EMPTY: Draft = { day: 0, start: 6, end: 8, kind: 'lecture1', title: '' };
const BOUNDS = Array.from({ length: SLOT_COUNT + 1 }, (_, i) => i);

/** 640px 미만에서 쓰는 목록 + 폼 편집기 (설계 문서 §9) */
export function ScheduleListEditor({ items, overlaps, onChange }: ScheduleListEditorProps) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  /** 고치는 중인 일정 인덱스. null이면 새로 추가 */
  const [editing, setEditing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const edit = (index: number) => {
    const item = items[index]!;
    setEditing(index);
    setError(null);
    setDraft({
      day: item.day,
      start: timeToSlot(item.start),
      end: timeToSlot(item.end),
      kind: item.kind,
      title: item.title ?? '',
    });
  };

  const reset = () => {
    setEditing(null);
    setDraft(EMPTY);
    setError(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.end <= draft.start) {
      setError('끝 시각이 시작보다 늦어야 해요.');
      return;
    }
    const item: ScheduleItem = {
      day: draft.day,
      start: slotToTime(draft.start),
      end: slotToTime(draft.end),
      kind: draft.kind,
      ...(draft.title.trim() ? { title: draft.title.trim() } : {}),
    };
    onChange(
      editing === null ? [...items, item] : items.map((it, i) => (i === editing ? item : it)),
    );
    reset();
  };

  return (
    <div className="ui-form">
      {items.length === 0 && <p className="ui-note">아직 일정이 없어요. 아래에서 추가해 주세요.</p>}
      <ul className="sch-list">
        {sortedEntries(items).map(([i, item]) => (
          <li
            key={i}
            className={overlaps.has(i) ? 'sch-list__item sch-block--overlap' : 'sch-list__item'}
          >
            <span className="sch-dot" style={{ background: KIND_INFO[item.kind].color }} />
            <span className="sch-list__text">
              {WEEKDAY_LABELS[item.day]} {item.start}~{item.end} · {KIND_INFO[item.kind].label}
              {item.title ? ` · ${item.title}` : ''}
            </span>
            <button type="button" className="ui-btn ui-btn--small" onClick={() => edit(i)}>
              수정
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--small"
              onClick={() => {
                onChange(items.filter((_, j) => j !== i));
                reset();
              }}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>

      <form className="ui-form sch-form" onSubmit={submit}>
        <div className="sch-form__row">
          <label className="ui-field">
            요일
            <select
              className="ui-select"
              value={draft.day}
              onChange={(e) => setDraft({ ...draft, day: Number(e.target.value) })}
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
              value={draft.start}
              onChange={(e) => setDraft({ ...draft, start: Number(e.target.value) })}
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
              value={draft.end}
              onChange={(e) => setDraft({ ...draft, end: Number(e.target.value) })}
            >
              {BOUNDS.slice(1).map((s) => (
                <option key={s} value={s}>
                  {slotToTime(s)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="ui-field">
          종류
          <select
            className="ui-select"
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as Kind })}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_INFO[k].label}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-field">
          제목 (선택, 20자까지)
          <input
            className="ui-input"
            maxLength={20}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        {error && (
          <p className="ui-alert" role="alert">
            {error}
          </p>
        )}
        <div className="ui-row ui-row--end">
          {editing !== null && (
            <button type="button" className="ui-btn" onClick={reset}>
              취소
            </button>
          )}
          <button type="submit" className="ui-btn">
            {editing === null ? '일정 추가' : '수정 완료'}
          </button>
        </div>
      </form>
    </div>
  );
}
