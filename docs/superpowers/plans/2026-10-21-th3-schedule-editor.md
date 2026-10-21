# [th#3] 시간표 편집 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**담당:** 김태희 · 브랜치 `th` · 웨이브 3 · 선행 th#2, wj#2

**Goal:** "내 시간표" 화면: 월~일 × 06:00–24:00(30분 36줄) 주간 격자에서 빈 칸 드래그로 만들기, 블록 끌어 옮기기(다른 요일 포함), 위·아래 끝 끌어 길이 조절, 종류 색 칩, 제목(20자), 겹침 빨간 표시·저장 막기, 불러오기·저장(409 처리). 640px 미만은 목록 + 폼. 가입 흐름을 가입 → 꾸미기 → 시간표로 잇는다.

**Architecture:** 격자 계산(픽셀↔칸, 만들기·이동·길이 조절 결과, 경계 고정, 겹침 표시)은 `grid.ts` 순수 함수로 빼서 vitest로 촘촘히 확인하고, 컴포넌트는 포인터 이벤트를 받아 이 함수만 부른다. 화면은 RTL로 핵심 흐름(드래그 3종·겹침·저장·409·모바일 폼)을 확인한다. 데이터는 `api.mySchedules()`/`api.putMySchedules({ items })`.

**Tech Stack:** React 19.3 · zustand 5 · vitest 5 · @testing-library/react 16 (`fireEvent.pointerDown/Move/Up`) · jsdom

## Global Constraints

- Node `>=24`, npm workspaces, `package-lock.json` 커밋. TypeScript는 `~5.9.3` 고정.
- 모든 패키지는 ESM. `@4this/shared`는 빌드하지 않고 TS 소스를 바로 import한다.
- 공용 타입·스키마·경로·이벤트는 **`@4this/shared`에서만** 가져온다. 같은 타입을 다른 곳에 다시 정의하지 않는다.
- 시각은 KST, `packages/shared/src/time.ts`만 쓴다. 랜덤이 화면 결과에 영향을 주면 `rand01()`(결정적)을 쓴다.
- 좌표계: 단위 m, +x 동쪽, +z 남쪽(정문), 캠퍼스 x·z ∈ [-25, 25], `facing` = `rotation.y`(0이면 +z를 봄), 층 높이 3.2 m.
- 파스텔 톤: 배경 `#fbeff6`, 글자 `#5b4d6b`, 카드 `rgba(255,255,255,0.85)`, 강조 분홍 `#ffb3c7`, 라벤더 `#c9bdf2`. 토큰은 `apps/web/src/ui/tokens.css`.
- 코드 스타일: Prettier(작은따옴표, 세미콜론, 100자). 주석과 사용자 문구는 한국어.
- 커밋: `feat:`/`fix:`/`chore:`/`test:`/`docs:` + 한국어 설명. PR 제목: `[th#N] 제목`.
- 남의 소유 파일(스펙 §12.2, `.github/CODEOWNERS`)은 고치지 않는다. th 소유: `apps/web/src/world/characters/**`, `apps/web/src/dev/characters/**`, `apps/web/src/ui/**`. 단 `apps/web/src/ui/contracts.ts`와 `apps/web/src/world/contracts.ts`는 cw 계약 파일이라 **읽기만** 한다.
- 새 npm 패키지를 더하지 않는다(cw#1에 있는 three·R3F·drei·zustand·zod·@testing-library/react·jsdom으로 충분하다).
- RTL 테스트는 vitest `globals`를 쓰지 않으므로 자동 정리가 없다. 컴포넌트 테스트 파일마다 `afterEach(cleanup)`(또는 `cleanup()`을 부르는 afterEach)를 둔다. `fetch`는 `ui/testing/mockApi.ts`의 `mockApi()`로 바꿔 끼우고 `afterEach`에서 `vi.unstubAllGlobals()`로 되돌린다.
- 화면 이동은 라이브러리 없이 `apps/web/src/ui/store.ts`의 `useUi`(zustand) `screen` 값 하나로 한다.
- 시간표 규칙은 shared가 기준: `ScheduleItem { day: 0..6(월=0); start; end: 'HH:MM'; kind; title? }`, 30분 단위, 06:00–24:00, 제목 20자, 겹침 금지(`findOverlap`, 서버 409 `overlap`). 종류 이름·색은 `KIND_INFO[kind].label/color`, 요일 이름은 `WEEKDAY_LABELS`.
- 격자 한 칸 높이 `ROW_PX = 20`(30분). `schedule.css`의 배경 줄 간격(20px/40px)도 이 값에 맞춘다.
- 모바일 기준 `(max-width: 639px)` (`MOBILE_QUERY`).

## File Structure

```
apps/web/src/ui/
├─ common/useMediaQuery.ts           MOBILE_QUERY, useMediaQuery(query)
├─ schedule/grid.ts · grid.test.ts   격자 순수 함수
├─ schedule/KindChips.tsx            종류 색 칩
├─ schedule/WeekGrid.tsx             주간 격자 + 드래그 (데스크톱)
├─ schedule/ScheduleListEditor.tsx   목록 + 폼 (모바일)
├─ schedule/ScheduleScreen.tsx       불러오기·저장·선택 블록 편집·겹침 경고
├─ schedule/schedule.css
├─ schedule/schedule.test.tsx
├─ store.ts                          (수정) Screen에 'schedule'
├─ ScreenHost.tsx                    (수정) schedule 화면
├─ account/AccountMenu.tsx           (수정) 내 시간표 메뉴
└─ customize/CustomizeScreen.tsx     (수정) 가입 흐름이면 저장 뒤 시간표로
```

---

### Task 1: 격자 순수 함수

**Files:**

- Create: `apps/web/src/ui/schedule/grid.ts`
- Test: `apps/web/src/ui/schedule/grid.test.ts`

**Interfaces:**

- Consumes: `DAY_START_MIN`, `DAY_END_MIN`, `SLOT_MIN`, `fromMinutes`, `toMinutes`, `findOverlap`, `Kind`, `ScheduleItem` (`@4this/shared`)
- Produces:
  - `SLOT_COUNT = 36`, `DAY_COUNT = 7`, `Cell { day; slot }`
  - `slotToTime(slot): 'HH:MM'`, `timeToSlot(hhmm): number`, `itemSlots(item): { day; start; end }`(칸 번호, end 미포함)
  - `pointToCell(x, y, { width, height }): Cell` — 격자 밖은 가장자리 칸
  - `createItem(day, a, b, kind)`, `moveItem(item, dDay, dSlot)`, `resizeItem(item, 'start' | 'end', slot)` — 모두 경계 고정, 최소 30분, 제목 유지
  - `type Drag = { mode: 'create'; day; anchor } | { mode: 'move'; index; origin; grab: Cell } | { mode: 'resize'; index; origin; edge }`
  - `dragResult(drag, cell, kind): ScheduleItem`, `applyDrag(items, drag, result): ScheduleItem[]`
  - `overlapping(items): Set<number>` (겹치는 일정 모두), `sortedEntries(items): [index, item][]`, `cleanItems(items)` (제목 trim, 빈 제목 제거)

- [ ] **Step 1: 브랜치 준비**

```bash
git fetch origin && git checkout th && git merge origin/main
npm install
```

- [ ] **Step 2: 실패하는 테스트 작성**

`apps/web/src/ui/schedule/grid.test.ts`:

```ts
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
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -w @4this/web -- grid`
Expected: FAIL — `Failed to resolve import "./grid"`

- [ ] **Step 4: 구현**

`apps/web/src/ui/schedule/grid.ts`:

```ts
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
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -w @4this/web -- grid`
Expected: PASS — 16개

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/ui/schedule/grid.ts apps/web/src/ui/schedule/grid.test.ts
git commit -m "feat: 시간표 격자 순수 함수 (칸 변환·드래그 결과·겹침)"
```

---

### Task 2: 격자·칩·목록 편집 컴포넌트

**Files:**

- Create: `apps/web/src/ui/common/useMediaQuery.ts`, `apps/web/src/ui/schedule/KindChips.tsx`, `apps/web/src/ui/schedule/WeekGrid.tsx`, `apps/web/src/ui/schedule/ScheduleListEditor.tsx`

**Interfaces:**

- Consumes: Task 1 전부, `KIND_INFO`, `KINDS`, `WEEKDAY_LABELS`
- Produces:
  - `MOBILE_QUERY = '(max-width: 639px)'`, `useMediaQuery(query): boolean` (matchMedia가 없으면 false)
  - `KindChips({ value, onChange })` — `KIND_INFO` 색·이름 칩
  - `ROW_PX = 20`, `WeekGrid({ items, overlaps, selected, kind, onChange(items, selected), onSelect(index | null) })`
    - 격자 몸통 `data-testid="week-grid"`. 블록은 `aria-label="월 09:00~10:00 1학년 강의 자료구조"`, 위·아래 손잡이는 `data-edge="start" | "end"`
    - 빈 곳 pointerdown → 만들기, 블록 → 이동(+선택), 손잡이 → 길이 조절. pointermove로 미리보기, pointerup에 `onChange(applyDrag(...), 새 선택)`
  - `ScheduleListEditor({ items, overlaps, onChange })` — 정렬된 목록(수정·삭제) + 요일·시작·끝·종류 select와 제목 입력 폼(`일정 추가`/`수정 완료`/`취소`), 끝 ≤ 시작이면 "끝 시각이 시작보다 늦어야 해요."

이 Task의 컴포넌트는 Task 3의 `ScheduleScreen` 테스트가 함께 확인한다. 여기서는 타입·린트만 본다.

- [ ] **Step 1: 미디어 쿼리 훅과 종류 칩**

`apps/web/src/ui/common/useMediaQuery.ts`:

```ts
import { useSyncExternalStore } from 'react';

/** 모바일 레이아웃 기준 (설계 문서 §9: 640px 미만) */
export const MOBILE_QUERY = '(max-width: 639px)';

/** CSS 미디어 쿼리가 맞는지. matchMedia가 없으면(jsdom) false */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  );
}
```

`apps/web/src/ui/schedule/KindChips.tsx`:

```tsx
import type { CSSProperties } from 'react';
import { KIND_INFO, KINDS, type Kind } from '@4this/shared';

/** 일정 종류 색 칩. 색과 이름은 shared의 KIND_INFO를 그대로 쓴다 */
export function KindChips({ value, onChange }: { value: Kind; onChange: (kind: Kind) => void }) {
  return (
    <fieldset className="ui-chips">
      <legend>종류</legend>
      {KINDS.map((k) => (
        <button
          key={k}
          type="button"
          className="ui-chip sch-kind"
          aria-pressed={value === k}
          style={{ '--kind': KIND_INFO[k].color } as CSSProperties}
          onClick={() => onChange(k)}
        >
          {KIND_INFO[k].label}
        </button>
      ))}
    </fieldset>
  );
}
```

- [ ] **Step 2: 주간 격자**

`apps/web/src/ui/schedule/WeekGrid.tsx`:

```tsx
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
}

const HOURS = Array.from({ length: SLOT_COUNT / 2 }, (_, i) => i * 2);

/**
 * 월~일 × 06:00~24:00 주간 격자.
 * 빈 칸을 끌면 만들기, 블록을 끌면 이동(다른 요일 포함), 블록 위·아래 손잡이를 끌면 길이 조절.
 * 계산은 모두 grid.ts의 순수 함수가 한다.
 */
export function WeekGrid({ items, overlaps, selected, kind, onChange, onSelect }: WeekGridProps) {
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
      onChange(applyDrag(items, drag, preview), index);
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
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
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
```

- [ ] **Step 3: 모바일 목록 + 폼**

`apps/web/src/ui/schedule/ScheduleListEditor.tsx`:

```tsx
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
```

- [ ] **Step 4: 타입·린트 확인**

Run: `npm run typecheck -w @4this/web && npx eslint apps/web/src/ui`
Expected: 에러 0

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/ui/common/useMediaQuery.ts apps/web/src/ui/schedule/KindChips.tsx apps/web/src/ui/schedule/WeekGrid.tsx apps/web/src/ui/schedule/ScheduleListEditor.tsx
git commit -m "feat: 주간 격자 드래그·종류 칩·모바일 목록 편집기"
```

---

### Task 3: 내 시간표 화면

**Files:**

- Create: `apps/web/src/ui/schedule/ScheduleScreen.tsx`, `apps/web/src/ui/schedule/schedule.css`
- Modify: `apps/web/src/ui/store.ts`
- Test: `apps/web/src/ui/schedule/schedule.test.tsx`

**Interfaces:**

- Consumes: Task 1·2, `api.mySchedules`, `api.putMySchedules`, `useSession`, `useUi`, `Modal`, `errorMessage`
- Produces:
  - `type Screen = 'login' | 'signup' | 'adminLogin' | 'customize' | 'schedule'`
  - `ScheduleScreen()` — 멤버가 아니면 안내만. 열리면 `GET`으로 불러오고, 데스크톱은 `KindChips` + `WeekGrid` + 선택 블록 제목·삭제(선택이 없어도 자리를 지켜 모달 높이가 흔들리지 않게 비활성으로 둔다), 모바일은 `ScheduleListEditor`. 겹치면 경고 + `저장` 비활성. 저장은 `PUT { items: cleanItems(items) }` → "저장했어요 ✨", 가입 흐름이면 닫기. 409 등 실패는 `errorMessage`

- [ ] **Step 1: 스토어에 화면 추가**

`apps/web/src/ui/store.ts`의 `Screen` 한 줄을 바꾼다.

old:

```ts
export type Screen = 'login' | 'signup' | 'adminLogin' | 'customize';
```

new:

```ts
export type Screen = 'login' | 'signup' | 'adminLogin' | 'customize' | 'schedule';
```

- [ ] **Step 2: 실패하는 테스트 작성**

jsdom은 레이아웃을 계산하지 않으므로 격자의 `getBoundingClientRect`를 700×720px로 바꿔(요일 한 칸 100px, 30분 한 칸 20px) 포인터 좌표를 정한다.

`apps/web/src/ui/schedule/schedule.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScheduleItem } from '@4this/shared';
import { useSession } from '../../store/session';
import { useUi } from '../store';
import { apiError, ME_PENDING, mockApi } from '../testing/mockApi';
import { ScheduleScreen } from './ScheduleScreen';

const LECTURE: ScheduleItem = { day: 0, start: '09:00', end: '10:00', kind: 'lecture1' };

/** 격자 크기를 700×720px로 둔다: 요일 한 칸 100px, 30분 한 칸 20px */
function stubGridRect() {
  const grid = screen.getByTestId('week-grid');
  grid.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 700, height: 720, right: 700, bottom: 720 }) as DOMRect;
  return grid;
}

/** (x, y)에서 눌러 (x2, y2)로 끌고 놓는다 */
function drag(target: Element, from: [number, number], to: [number, number]) {
  fireEvent.pointerDown(target, { button: 0, pointerId: 1, clientX: from[0], clientY: from[1] });
  fireEvent.pointerMove(target, { pointerId: 1, clientX: to[0], clientY: to[1] });
  fireEvent.pointerUp(target, { pointerId: 1, clientX: to[0], clientY: to[1] });
}

async function renderLoaded(items: ScheduleItem[], extra: Parameters<typeof mockApi>[0] = {}) {
  const api = mockApi({ 'GET /api/me/schedules': { body: { items } }, ...extra });
  render(<ScheduleScreen />);
  await screen.findByTestId('week-grid');
  return api;
}

beforeEach(() => {
  useSession.setState({ session: { kind: 'member', me: ME_PENDING }, loading: false });
  useUi.getState().open('schedule');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ScheduleScreen 격자', () => {
  it('불러온 일정을 블록으로 그린다', async () => {
    await renderLoaded([LECTURE]);
    expect(screen.getByLabelText('월 09:00~10:00 1학년 강의')).toBeTruthy();
  });

  it('빈 칸을 끌어 일정을 만든다', async () => {
    await renderLoaded([]);
    const grid = stubGridRect();
    fireEvent.click(screen.getByRole('button', { name: '연구' }));
    drag(grid, [150, 60], [150, 100]);
    expect(screen.getByLabelText('화 07:30~09:00 연구')).toBeTruthy();
  });

  it('블록을 끌어 다른 요일로 옮긴다', async () => {
    await renderLoaded([LECTURE]);
    stubGridRect();
    const block = screen.getByLabelText('월 09:00~10:00 1학년 강의');
    drag(block, [50, 130], [350, 170]);
    expect(screen.getByLabelText('목 10:00~11:00 1학년 강의')).toBeTruthy();
  });

  it('아래 끝을 끌어 길이를 늘린다', async () => {
    await renderLoaded([LECTURE]);
    stubGridRect();
    const edge = screen
      .getByLabelText('월 09:00~10:00 1학년 강의')
      .querySelector('[data-edge="end"]')!;
    drag(edge, [50, 150], [50, 190]);
    expect(screen.getByLabelText('월 09:00~11:00 1학년 강의')).toBeTruthy();
  });

  it('선택한 블록의 종류·제목을 바꾸고 지운다', async () => {
    await renderLoaded([LECTURE]);
    stubGridRect();
    drag(screen.getByLabelText('월 09:00~10:00 1학년 강의'), [50, 130], [50, 130]);
    fireEvent.click(screen.getByRole('button', { name: '교양 강의' }));
    fireEvent.change(screen.getByLabelText(/^제목/), { target: { value: '심리학' } });
    expect(screen.getByLabelText('월 09:00~10:00 교양 강의 심리학')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '일정 삭제' }));
    expect(screen.queryByLabelText(/교양 강의/)).toBeNull();
  });

  it('겹치면 빨갛게 표시하고 저장을 막는다', async () => {
    await renderLoaded([LECTURE]);
    const grid = stubGridRect();
    drag(grid, [50, 150], [50, 170]); // 월 09:30~10:30
    expect(screen.getByRole('alert').textContent).toContain('겹치는 일정');
    expect(document.querySelectorAll('.sch-block--overlap')).toHaveLength(2);
    expect(screen.getByRole('button', { name: '저장' })).toHaveProperty('disabled', true);
  });

  it('저장하면 PUT으로 통째로 보낸다 (빈 제목은 뺀다)', async () => {
    const { calls } = await renderLoaded([{ ...LECTURE, title: '  ' }], {
      'PUT /api/me/schedules': (body) => ({ body }),
    });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('저장했어요 ✨')).toBeTruthy();
    expect(calls[1]).toMatchObject({ method: 'PUT', body: { items: [LECTURE] } });
  });

  it('서버가 409 겹침을 주면 알려 준다', async () => {
    await renderLoaded([LECTURE], { 'PUT /api/me/schedules': apiError(409, 'overlap') });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect((await screen.findByRole('alert')).textContent).toBe('겹치는 일정이 있어요.');
  });

  it('가입 흐름이면 저장 후 닫는다', async () => {
    useUi.getState().open('schedule', { onboarding: true });
    await renderLoaded([], { 'PUT /api/me/schedules': (body) => ({ body }) });
    expect(screen.getByText(/마지막 단계/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(useUi.getState().screen).toBeNull());
  });
});

describe('ScheduleScreen 모바일 (640px 미만)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
  });

  it('목록 + 폼으로 추가·수정·삭제한다', async () => {
    mockApi({ 'GET /api/me/schedules': { body: { items: [LECTURE] } } });
    render(<ScheduleScreen />);
    expect(await screen.findByText('월 09:00~10:00 · 1학년 강의')).toBeTruthy();
    expect(screen.queryByTestId('week-grid')).toBeNull();

    fireEvent.change(screen.getByLabelText('요일'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '14' } }); // 13:00
    fireEvent.change(screen.getByLabelText('끝'), { target: { value: '18' } }); // 15:00
    fireEvent.change(screen.getByLabelText('종류'), { target: { value: 'external' } });
    fireEvent.change(screen.getByLabelText(/^제목/), { target: { value: '알바' } });
    fireEvent.click(screen.getByRole('button', { name: '일정 추가' }));
    expect(screen.getByText('수 13:00~15:00 · 외부 일정 · 알바')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: '수정' })[0]!);
    fireEvent.change(screen.getByLabelText('끝'), { target: { value: '10' } }); // 11:00
    fireEvent.click(screen.getByRole('button', { name: '수정 완료' }));
    expect(screen.getByText('월 09:00~11:00 · 1학년 강의')).toBeTruthy();

    fireEvent.click(screen.getAllByRole('button', { name: '삭제' })[0]!);
    expect(screen.queryByText('월 09:00~11:00 · 1학년 강의')).toBeNull();
    expect(screen.getByText('수 13:00~15:00 · 외부 일정 · 알바')).toBeTruthy();
  });

  it('끝이 시작보다 빠르면 추가하지 않는다', async () => {
    mockApi({ 'GET /api/me/schedules': { body: { items: [] } } });
    render(<ScheduleScreen />);
    await screen.findByText(/아직 일정이 없어요/);
    fireEvent.change(screen.getByLabelText('시작'), { target: { value: '10' } });
    fireEvent.change(screen.getByLabelText('끝'), { target: { value: '8' } });
    fireEvent.click(screen.getByRole('button', { name: '일정 추가' }));
    expect(screen.getByRole('alert').textContent).toBe('끝 시각이 시작보다 늦어야 해요.');
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -w @4this/web -- schedule.test`
Expected: FAIL — `Failed to resolve import "./ScheduleScreen"`

- [ ] **Step 4: 구현**

`apps/web/src/ui/schedule/schedule.css`:

```css
/* 내 시간표: 주간 격자·블록·목록 편집기 */

.sch-kind {
  background: color-mix(in srgb, var(--kind) 55%, #fff);
}

.sch-kind[aria-pressed='true'] {
  background: var(--kind);
  color: var(--ink);
  box-shadow: 0 0 0 2px var(--lavender);
}

.sch-grid {
  border-radius: var(--radius);
  background: #fff;
  box-shadow: inset 0 0 0 1px #f0e6f5;
  overflow: hidden;
}

.sch-grid__head {
  display: grid;
  grid-template-columns: 48px repeat(7, 1fr);
  padding: 8px 0;
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  background: #fbf5fd;
}

.sch-grid__scroll {
  display: grid;
  grid-template-columns: 48px 1fr;
  max-height: min(56vh, 520px);
  overflow-y: auto;
}

.sch-grid__times {
  position: relative;
  font-size: 11px;
  color: var(--ink-soft);
}

.sch-grid__times span {
  position: absolute;
  right: 6px;
  transform: translateY(-1px);
}

.sch-grid__body {
  position: relative;
  touch-action: none;
  user-select: none;
  cursor: crosshair;
  /* 30분 줄은 옅게, 1시간 줄은 조금 진하게, 요일 사이는 세로줄 */
  background-image:
    linear-gradient(to right, #f1e8f6 1px, transparent 1px),
    linear-gradient(to bottom, #efe3f4 1px, transparent 1px),
    linear-gradient(to bottom, #f8f2fa 1px, transparent 1px);
  background-size:
    calc(100% / 7) 100%,
    100% 40px,
    100% 20px;
}

.sch-block {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 3px 6px;
  overflow: hidden;
  border-radius: 8px;
  background: var(--kind);
  box-shadow: 0 2px 6px rgba(150, 110, 150, 0.18);
  font-size: 11px;
  line-height: 1.25;
  cursor: grab;
}

.sch-block b {
  font-size: 12px;
}

.sch-block small {
  opacity: 0.7;
}

.sch-block--selected {
  outline: 2px solid var(--lavender);
  z-index: 2;
}

.sch-block--overlap {
  background: #ffc2cf;
  outline: 2px solid #ff6f8e;
}

.sch-block--ghost {
  opacity: 0.6;
  pointer-events: none;
}

.sch-block__edge {
  position: absolute;
  left: 0;
  right: 0;
  height: 6px;
  cursor: ns-resize;
}

.sch-block__edge--start {
  top: 0;
}

.sch-block__edge--end {
  bottom: 0;
}

.sch-selected {
  align-items: flex-end;
}

.sch-selected__title {
  flex: 1;
}

/* 모바일 목록 + 폼 */
.sch-list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sch-list__item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: #fff;
  font-size: 13px;
}

.sch-list__text {
  flex: 1;
}

.sch-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: none;
}

.sch-form {
  padding: 12px;
  border-radius: var(--radius);
  background: #fbf5fd;
}

.sch-form__row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
```

`apps/web/src/ui/schedule/ScheduleScreen.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { Kind, ScheduleItem } from '@4this/shared';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { Modal } from '../common/Modal';
import { MOBILE_QUERY, useMediaQuery } from '../common/useMediaQuery';
import { errorMessage } from '../errors';
import { useUi } from '../store';
import { cleanItems, overlapping } from './grid';
import { KindChips } from './KindChips';
import { ScheduleListEditor } from './ScheduleListEditor';
import { WeekGrid } from './WeekGrid';
import './schedule.css';

type Status =
  { kind: 'loading' } | { kind: 'ready' } | { kind: 'saved' } | { kind: 'error'; message: string };

/** 내 시간표 편집 (설계 문서 §7.1, §9). 데스크톱은 주간 격자, 모바일은 목록 + 폼 */
export function ScheduleScreen() {
  const session = useSession((s) => s.session);
  const { onboarding, close } = useUi();
  const mobile = useMediaQuery(MOBILE_QUERY);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [kind, setKind] = useState<Kind>('lecture1');
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const overlaps = useMemo(() => overlapping(items), [items]);
  const isMember = session.kind === 'member';

  useEffect(() => {
    if (!isMember) return;
    let alive = true;
    api
      .mySchedules()
      .then((res) => {
        if (!alive) return;
        setItems(res.items);
        setStatus({ kind: 'ready' });
      })
      .catch((err: unknown) => {
        if (alive) setStatus({ kind: 'error', message: errorMessage(err) });
      });
    return () => {
      alive = false;
    };
  }, [isMember]);

  if (!isMember) {
    return (
      <Modal title="내 시간표" onClose={close}>
        <p className="ui-note">로그인한 멤버만 시간표를 만들 수 있어요.</p>
      </Modal>
    );
  }

  const change = (next: ScheduleItem[], nextSelected: number | null = selected) => {
    setItems(next);
    setSelected(nextSelected);
    if (status.kind === 'saved') setStatus({ kind: 'ready' });
  };

  const updateSelected = (patch: Partial<ScheduleItem>) => {
    if (selected === null) return;
    change(items.map((it, i) => (i === selected ? { ...it, ...patch } : it)));
  };

  const pickKind = (k: Kind) => {
    setKind(k);
    updateSelected({ kind: k });
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await api.putMySchedules({ items: cleanItems(items) });
      setItems(res.items);
      setSelected(null);
      setStatus({ kind: 'saved' });
      if (onboarding) close();
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const current = selected === null ? null : (items[selected] ?? null);

  return (
    <Modal title="내 시간표" onClose={close} wide>
      <div className="ui-form">
        {onboarding && (
          <p className="ui-note">마지막 단계예요! 매주 반복되는 일정을 넣어 주세요.</p>
        )}
        {status.kind === 'loading' ? (
          <p className="ui-note">불러오는 중…</p>
        ) : mobile ? (
          <ScheduleListEditor
            items={items}
            overlaps={overlaps}
            onChange={(next) => change(next, null)}
          />
        ) : (
          <>
            <p className="ui-note">
              빈 칸을 끌어 만들고, 블록을 끌어 옮기고, 위·아래 끝을 끌어 길이를 바꿔요.
            </p>
            <KindChips value={current?.kind ?? kind} onChange={pickKind} />
            <WeekGrid
              items={items}
              overlaps={overlaps}
              selected={selected}
              kind={kind}
              onChange={change}
              onSelect={setSelected}
            />
            {/* 선택이 없어도 자리를 지켜 모달 높이가 바뀌지 않게 한다 */}
            <div className="ui-row sch-selected">
              <label className="ui-field sch-selected__title">
                제목 (선택, 20자까지)
                <input
                  className="ui-input"
                  maxLength={20}
                  disabled={!current}
                  placeholder={current ? '예: 자료구조, 알바' : '블록을 누르면 제목을 쓸 수 있어요'}
                  value={current?.title ?? ''}
                  onChange={(e) => updateSelected({ title: e.target.value })}
                />
              </label>
              <button
                type="button"
                className="ui-btn"
                disabled={!current}
                onClick={() =>
                  change(
                    items.filter((_, i) => i !== selected),
                    null,
                  )
                }
              >
                일정 삭제
              </button>
            </div>
          </>
        )}
        {overlaps.size > 0 && (
          <p className="ui-alert" role="alert">
            겹치는 일정이 있어요. 빨간 일정을 옮기거나 줄여 주세요.
          </p>
        )}
        {status.kind === 'error' && (
          <p className="ui-alert" role="alert">
            {status.message}
          </p>
        )}
        <div className="ui-row ui-row--end">
          {status.kind === 'saved' && <span className="ui-note">저장했어요 ✨</span>}
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            onClick={save}
            disabled={busy || status.kind === 'loading' || overlaps.size > 0}
          >
            {busy ? '저장하는 중…' : '저장'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -w @4this/web -- schedule && npm run typecheck -w @4this/web`
Expected: PASS — grid 16개 + schedule 11개, 타입 에러 0

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/ui/store.ts apps/web/src/ui/schedule
git commit -m "feat: 내 시간표 화면 (불러오기·저장·겹침 표시·모바일 폼)"
```

---

### Task 4: 메뉴와 가입 흐름 연결

**Files:**

- Modify: `apps/web/src/ui/ScreenHost.tsx`, `apps/web/src/ui/account/AccountMenu.tsx`, `apps/web/src/ui/customize/CustomizeScreen.tsx`
- Test (수정): `apps/web/src/ui/customize/customize.test.tsx`, `apps/web/src/ui/UiRoot.test.tsx`

**Interfaces:**

- Consumes: `ScheduleScreen`, `useUi`
- Produces:
  - 멤버 메뉴 첫 줄 `내 시간표` → `open('schedule')`
  - 꾸미기 저장 뒤: 가입 흐름이면 `open('schedule', { onboarding: true })`, 아니면 닫기
  - 가입 → 꾸미기 → 시간표 → 저장하면 닫힘

- [ ] **Step 1: 테스트 수정 (실패하게)**

`customize.test.tsx`에 "가입 흐름이면 저장 뒤 시간표로 넘어간다"를 더한 파일 전체:

`apps/web/src/ui/customize/customize.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LookSchema, type Look } from '@4this/shared';
import { useSession } from '../../store/session';
import { useUi } from '../store';
import { apiError, ME_PENDING, mockApi } from '../testing/mockApi';
import { CustomizeScreen } from './CustomizeScreen';

// WebGL이 없는 jsdom에서는 3D 미리보기 대신 지금 생김새를 글자로 보여 준다
vi.mock('./LookPreview', () => ({
  LookPreview: ({ look }: { look: Look }) => (
    <div data-testid="preview">{JSON.stringify(look)}</div>
  ),
}));

const preview = (): Look => JSON.parse(screen.getByTestId('preview').textContent ?? '{}') as Look;

beforeEach(() => {
  useSession.setState({ session: { kind: 'member', me: ME_PENDING }, loading: false });
  useUi.getState().open('customize');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CustomizeScreen', () => {
  it('지금 내 생김새로 시작하고 칩을 누르면 바뀐다', () => {
    render(<CustomizeScreen />);
    expect(preview()).toEqual(ME_PENDING.look);
    fireEvent.click(screen.getByRole('button', { name: /고양이/ }));
    fireEvent.click(screen.getByRole('button', { name: '민트' }));
    fireEvent.click(screen.getByRole('button', { name: '비니' }));
    fireEvent.click(screen.getByRole('button', { name: '선글라스' }));
    fireEvent.click(screen.getByRole('button', { name: '나비넥타이' }));
    expect(preview()).toEqual({
      animal: 'cat',
      color: 'mint',
      head: 'beanie',
      eyes: 'sunglasses',
      neck: 'bowtie',
    });
    expect(screen.getByRole('button', { name: '비니' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('가입 흐름에서는 랜덤 조합으로 시작한다', () => {
    useUi.getState().open('customize', { onboarding: true });
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    render(<CustomizeScreen />);
    expect(preview()).toEqual({
      animal: 'duck',
      color: 'gray',
      head: 'cap',
      eyes: 'sunglasses',
      neck: 'bowtie',
    });
    expect(screen.getByRole('heading').textContent).toBe('내 캐릭터 만들기');
    random.mockRestore();
  });

  it('🎲 랜덤은 항상 유효한 조합', () => {
    render(<CustomizeScreen />);
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole('button', { name: '🎲 랜덤' }));
      expect(LookSchema.safeParse(preview()).success).toBe(true);
    }
  });

  it('저장하면 PATCH /api/me 후 세션을 갱신하고 닫는다', async () => {
    const saved = { ...ME_PENDING, look: { ...ME_PENDING.look, animal: 'bear' as const } };
    const { calls } = mockApi({ 'PATCH /api/me': { body: saved } });
    render(<CustomizeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /곰/ }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(useUi.getState().screen).toBeNull());
    expect(calls[0]).toMatchObject({ method: 'PATCH', body: { look: saved.look } });
    expect(useSession.getState().session).toEqual({ kind: 'member', me: saved });
  });

  it('가입 흐름이면 저장 뒤 시간표로 넘어간다', async () => {
    mockApi({ 'PATCH /api/me': { body: ME_PENDING } });
    useUi.getState().open('customize', { onboarding: true });
    render(<CustomizeScreen />);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(useUi.getState().screen).toBe('schedule'));
    expect(useUi.getState().onboarding).toBe(true);
  });

  it('저장 실패는 알려 주고 화면을 유지한다', async () => {
    mockApi({ 'PATCH /api/me': apiError(401, 'unauthorized') });
    render(<CustomizeScreen />);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect((await screen.findByRole('alert')).textContent).toBe('로그인이 필요해요.');
    expect(useUi.getState().screen).toBe('customize');
  });

  it('게스트에게는 안내만 보인다', () => {
    useSession.setState({ session: { kind: 'guest' } });
    render(<CustomizeScreen />);
    expect(screen.getByText('로그인한 멤버만 꾸밀 수 있어요.')).toBeTruthy();
  });
});
```

`UiRoot.test.tsx`의 가입 흐름을 시간표까지 늘리고 "멤버 메뉴에서 내 시간표를 연다"를 더한 파일 전체:

`apps/web/src/ui/UiRoot.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '../store/session';
import { useUi } from './store';
import { ME_APPROVED, ME_PENDING, mockApi } from './testing/mockApi';
import { UiRoot } from './UiRoot';

vi.mock('./customize/LookPreview', () => ({ LookPreview: () => <div data-testid="preview" /> }));

beforeEach(() => {
  useSession.setState({ session: { kind: 'guest' }, loading: false });
  useUi.getState().close();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('UiRoot', () => {
  it('세션을 불러오는 동안에는 계정 버튼을 그리지 않는다', () => {
    useSession.setState({ loading: true });
    render(<UiRoot />);
    expect(screen.queryByRole('button', { name: '로그인' })).toBeNull();
  });

  it('게스트: 로그인·가입 버튼이 모달을 연다', () => {
    render(<UiRoot />);
    fireEvent.click(screen.getByRole('button', { name: '가입' }));
    expect(screen.getByRole('dialog', { name: '가입하기' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(screen.getByRole('dialog', { name: '로그인' })).toBeTruthy();
  });

  it('Esc로 모달을 닫는다', () => {
    render(<UiRoot />);
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('승인 대기 멤버: 배너와 내 메뉴', () => {
    useSession.setState({ session: { kind: 'member', me: ME_PENDING } });
    render(<UiRoot />);
    expect(screen.getByRole('status').textContent).toContain('관리자 승인 대기 중');
    fireEvent.click(screen.getByRole('button', { name: /철수/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: '캐릭터 꾸미기' }));
    expect(screen.getByRole('dialog', { name: '캐릭터 꾸미기' })).toBeTruthy();
  });

  it('승인된 멤버는 배너가 없고, 로그아웃하면 게스트', async () => {
    const { calls } = mockApi({ 'POST /api/auth/logout': { body: { ok: true } } });
    useSession.setState({ session: { kind: 'member', me: ME_APPROVED } });
    render(<UiRoot />);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /철수/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: '로그아웃' }));
    await vi.waitFor(() => expect(useSession.getState().session).toEqual({ kind: 'guest' }));
    expect(calls[0]?.url).toBe('/api/auth/logout');
  });

  it('가입 → 꾸미기 → 시간표 흐름', async () => {
    mockApi({
      'POST /api/auth/signup': { body: { kind: 'member', me: ME_PENDING } },
      'PATCH /api/me': (body) => ({ body: { ...ME_PENDING, ...(body as object) } }),
      'GET /api/me/schedules': { body: { items: [] } },
      'PUT /api/me/schedules': (body) => ({ body }),
    });
    render(<UiRoot />);
    fireEvent.click(screen.getByRole('button', { name: '가입' }));
    fireEvent.change(screen.getByLabelText(/^이름/), { target: { value: '철수' } });
    fireEvent.change(screen.getByLabelText(/^비밀번호 \(/), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '가입하고 캐릭터 꾸미기' }));
    expect(await screen.findByRole('dialog', { name: '내 캐릭터 만들기' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('승인 대기');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByRole('dialog', { name: '내 시간표' })).toBeTruthy();
    await screen.findByTestId('week-grid');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('멤버 메뉴에서 내 시간표를 연다', async () => {
    mockApi({ 'GET /api/me/schedules': { body: { items: [] } } });
    useSession.setState({ session: { kind: 'member', me: ME_APPROVED } });
    render(<UiRoot />);
    fireEvent.click(screen.getByRole('button', { name: /철수/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: '내 시간표' }));
    expect(await screen.findByTestId('week-grid')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/web -- customize UiRoot`
Expected: FAIL 3개 — customize의 `expected null to be 'schedule'`, UiRoot의 `Unable to find role="dialog" and name "내 시간표"`와 `Unable to find role="menuitem" and name "내 시간표"`

- [ ] **Step 3: 구현**

`apps/web/src/ui/ScreenHost.tsx` — 파일 전체:

```tsx
import { AdminLoginForm } from './auth/AdminLoginForm';
import { LoginForm } from './auth/LoginForm';
import { SignupForm } from './auth/SignupForm';
import { CustomizeScreen } from './customize/CustomizeScreen';
import { ScheduleScreen } from './schedule/ScheduleScreen';
import { useUi } from './store';

/** UI 스토어의 screen 값에 맞는 모달 하나를 그린다 (라우터 대신) */
export function ScreenHost() {
  const screen = useUi((s) => s.screen);
  switch (screen) {
    case null:
      return null;
    case 'login':
      return <LoginForm />;
    case 'signup':
      return <SignupForm />;
    case 'adminLogin':
      return <AdminLoginForm />;
    case 'customize':
      return <CustomizeScreen />;
    case 'schedule':
      return <ScheduleScreen />;
  }
}
```

`apps/web/src/ui/account/AccountMenu.tsx` — 파일 전체:

```tsx
import { useState } from 'react';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { ANIMAL_EMOJI } from '../../world/characters/labels';
import { useUi, type Screen } from '../store';

interface MenuItem {
  label: string;
  run: () => void;
}

/** 오른쪽 위: 게스트면 로그인·가입 버튼, 로그인했으면 내 메뉴 */
export function AccountMenu() {
  const { session, loading, setSession } = useSession();
  const open = useUi((s) => s.open);
  const [expanded, setExpanded] = useState(false);

  if (loading) return null;

  if (session.kind === 'guest') {
    return (
      <div className="ui-row">
        <button type="button" className="ui-btn" onClick={() => open('login')}>
          로그인
        </button>
        <button type="button" className="ui-btn ui-btn--primary" onClick={() => open('signup')}>
          가입
        </button>
      </div>
    );
  }

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // 서버가 응답하지 않아도 화면에서는 로그아웃한다
    }
    setSession({ kind: 'guest' });
  };

  const go = (screen: Screen) => () => open(screen);
  const items: MenuItem[] =
    session.kind === 'member'
      ? [
          { label: '내 시간표', run: go('schedule') },
          { label: '캐릭터 꾸미기', run: go('customize') },
          { label: '로그아웃', run: logout },
        ]
      : [{ label: '로그아웃', run: logout }];
  const title =
    session.kind === 'member'
      ? `${ANIMAL_EMOJI[session.me.look.animal]} ${session.me.username}`
      : '🛠️ 관리자';

  return (
    <div className="ui-menu">
      <button
        type="button"
        className="ui-btn"
        aria-haspopup="menu"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {title} ▾
      </button>
      {expanded && (
        <ul className="ui-menu__list" role="menu">
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                className="ui-menu__item"
                onClick={() => {
                  setExpanded(false);
                  item.run();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

`apps/web/src/ui/customize/CustomizeScreen.tsx` — 파일 전체:

```tsx
import { useState } from 'react';
import { DEFAULT_LOOK, randomLook, type Look } from '@4this/shared';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { Modal } from '../common/Modal';
import { errorMessage } from '../errors';
import { useUi } from '../store';
import { LookChips } from './LookChips';
import { LookPreview } from './LookPreview';

/**
 * 캐릭터 꾸미기. 가입 직후(onboarding)에는 랜덤 조합으로 시작하고,
 * 그 밖에는 지금 내 생김새로 시작한다.
 */
export function CustomizeScreen() {
  const session = useSession((s) => s.session);
  const setSession = useSession((s) => s.setSession);
  const { onboarding, open, close } = useUi();
  const [look, setLook] = useState<Look>(() =>
    onboarding ? randomLook() : session.kind === 'member' ? session.me.look : DEFAULT_LOOK,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session.kind !== 'member') {
    return (
      <Modal title="캐릭터 꾸미기" onClose={close}>
        <p className="ui-note">로그인한 멤버만 꾸밀 수 있어요.</p>
      </Modal>
    );
  }

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const me = await api.patchMe({ look });
      setSession({ kind: 'member', me });
      // 가입 흐름이면 다음은 시간표
      if (onboarding) open('schedule', { onboarding: true });
      else close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={onboarding ? '내 캐릭터 만들기' : '캐릭터 꾸미기'} onClose={close} wide>
      <div className="ui-customize">
        <LookPreview look={look} />
        <div className="ui-form">
          <LookChips look={look} onChange={setLook} />
          {error && (
            <p className="ui-alert" role="alert">
              {error}
            </p>
          )}
          <div className="ui-row ui-row--between">
            <button type="button" className="ui-btn" onClick={() => setLook(randomLook())}>
              🎲 랜덤
            </button>
            <button type="button" className="ui-btn ui-btn--primary" onClick={save} disabled={busy}>
              {busy ? '저장하는 중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -w @4this/web -- src/ui`
Expected: PASS — 56개(store 2, errors 4, auth 9, customize 7, UiRoot 7, grid 16, schedule 11)

- [ ] **Step 5: 실제 서버로 확인** (wj#2가 머지돼 있어야 한다)

Run: `ADMIN_PASSWORD=admin1234 SESSION_SECRET=dev-secret-dev-secret-dev-secret-00 npm run dev` 후 http://localhost:5173
Expected:

- 새로 가입 → 꾸미기 저장 → "내 시간표"(마지막 단계 안내). 빈 칸을 끌면 고른 종류 색 블록이 생기고, 블록을 다른 요일로 끌면 옮겨지고, 아래 끝을 끌면 길어진다. 블록을 누르고 `교양 강의` 칩을 누르면 종류가, 제목 칸에 쓰면 제목이 바뀐다.
- 두 블록을 겹치면 둘 다 빨갛게 되고 경고가 뜨며 `저장`이 눌리지 않는다. 겹침을 풀고 저장하면 닫힌다.
- 메뉴 `내 시간표`로 다시 열면 저장한 일정이 그대로 있다. 저장하면 "저장했어요 ✨".
- 창을 390px로 줄이면 목록 + 폼으로 바뀌고, 폼으로 추가·수정·삭제가 된다.

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/ui
git commit -m "feat: 내 시간표 메뉴와 가입 → 꾸미기 → 시간표 흐름"
```

---

### Task 5: 전체 검사와 PR

- [ ] **Step 1: 전체 검사**

Run: `npm run format && npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
Expected: 모두 통과. `@4this/web` 테스트 80개(cw#1의 5개 포함, 먼저 머지된 다른 PR의 테스트가 있으면 그만큼 더 많다). 빌드는 `✓ built` (500 kB 청크 경고는 무시).

- [ ] **Step 2: push와 PR**

```bash
git push origin th
gh pr create --base main --head th --title "[th#3] 시간표 편집" --body-file .github/pull_request_template.md
```

PR 본문에 격자 화면·모바일 폼 스크린샷을 붙이고 wj(`/me/schedules`)와 cw를 리뷰어로 지정한다. 머지는 **Create a merge commit**.

- [ ] **Step 3: 머지 후 알림**

머지되면 단톡방에 "th#3 머지됨 — 내 시간표 편집 화면이 생겼어요" 를 알린다.

---

## Self-Review

- 스펙 §7.1(30분 단위·06–24·겹침 금지·종류), §9 내 시간표(드래그 생성·이동·길이 조절·색 칩·겹침 빨강·모바일 목록 + 폼), §8.2 `GET/PUT /me/schedules`(409) → Task 1~4. 제목 20자는 `maxLength={20}` + 서버 스키마.
- 플레이스홀더 없음. 코드는 검증한 파일 그대로다.
- `ScheduleItem`, `KIND_INFO`, `WEEKDAY_LABELS`, `findOverlap`, `api.mySchedules/putMySchedules`는 cw#1 계약 이름 그대로다. 겹침 표시용 `overlapping()`은 "모든 겹치는 일정"을 돌려주는 화면용 함수라 shared의 `findOverlap`(첫 쌍)과 역할이 다르다.
