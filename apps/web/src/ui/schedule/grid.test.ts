import { describe, expect, it } from 'vitest';
import { findOverlap, type ScheduleItem } from '@4this/shared';
import {
  applyDrag,
  cleanItems,
  createItem,
  dragResult,
  moveItem,
  overlapping,
  pointToCell,
  resizeItem,
  slotToTime,
  SLOT_COUNT,
  sortedEntries,
  timeToSlot,
  type Drag,
} from './grid';

const item = (day: number, start: string, end: string, title?: string): ScheduleItem => ({
  day,
  start,
  end,
  kind: 'lecture1',
  ...(title ? { title } : {}),
});

describe('칸 ↔ 시각', () => {
  it('06:00이 0번, 24:00이 36번', () => {
    expect(SLOT_COUNT).toBe(36);
    expect(slotToTime(0)).toBe('06:00');
    expect(slotToTime(7)).toBe('09:30');
    expect(slotToTime(36)).toBe('24:00');
    expect(timeToSlot('09:30')).toBe(7);
    expect(timeToSlot('24:00')).toBe(36);
  });
});

describe('pointToCell', () => {
  const size = { width: 700, height: 720 }; // 칸 100px × 20px
  it('픽셀 → 요일·칸', () => {
    expect(pointToCell(0, 0, size)).toEqual({ day: 0, slot: 0 });
    expect(pointToCell(250, 61, size)).toEqual({ day: 2, slot: 3 });
    expect(pointToCell(699, 719, size)).toEqual({ day: 6, slot: 35 });
  });

  it('격자 밖은 가장자리에 붙인다', () => {
    expect(pointToCell(-30, -5, size)).toEqual({ day: 0, slot: 0 });
    expect(pointToCell(900, 2000, size)).toEqual({ day: 6, slot: 35 });
  });
});

describe('createItem', () => {
  it('끈 칸을 모두 포함한다 (아래로·위로)', () => {
    expect(createItem(1, 6, 9, 'research')).toEqual({
      day: 1,
      start: '09:00',
      end: '11:00',
      kind: 'research',
    });
    expect(createItem(1, 9, 6, 'research')).toMatchObject({ start: '09:00', end: '11:00' });
  });

  it('한 칸만 눌러도 30분 일정', () => {
    expect(createItem(0, 35, 35, 'library')).toMatchObject({ start: '23:30', end: '24:00' });
  });
});

describe('moveItem', () => {
  it('길이·제목을 유지하며 다른 요일로 옮긴다', () => {
    expect(moveItem(item(0, '09:00', '10:30', '자료구조'), 2, 2)).toEqual(
      item(2, '10:00', '11:30', '자료구조'),
    );
  });

  it('격자 위·아래·옆 경계에서 멈춘다', () => {
    expect(moveItem(item(0, '07:00', '08:00'), 0, -10)).toEqual(item(0, '06:00', '07:00'));
    expect(moveItem(item(0, '22:00', '23:00'), 0, 10)).toEqual(item(0, '23:00', '24:00'));
    expect(moveItem(item(5, '09:00', '10:00'), 5, 0).day).toBe(6);
    expect(moveItem(item(1, '09:00', '10:00'), -5, 0).day).toBe(0);
  });
});

describe('resizeItem', () => {
  it('아래 끝을 끌면 그 칸까지 늘어난다', () => {
    expect(resizeItem(item(0, '09:00', '10:00'), 'end', 9)).toEqual(item(0, '09:00', '11:00'));
  });

  it('위 끝을 끌면 시작이 바뀐다', () => {
    expect(resizeItem(item(0, '09:00', '10:00'), 'start', 4)).toEqual(item(0, '08:00', '10:00'));
  });

  it('최소 30분, 격자 밖으로 못 나간다', () => {
    expect(resizeItem(item(0, '09:00', '10:00'), 'end', 0)).toEqual(item(0, '09:00', '09:30'));
    expect(resizeItem(item(0, '09:00', '10:00'), 'start', 30)).toEqual(item(0, '09:30', '10:00'));
    expect(resizeItem(item(0, '23:00', '23:30'), 'end', 99)).toEqual(item(0, '23:00', '24:00'));
  });
});

describe('dragResult · applyDrag', () => {
  const items = [item(0, '09:00', '10:00'), item(1, '13:00', '15:00')];

  it('만들기: 시작한 요일에 고정되고 맨 뒤에 붙는다', () => {
    const drag: Drag = { mode: 'create', day: 3, anchor: 2 };
    const r = dragResult(drag, { day: 5, slot: 4 }, 'liberal');
    expect(r).toEqual({ day: 3, start: '07:00', end: '08:30', kind: 'liberal' });
    expect(applyDrag(items, drag, r)).toHaveLength(3);
  });

  it('이동: 잡은 칸 기준으로 옮기고 그 자리를 바꾼다', () => {
    const drag: Drag = { mode: 'move', index: 1, origin: items[1]!, grab: { day: 1, slot: 15 } };
    const r = dragResult(drag, { day: 4, slot: 13 }, 'lecture1');
    expect(r).toEqual(item(4, '12:00', '14:00'));
    expect(applyDrag(items, drag, r)).toEqual([items[0], r]);
  });

  it('길이 조절', () => {
    const drag: Drag = { mode: 'resize', index: 0, origin: items[0]!, edge: 'end' };
    expect(dragResult(drag, { day: 6, slot: 8 }, 'lecture1')).toEqual(item(0, '09:00', '10:30'));
  });
});

describe('overlapping', () => {
  it('겹치는 일정 모두를 표시하고, 맞닿는 것은 괜찮다', () => {
    const list = [
      item(0, '09:00', '11:00'),
      item(0, '11:00', '12:00'),
      item(0, '10:00', '10:30'),
      item(1, '09:00', '11:00'),
    ];
    expect([...overlapping(list)].sort()).toEqual([0, 2]);
    expect(findOverlap(list)).not.toBeNull();
    expect(overlapping(list.slice(0, 2)).size).toBe(0);
  });
});

describe('sortedEntries · cleanItems', () => {
  it('요일·시작 순으로 정렬하되 원래 인덱스를 지킨다', () => {
    const list = [item(2, '09:00', '10:00'), item(0, '13:00', '14:00'), item(0, '08:00', '09:00')];
    expect(sortedEntries(list).map(([i]) => i)).toEqual([2, 1, 0]);
  });

  it('빈 제목은 빼고 공백을 지운다', () => {
    expect(
      cleanItems([item(0, '09:00', '10:00', '  알바 '), item(0, '11:00', '12:00', '  ')]),
    ).toEqual([item(0, '09:00', '10:00', '알바'), item(0, '11:00', '12:00')]);
  });
});
