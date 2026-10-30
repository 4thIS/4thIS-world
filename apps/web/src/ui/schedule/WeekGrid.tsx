import { useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import { KIND_INFO, WEEKDAY_LABELS, type Kind, type ScheduleItem } from '@4this/shared';
import {
  applyDrag,
  DAY_COUNT,
  dragResult,
  itemSlots,
  pointToCell,
  slotToTime,
  SLOT_COUNT,
  type Cell,
  type Drag,
} from './grid';

/** 한 칸(30분) 높이 */
export const ROW_PX = 20;

interface WeekGridProps {
  items: ScheduleItem[];
  /** 빨갛게 표시할 일정 인덱스 */
  overlaps: ReadonlySet<number>;
  selected: number | null;
  /** 새로 만들 일정의 종류 */
  kind: Kind;
  onChange: (items: ScheduleItem[], selected: number | null) => void;
  onSelect: (index: number | null) => void;
  /** 빈 칸을 끌어 새 일정을 만들었을 때 (일정 창을 띄운다) */
  onCreated?: (index: number) => void;
  /** 블록을 끌지 않고 눌렀을 때 (일정 창을 띄운다) */
  onOpen?: (index: number) => void;
  /** 다른 사람 시간표 보기: 끌기·누르기를 받지 않는다 */
  readOnly?: boolean;
}

const HOURS = Array.from({ length: SLOT_COUNT / 2 }, (_, i) => i * 2);

/**
 * 월~일 × 06:00~24:00 주간 격자.
 * 빈 칸을 끌면 만들기, 블록을 끌면 이동(다른 요일 포함), 블록 위·아래 손잡이를 끌면 길이 조절.
 * 계산은 모두 grid.ts의 순수 함수가 한다.
 */
export function WeekGrid({
  items,
  overlaps,
  selected,
  kind,
  onChange,
  onSelect,
  onCreated,
  onOpen,
  readOnly = false,
}: WeekGridProps) {
  const body = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [preview, setPreview] = useState<ScheduleItem | null>(null);

  const cellAt = (e: PointerEvent): Cell => {
    const rect = body.current!.getBoundingClientRect();
    return pointToCell(e.clientX - rect.left, e.clientY - rect.top, rect);
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    const blockEl = target.closest<HTMLElement>('[data-index]');
    const cell = cellAt(e);
    let next: Drag;
    if (blockEl) {
      const index = Number(blockEl.dataset.index);
      const origin = items[index]!;
      const edge = target.closest<HTMLElement>('[data-edge]')?.dataset.edge;
      next =
        edge === 'start' || edge === 'end'
          ? { mode: 'resize', index, origin, edge }
          : { mode: 'move', index, origin, grab: cell };
      onSelect(index);
    } else {
      next = { mode: 'create', day: cell.day, anchor: cell.slot };
    }
    body.current?.setPointerCapture?.(e.pointerId);
    setDrag(next);
    setPreview(dragResult(next, cell, kind));
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag) setPreview(dragResult(drag, cellAt(e), kind));
  };

  const onPointerUp = () => {
    if (drag && preview) {
      const index = drag.mode === 'create' ? items.length : drag.index;
      const tapped =
        drag.mode === 'move' &&
        preview.day === drag.origin.day &&
        preview.start === drag.origin.start &&
        preview.end === drag.origin.end;
      if (tapped) onOpen?.(index);
      else {
        onChange(applyDrag(items, drag, preview), index);
        if (drag.mode === 'create') onCreated?.(index);
      }
    }
    setDrag(null);
    setPreview(null);
  };

  // 드래그 중에는 원래 블록 대신 미리보기를 그린다
  const shown = items.map((item, i) =>
    drag && drag.mode !== 'create' && drag.index === i && preview ? preview : item,
  );

  return (
    <div className="sch-grid">
      <div className="sch-grid__head">
        <span />
        {WEEKDAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="sch-grid__scroll">
        <div className="sch-grid__times" style={{ height: SLOT_COUNT * ROW_PX }}>
          {HOURS.map((slot) => (
            <span key={slot} style={{ top: slot * ROW_PX }}>
              {slotToTime(slot)}
            </span>
          ))}
        </div>
        <div
          ref={body}
          className="sch-grid__body"
          data-testid="week-grid"
          style={{ height: SLOT_COUNT * ROW_PX }}
          onPointerDown={readOnly ? undefined : onPointerDown}
          onPointerMove={readOnly ? undefined : onPointerMove}
          onPointerUp={readOnly ? undefined : onPointerUp}
          onPointerCancel={readOnly ? undefined : onPointerUp}
        >
          {shown.map((item, i) => (
            <Block
              key={i}
              item={item}
              index={i}
              selected={selected === i}
              overlap={overlaps.has(i)}
            />
          ))}
          {drag?.mode === 'create' && preview && (
            <Block item={preview} index={-1} selected={false} overlap={false} ghost />
          )}
        </div>
      </div>
    </div>
  );
}

interface BlockProps {
  item: ScheduleItem;
  index: number;
  selected: boolean;
  overlap: boolean;
  ghost?: boolean;
}

function Block({ item, index, selected, overlap, ghost = false }: BlockProps) {
  const { day, start, end } = itemSlots(item);
  const info = KIND_INFO[item.kind];
  const style = {
    left: `calc(${(day / DAY_COUNT) * 100}% + 2px)`,
    width: `calc(${100 / DAY_COUNT}% - 4px)`,
    top: start * ROW_PX,
    height: (end - start) * ROW_PX - 2,
    '--kind': info.color,
  } as CSSProperties;
  const classes = ['sch-block'];
  if (selected) classes.push('sch-block--selected');
  if (overlap) classes.push('sch-block--overlap');
  if (ghost) classes.push('sch-block--ghost');

  return (
    <div
      className={classes.join(' ')}
      style={style}
      data-index={ghost ? undefined : index}
      aria-label={`${WEEKDAY_LABELS[day]} ${item.start}~${item.end} ${info.label}${item.title ? ` ${item.title}` : ''}`}
    >
      {!ghost && <span className="sch-block__edge sch-block__edge--start" data-edge="start" />}
      <b>{info.label}</b>
      {item.title && <span>{item.title}</span>}
      <small>
        {item.start}~{item.end}
      </small>
      {!ghost && <span className="sch-block__edge sch-block__edge--end" data-edge="end" />}
    </div>
  );
}
