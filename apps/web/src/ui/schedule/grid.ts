import {
  DAY_END_MIN,
  DAY_START_MIN,
  fromMinutes,
  SLOT_MIN,
  toMinutes,
  type Kind,
  type ScheduleItem,
} from '@4this/shared';

/**
 * 주간 격자의 순수 로직. 화면 좌표·칸(slot)·일정 사이 변환과 드래그 결과 계산.
 * 칸 번호 0 = 06:00~06:30, 35 = 23:30~24:00. 요일 0 = 월.
 */
export const SLOT_COUNT = (DAY_END_MIN - DAY_START_MIN) / SLOT_MIN; // 36
export const DAY_COUNT = 7;

export interface Cell {
  day: number;
  slot: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** 칸 경계 번호(0~36) → 'HH:MM' */
export function slotToTime(slot: number): string {
  return fromMinutes(DAY_START_MIN + slot * SLOT_MIN);
}

/** 'HH:MM' → 칸 경계 번호(0~36) */
export function timeToSlot(hhmm: string): number {
  return (toMinutes(hhmm) - DAY_START_MIN) / SLOT_MIN;
}

/** 일정 → { 요일, 시작 칸, 끝 칸(포함 안 함) } */
export function itemSlots(item: ScheduleItem): { day: number; start: number; end: number } {
  return { day: item.day, start: timeToSlot(item.start), end: timeToSlot(item.end) };
}

/** 격자 안 좌표(px) → 칸. 격자 밖이면 가장자리 칸으로 붙인다 */
export function pointToCell(x: number, y: number, size: { width: number; height: number }): Cell {
  return {
    day: clamp(Math.floor((x / size.width) * DAY_COUNT), 0, DAY_COUNT - 1),
    slot: clamp(Math.floor((y / size.height) * SLOT_COUNT), 0, SLOT_COUNT - 1),
  };
}

const withSlots = (item: ScheduleItem, day: number, start: number, end: number): ScheduleItem => ({
  ...item,
  day,
  start: slotToTime(start),
  end: slotToTime(end),
});

/** 빈 칸 a에서 b까지 끌어 만든 일정 (위로 끌어도 된다) */
export function createItem(day: number, a: number, b: number, kind: Kind): ScheduleItem {
  const lo = clamp(Math.min(a, b), 0, SLOT_COUNT - 1);
  const hi = clamp(Math.max(a, b), 0, SLOT_COUNT - 1);
  return { day, start: slotToTime(lo), end: slotToTime(hi + 1), kind };
}

/** 길이를 유지한 채 요일·칸만큼 옮긴다. 격자 밖으로는 못 나간다 */
export function moveItem(item: ScheduleItem, dDay: number, dSlot: number): ScheduleItem {
  const { day, start, end } = itemSlots(item);
  const len = end - start;
  const nextStart = clamp(start + dSlot, 0, SLOT_COUNT - len);
  return withSlots(item, clamp(day + dDay, 0, DAY_COUNT - 1), nextStart, nextStart + len);
}

/** 위(start)나 아래(end) 끝을 칸 slot까지 끌어 길이를 바꾼다. 최소 1칸 */
export function resizeItem(item: ScheduleItem, edge: 'start' | 'end', slot: number): ScheduleItem {
  const { day, start, end } = itemSlots(item);
  if (edge === 'start') return withSlots(item, day, clamp(slot, 0, end - 1), end);
  return withSlots(item, day, start, clamp(slot + 1, start + 1, SLOT_COUNT));
}

/** 진행 중인 드래그 */
export type Drag =
  | { mode: 'create'; day: number; anchor: number }
  | { mode: 'move'; index: number; origin: ScheduleItem; grab: Cell }
  | { mode: 'resize'; index: number; origin: ScheduleItem; edge: 'start' | 'end' };

/** 드래그 중 포인터가 cell에 있을 때의 결과 일정 */
export function dragResult(drag: Drag, cell: Cell, kind: Kind): ScheduleItem {
  switch (drag.mode) {
    case 'create':
      return createItem(drag.day, drag.anchor, cell.slot, kind);
    case 'move':
      return moveItem(drag.origin, cell.day - drag.grab.day, cell.slot - drag.grab.slot);
    case 'resize':
      return resizeItem(drag.origin, drag.edge, cell.slot);
  }
}

/** 드래그 결과를 목록에 반영한다. 만들기는 맨 뒤에 붙이고, 이동·길이 조절은 그 자리를 바꾼다 */
export function applyDrag(
  items: readonly ScheduleItem[],
  drag: Drag,
  result: ScheduleItem,
): ScheduleItem[] {
  if (drag.mode === 'create') return [...items, result];
  return items.map((item, i) => (i === drag.index ? result : item));
}

/** 다른 일정과 겹치는 일정들의 인덱스 (빨간 표시용) */
export function overlapping(items: readonly ScheduleItem[]): Set<number> {
  const out = new Set<number>();
  const spans = items.map(itemSlots);
  spans.forEach((a, i) => {
    spans.forEach((b, j) => {
      if (i < j && a.day === b.day && a.start < b.end && b.start < a.end) {
        out.add(i);
        out.add(j);
      }
    });
  });
  return out;
}

/** 요일·시작 순으로 정렬한 [원래 인덱스, 일정] (목록 화면용) */
export function sortedEntries(items: readonly ScheduleItem[]): [number, ScheduleItem][] {
  return items
    .map((item, i): [number, ScheduleItem] => [i, item])
    .sort(([, a], [, b]) => a.day - b.day || toMinutes(a.start) - toMinutes(b.start));
}

/** 저장 전에 제목 앞뒤 공백을 지우고, 빈 제목은 뺀다 */
export function cleanItems(items: readonly ScheduleItem[]): ScheduleItem[] {
  return items.map(({ title, ...rest }) => {
    const t = title?.trim();
    return t ? { ...rest, title: t } : rest;
  });
}
