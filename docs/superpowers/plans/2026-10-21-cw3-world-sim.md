# [cw#3] 월드 시뮬레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**담당:** 박찬우 · 브랜치 `cw` · 웨이브 2 · 선행: cw#2, hm#1, th#1 (셋 다 머지 후 PR을 연다. 작업은 cw#2 머지 직후 시작해도 된다 — `Character`·`Campus`는 cw#1 임시 구현으로도 돌아간다)

**Goal:** `GET /api/world`로 받은 승인 멤버를 3D 캠퍼스에 올리고, 매 프레임 `sampleAt` 결과대로 움직인다. 건물 클릭 → 카메라 다가가기·층 숨김·"지금 이 건물에 있는 사람", 사자 교수님, WebGL이 없을 때 텍스트 목록, 30명 개발 페이지(`?dev=sim`)까지.

**Architecture:** 상태는 zustand `useWorld`(멤버·서버 시계·오늘 `DayPlan`·카메라 포커스) 하나에 둔다. 3D 쪽은 멤버마다 `MemberAvatar`가 `useFrame`에서 `resolvePose(id, now)`를 불러 `Character`의 ref(Group)를 직접 움직이고, 포즈·이름표·투명도는 **바뀔 때만** React state로 올린다(매 프레임 setState 금지). 판단 로직(보간, 표시 값, 층 점유, 건물 패널 사람, 컷어웨이 가림, 카메라 목표, 시계·하늘 문구, 교수님 대사)은 전부 순수 함수로 빼서 vitest로 검사한다. `resolvePose`는 cw#4가 조종·복귀 걷기를 끼워 넣을 자리다.

**Tech Stack:** React ~19.3.1 · @react-three/fiber ^9.8.2 · @react-three/drei ^10.7.9 (`OrbitControls`, `Html`) · three ^0.186.1 · zustand ^5.0.15 · vitest ^5.0.5 + @testing-library/react ^16.3.3 (jsdom)

**설계 문서:** `docs/superpowers/specs/2026-10-21-4this-world-design.md` (이하 "스펙") §5.3, §5.5, §5.6, §6.3–6.4, §7.6, §9, §10

## Global Constraints

- Node `>=24`, npm workspaces, `package-lock.json` 커밋. TypeScript는 `~5.9.3` 고정.
- 모든 패키지는 ESM. `@4this/shared`는 빌드하지 않고 TS 소스를 바로 import한다.
- 공용 타입·스키마·경로·이벤트는 **`@4this/shared`에서만** 가져온다. 같은 타입을 다른 곳에 다시 정의하지 않는다.
- 시각은 KST, `packages/shared/src/time.ts`만 쓴다. 랜덤이 화면 결과에 영향을 주면 `rand01()`(결정적)을 쓴다.
- 좌표계: 단위 m, +x 동쪽, +z 남쪽(정문), 캠퍼스 x·z ∈ [-25, 25], `facing` = `rotation.y`(0이면 +z를 봄), 층 높이 3.2 m.
- 파스텔 톤: 배경 `#fbeff6`, 글자 `#5b4d6b`, 카드 `rgba(255,255,255,0.85)`. 토큰은 `apps/web/src/ui/tokens.css`(`var(--card)` 등)를 쓴다.
- 코드 스타일: Prettier(작은따옴표, 세미콜론, 100자). 주석과 사용자 문구는 한국어.
- 커밋: `feat:`/`fix:`/`chore:`/`test:`/`docs:` + 한국어 설명. PR 제목: `[cw#3] 월드 시뮬레이션`.
- 남의 소유 파일은 고치지 않는다. 이 PR이 바꾸는 곳: `apps/web/src/{world/sim,store,dev/sim}/**`, `apps/web/src/world/WorldCanvas.tsx`, `apps/web/src/App.tsx`(cw 소유). `world/characters/**`·`world/campus/**`·`ui/**`는 **읽기만** 한다.
- **이 PR 고유:**
  - `Character`는 위치·`rotation.y`를 **ref로만** 받는다(th 확인). sim은 `ref.current.position`/`rotation.y`를 매 프레임 직접 바꾸고 props로 위치를 넘기지 않는다. 앉는 높이(0.45 m)는 Character가 알아서 처리하므로 sim은 층 바닥 높이(`Pose.position[1]`)만 넣는다.
  - `useFrame` 안에서는 `useWorld.getState()`로 읽는다(구독 금지). React state는 표시 값이 바뀔 때만 바꾼다. 투명도는 0.1 단위로 끊는다.
  - 계획(`DayPlan`)은 날짜(KST 자정)나 `members`가 바뀔 때만 다시 계산한다(`ensurePlan`).
  - `useOverlayProps()`는 th의 `UiRoot`가 렌더마다 부른다 → 훅을 조건문 안에서 부르지 않는다.
  - `Character`의 `onClick`은 이벤트 전파를 멈춘다(th 확인) → 캐릭터를 눌러도 뒤의 건물 클릭이 같이 일어나지 않는다.

## File Structure

```
apps/web/src/
├─ store/
│   ├─ world.ts              useWorld: 멤버·시계(base/realBase/speed)·plan·포커스, worldNow()
│   ├─ clock.ts              useNow(ms): 느린 화면용 시각 훅
│   └─ overlay.ts            (수정) topBar 시계·하늘 아이콘, building 패널
├─ world/
│   ├─ WorldCanvas.tsx       (수정) 로드·WebGL 판별·장면 조립·children
│   └─ sim/
│       ├─ motion.ts         damp·dampAngle·stepPosition·displayOf·sameDisplay (순수)
│       ├─ occupancy.ts      snapshotAt·occupiedFloors·peopleIn·hiddenByCutaway (순수)
│       ├─ labels.ts         formatClock·skyIconAt·describeWhere·ANIMAL_ICON·professorLine (순수)
│       ├─ camera.ts         OVERVIEW·buildingGoal·followPosition (순수)
│       ├─ registry.ts       memberObjects: 멤버 아이디 → 화면 객체
│       ├─ resolvePose.ts    멤버의 지금 모습 (cw#4가 넓힌다)
│       ├─ MemberAvatar.tsx  멤버 1명: Character + useFrame 보간
│       ├─ SimMembers.tsx    멤버 목록 → MemberAvatar
│       ├─ Professor.tsx     사자 교수님 + 클릭 말풍선(drei Html)
│       ├─ CameraRig.tsx     건물 다가가기·캐릭터 따라가기
│       ├─ useWorldTick.ts   Campus용 now(10초)·occupiedFloors(2초, 바뀔 때만)
│       ├─ webgl.ts          hasWebGL()
│       └─ TextFallback.tsx  WebGL 미지원 "누가 어디 있나" 목록
├─ dev/sim/SimDevPage.tsx    ?dev=sim&n=30&at=12:00&speed=60, FPS 표시
└─ App.tsx                   (수정) ?dev=sim 연결
```

## Interfaces (이 PR이 다른 PR에 내놓는 것)

- `store/world.ts`
  - `useWorld` (zustand): `{ members: PublicMember[]; loaded; error: string | null; clock: { base; realBase; speed }; plan: DayPlan | null; planUntil; focusedBuilding: BuildingId | null; hiddenAboveFloor: number | null; focusedMember: string | null; load(): Promise<void>; setWorld(world: WorldResponse): void; syncClock(serverTime: number): void; setClock(start: number, speed: number): void; now(): number; ensurePlan(): DayPlan; focusBuilding(id | null): void; setHiddenAboveFloor(n | null): void; focusMember(id | null): void }`
  - `worldNow(): number` — 서버 기준 지금 시각. `now = base + (Date.now() - realBase) * speed`
  - **cw#4가 쓰는 것:** `syncClock`(소켓 `time`), `load`(`world:changed`), `focusMember`(접속자 이름 클릭·조종 시작)
- `store/clock.ts`: `useNow(intervalMs = 1000): number`
- `world/sim/registry.ts`: `memberObjects: Map<string, Object3D>`, `registerMember(id, obj | null)` — cw#4의 조종 시작 위치·`window.__world`가 읽는다
- `world/sim/resolvePose.ts`: `resolvePose(memberId, t): Pose | null` — cw#4가 이 파일을 넓힌다
- `world/sim/occupancy.ts`: `PROFESSOR_ID = 'professor'`, `PROFESSOR_NAME = '사자 교수님'`, `Snapshot`, `snapshotAt(plan, members, t, campus)`, `buildingOf(pose, campus)`, `occupiedFloors(snapshot, campus): Set<FloorKey>`, `sameFloors(a, b)`, `peopleIn(snapshot, building, campus)`, `hiddenByCutaway(pose, focused, hiddenAboveFloor, campus)`
- `world/sim/labels.ts`: `formatClock(t)` → `'수 14:10'`, `skyIconAt(t)` → `🌅`/`☀️`/`🌇`/`🌙`, `ANIMAL_ICON`, `describeWhere(pose, campus)`, `PROFESSOR_LINES`, `professorLine(t, clicks)`
- `world/sim/motion.ts`: `Vec3`, `POSITION_RATE`, `FACING_RATE`, `SNAP_DISTANCE = 2.5`, `damp`, `dampAngle`, `stepPosition`, `DisplayState`, `HIDDEN_DISPLAY`, `displayOf`, `sameDisplay`
- `world/sim/camera.ts`: `CameraGoal`, `OVERVIEW`, `FOLLOW_DISTANCE = 16`, `buildingGoal(id, campus)`, `followPosition(camera, target, k)`
- `world/WorldCanvas.tsx`: `WorldCanvas({ autoLoad = true, children })`
- `useOverlayProps()`: 이 PR에서 `topBar`(`clock`, `skyIcon`)와 `building`(건물 클릭 시)을 실제 값으로 채운다. `presence`·`emoteBar`·`control`·`connection`·`board`·`canControl`은 cw#4.
- hm의 `<Campus>`에 넘기는 값: `now`(10초마다 갱신), `occupiedFloors`(2초마다 계산, 내용이 바뀔 때만 새 Set), `focusedBuilding`, `hiddenAboveFloor`, `onBuildingClick = focusBuilding`

---

### Task 1: 월드 스토어 (멤버·서버 시계·오늘 계획·포커스)

**Files:**
- Create: `apps/web/src/store/world.ts`
- Test: `apps/web/src/store/world.test.ts`

**Interfaces:**
- Consumes: `api.world()`(cw#1), `computeDay`, `kstDate`, `kstMidnight`, `DAY_MS`, `CAMPUS`
- Produces: 위 `useWorld`, `worldNow`

- [ ] **Step 1: 브랜치 준비**

```bash
git fetch origin && git checkout cw && git merge origin/main
npm install
```

- [ ] **Step 2: 실패하는 테스트 작성** — `apps/web/src/store/world.test.ts`

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOOK, type WorldResponse } from '@4this/shared';
import { useWorld } from './world';

const SERVER = Date.parse('2026-10-21T14:10:00+09:00');

const world = (ids: string[]): WorldResponse => ({
  serverTime: SERVER,
  members: ids.map((id) => ({
    id,
    username: id,
    look: DEFAULT_LOOK,
    schedules: [{ day: 2, start: '14:00', end: '16:00', kind: 'lecture2' }],
  })),
});

beforeEach(() => {
  vi.useFakeTimers();
  // 브라우저 시계는 서버보다 3분 느리다
  vi.setSystemTime(SERVER - 3 * 60_000);
  useWorld.setState(useWorld.getInitialState(), true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useWorld', () => {
  it('load는 멤버를 담고 서버 시각으로 시계를 맞춘다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(world(['a', 'b'])))),
    );
    await useWorld.getState().load();
    const s = useWorld.getState();
    expect(s.loaded).toBe(true);
    expect(s.members.map((m) => m.id)).toEqual(['a', 'b']);
    expect(s.now()).toBe(SERVER);
    vi.advanceTimersByTime(5000);
    expect(useWorld.getState().now()).toBe(SERVER + 5000);
  });

  it('불러오기에 실패하면 error를 남긴다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await useWorld.getState().load();
    expect(useWorld.getState()).toMatchObject({ loaded: true, error: expect.any(String) });
  });

  it('오늘 계획을 만들고, KST 자정이 지나면 새로 만든다', () => {
    useWorld.getState().setWorld(world(['a']));
    const first = useWorld.getState().ensurePlan();
    expect(first.date).toBe('2026-10-21');
    expect(useWorld.getState().ensurePlan()).toBe(first);

    vi.setSystemTime(Date.parse('2026-10-22T00:00:01+09:00') - 3 * 60_000);
    const next = useWorld.getState().ensurePlan();
    expect(next.date).toBe('2026-10-22');
    expect(next).not.toBe(first);
  });

  it('world가 바뀌면 계획을 다시 만든다', () => {
    useWorld.getState().setWorld(world(['a']));
    const first = useWorld.getState().ensurePlan();
    useWorld.getState().setWorld(world(['a', 'b']));
    const second = useWorld.getState().ensurePlan();
    expect(second).not.toBe(first);
    expect(second.usernames.has('b')).toBe(true);
  });

  it('setClock은 개발용으로 시계를 빠르게 돌린다', () => {
    useWorld.getState().setClock(SERVER, 60);
    vi.advanceTimersByTime(1000);
    expect(useWorld.getState().now()).toBe(SERVER + 60_000);
  });

  it('건물 포커스는 층 숨김과 캐릭터 추적을 초기화한다', () => {
    const s = useWorld.getState();
    s.focusMember('a');
    s.setHiddenAboveFloor(1);
    s.focusBuilding('eng');
    expect(useWorld.getState()).toMatchObject({
      focusedBuilding: 'eng',
      hiddenAboveFloor: null,
      focusedMember: null,
    });
    useWorld.getState().focusMember('b');
    expect(useWorld.getState()).toMatchObject({ focusedBuilding: null, focusedMember: 'b' });
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -w @4this/web -- world`
Expected: FAIL — `Failed to resolve import "./world" from "src/store/world.test.ts"`

- [ ] **Step 4: 구현** — `apps/web/src/store/world.ts`

```ts
import { create } from 'zustand';
import {
  CAMPUS,
  DAY_MS,
  computeDay,
  kstDate,
  kstMidnight,
  type BuildingId,
  type DayPlan,
  type PublicMember,
  type WorldResponse,
} from '@4this/shared';
import { api } from '../api/endpoints';

/**
 * 월드 상태: 승인 멤버, 서버 시계, 오늘 DayPlan, 카메라 포커스.
 * 매 프레임 쓰는 값(plan, now)은 getState()로 읽어 React 렌더를 일으키지 않는다.
 */
export interface WorldState {
  members: PublicMember[];
  loaded: boolean;
  error: string | null;
  /** 시계: now = base + (Date.now() - realBase) * speed. 서버 시각으로 맞춘다 */
  clock: { base: number; realBase: number; speed: number };
  plan: DayPlan | null;
  /** plan이 유효한 마지막 순간 (다음 KST 자정) */
  planUntil: number;
  focusedBuilding: BuildingId | null;
  hiddenAboveFloor: number | null;
  /** 카메라가 따라가는 멤버 (접속자 목록 클릭·내 조종) */
  focusedMember: string | null;

  /** GET /api/world를 불러 멤버·시계·계획을 갱신한다 */
  load: () => Promise<void>;
  /** 응답(또는 개발용 픽스처)을 그대로 넣는다 */
  setWorld: (world: WorldResponse) => void;
  /** 서버 시각으로 시계를 다시 맞춘다 (소켓 time 이벤트) */
  syncClock: (serverTime: number) => void;
  /** 개발용: 시계를 start부터 speed배로 돌린다 */
  setClock: (start: number, speed: number) => void;
  /** 지금 시각 (서버 기준 epoch ms) */
  now: () => number;
  /** 지금 날짜의 계획. 날짜가 바뀌었으면 다시 계산한다 */
  ensurePlan: () => DayPlan;
  focusBuilding: (id: BuildingId | null) => void;
  setHiddenAboveFloor: (floor: number | null) => void;
  focusMember: (id: string | null) => void;
}

export const useWorld = create<WorldState>()((set, get) => ({
  members: [],
  loaded: false,
  error: null,
  clock: { base: Date.now(), realBase: Date.now(), speed: 1 },
  plan: null,
  planUntil: 0,
  focusedBuilding: null,
  hiddenAboveFloor: null,
  focusedMember: null,

  load: async () => {
    try {
      get().setWorld(await api.world());
    } catch {
      set({ error: '월드 정보를 불러오지 못했습니다', loaded: true });
    }
  },

  setWorld: (world) => {
    const realBase = Date.now();
    set((s) => ({
      members: world.members,
      loaded: true,
      error: null,
      clock: { base: world.serverTime, realBase, speed: s.clock.speed },
      plan: null,
      planUntil: 0,
    }));
    get().ensurePlan();
  },

  syncClock: (serverTime) => set({ clock: { base: serverTime, realBase: Date.now(), speed: 1 } }),

  setClock: (start, speed) => set({ clock: { base: start, realBase: Date.now(), speed } }),

  now: () => {
    const { base, realBase, speed } = get().clock;
    return base + (Date.now() - realBase) * speed;
  },

  ensurePlan: () => {
    const s = get();
    const t = s.now();
    if (s.plan && t < s.planUntil && t >= s.planUntil - DAY_MS) return s.plan;
    const date = kstDate(t);
    const plan = computeDay({ members: s.members, date, campus: CAMPUS });
    set({ plan, planUntil: kstMidnight(date) + DAY_MS });
    return plan;
  },

  focusBuilding: (id) => set({ focusedBuilding: id, hiddenAboveFloor: null, focusedMember: null }),
  setHiddenAboveFloor: (floor) => set({ hiddenAboveFloor: floor }),
  focusMember: (id) =>
    set({ focusedMember: id, focusedBuilding: id ? null : get().focusedBuilding }),
}));

/** 지금 시각 (서버 기준). 컴포넌트 밖에서도 쓸 수 있다 */
export const worldNow = () => useWorld.getState().now();
```

- [ ] **Step 5: 통과·타입 확인**

Run: `npm test -w @4this/web && npm run typecheck -w @4this/web`
Expected: PASS — web 11개(기존 5 + 6), 타입 에러 0

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/store/world.ts apps/web/src/store/world.test.ts
git commit -m "feat: 월드 스토어 — GET /world, 서버 시계 오프셋, 날짜별 DayPlan"
```

---

### Task 2: 움직임 보간·표시 값·층 점유·컷어웨이 가림 (순수 함수)

**Files:**
- Create: `apps/web/src/world/sim/motion.ts`, `apps/web/src/world/sim/occupancy.ts`
- Test: `apps/web/src/world/sim/motion.test.ts`, `apps/web/src/world/sim/occupancy.test.ts`

**Interfaces:**
- Consumes: `sampleAt`, `professorAt`, `PLACE_IDS`, `FloorKey`(`world/contracts.ts`)
- Produces: 위 `motion.ts`·`occupancy.ts` 목록

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/world/sim/motion.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Pose } from '@4this/shared';
import { HIDDEN_DISPLAY, damp, dampAngle, displayOf, sameDisplay, stepPosition } from './motion';

const pose = (over: Partial<Pose> = {}): Pose => ({
  position: [0, 0, 0],
  facing: 0,
  pose: 'walk',
  placeId: 'transit',
  floor: 1,
  status: '등교 중',
  opacity: 1,
  ...over,
});

describe('보간', () => {
  it('damp는 프레임을 나눠도 같은 곳에 닿는다', () => {
    const once = damp(0, 10, 12, 0.1);
    const twice = damp(damp(0, 10, 12, 0.05), 10, 12, 0.05);
    expect(twice).toBeCloseTo(once);
    expect(once).toBeGreaterThan(5);
    expect(once).toBeLessThan(10);
  });

  it('dampAngle은 짧은 쪽으로 돈다 (π 근처를 넘어갈 때)', () => {
    const next = dampAngle(Math.PI - 0.1, -Math.PI + 0.1, 10, 1);
    expect(next).toBeGreaterThan(Math.PI - 0.1);
  });

  it('stepPosition은 처음이거나 2.5 m 넘게 튀면 바로 옮긴다', () => {
    expect(stepPosition([0, 0, 0], [1, 0, 0], 1 / 60)[0]).toBeLessThan(1);
    expect(stepPosition([0, 0, 0], [1, 0, 0], 1 / 60, true)).toEqual([1, 0, 0]);
    expect(stepPosition([0, 0, 0], [0, 3.2, 0], 1 / 60)).toEqual([0, 3.2, 0]);
  });
});

describe('displayOf', () => {
  it('부재·가려짐은 숨김', () => {
    expect(displayOf(null)).toBe(HIDDEN_DISPLAY);
    expect(displayOf(pose(), true)).toBe(HIDDEN_DISPLAY);
  });

  it('투명도를 0.1 단위로 끊어 렌더 횟수를 줄인다', () => {
    expect(displayOf(pose({ opacity: 0.43 })).opacity).toBe(0.4);
    expect(
      sameDisplay(displayOf(pose({ opacity: 0.41 })), displayOf(pose({ opacity: 0.44 }))),
    ).toBe(true);
    expect(sameDisplay(displayOf(pose()), displayOf(pose({ pose: 'stand' })))).toBe(false);
    expect(displayOf(pose({ opacity: 0.02 })).visible).toBe(false);
  });
});
```

`apps/web/src/world/sim/occupancy.test.ts` (14:35는 교수님이 기지개를 켜지 않는 시각이다 — 매 15분 정각부터 20초는 `기지개 쭉~`):

```ts
import { describe, expect, it } from 'vitest';
import { CAMPUS, DEFAULT_LOOK, computeDay, type Pose, type PublicMember } from '@4this/shared';
import {
  PROFESSOR_ID,
  hiddenByCutaway,
  occupiedFloors,
  peopleIn,
  sameFloors,
  snapshotAt,
} from './occupancy';

// 14:35: 교수님이 기지개(15분마다 20초)를 켜지 않는 시각
const WED_1435 = Date.parse('2026-10-21T14:35:00+09:00');

const members: PublicMember[] = [
  {
    id: 'a',
    username: '철수',
    look: DEFAULT_LOOK,
    schedules: [{ day: 2, start: '14:00', end: '16:00', kind: 'lecture2', title: '자료구조' }],
  },
  {
    id: 'b',
    username: '영희',
    look: DEFAULT_LOOK,
    schedules: [{ day: 2, start: '14:00', end: '15:00', kind: 'lecture3' }],
  },
  {
    id: 'c',
    username: '지우',
    look: DEFAULT_LOOK,
    schedules: [{ day: 2, start: '14:00', end: '15:00', kind: 'external' }],
  },
];

const plan = computeDay({ members, date: '2026-10-21', campus: CAMPUS });

describe('snapshotAt · occupiedFloors', () => {
  it('강의실과 교수님 자리의 층을 모은다', () => {
    const snap = snapshotAt(plan, members, WED_1435, CAMPUS);
    expect(snap.map((s) => s.id)).toEqual(['a', 'b', 'c', PROFESSOR_ID]);
    expect(occupiedFloors(snap, CAMPUS)).toEqual(new Set(['eng:2', 'eng:3', 'lab:2']));
  });

  it('밤에는 비어 있다', () => {
    const night = Date.parse('2026-10-21T23:00:00+09:00');
    expect(occupiedFloors(snapshotAt(plan, members, night, CAMPUS), CAMPUS).size).toBe(0);
  });

  it('sameFloors는 내용으로 비교한다', () => {
    expect(sameFloors(new Set(['eng:1']), new Set(['eng:1']))).toBe(true);
    expect(sameFloors(new Set(['eng:1']), new Set(['eng:2']))).toBe(false);
  });
});

describe('peopleIn', () => {
  it('그 건물에 있는 사람을 층 순서로', () => {
    const snap = snapshotAt(plan, members, WED_1435, CAMPUS);
    expect(peopleIn(snap, 'eng', CAMPUS)).toEqual([
      { id: 'a', username: '철수', status: '2학년 강의 · 자료구조', floor: 2 },
      { id: 'b', username: '영희', status: '3학년 강의', floor: 3 },
    ]);
    expect(peopleIn(snap, 'lab', CAMPUS)).toEqual([
      { id: PROFESSOR_ID, username: '사자 교수님', status: '교수님', floor: 2 },
    ]);
  });
});

describe('hiddenByCutaway', () => {
  const upstairs: Pose = {
    position: [15, 6.4, -2],
    facing: 0,
    pose: 'sitType',
    placeId: 'eng-3f',
    floor: 3,
    status: '',
    opacity: 1,
  };

  it('다가간 건물의 숨긴 층 위에 있으면 가린다', () => {
    expect(hiddenByCutaway(upstairs, 'eng', 2, CAMPUS)).toBe(true);
    expect(hiddenByCutaway(upstairs, 'eng', 3, CAMPUS)).toBe(false);
    expect(hiddenByCutaway(upstairs, 'eng', null, CAMPUS)).toBe(false);
    expect(hiddenByCutaway(upstairs, 'main', 1, CAMPUS)).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/web -- sim`
Expected: FAIL — `Failed to resolve import "./motion"` / `"./occupancy"`

- [ ] **Step 3: 구현**

`apps/web/src/world/sim/motion.ts`:

```ts
import type { Pose, PoseKind } from '@4this/shared';

export type Vec3 = [number, number, number];

/** 위치가 목표를 따라가는 빠르기 (1/초). 클수록 바로 붙는다 */
export const POSITION_RATE = 12;
/** 방향이 목표를 따라가는 빠르기 (1/초) */
export const FACING_RATE = 10;
/** 목표가 이보다 멀리 튀면(층 이동·정문 출입) 보간하지 않고 옮긴다 (m) */
export const SNAP_DISTANCE = 2.5;

/** 지수 감쇠 보간: 프레임 속도와 상관없이 같은 빠르기로 목표에 다가간다 */
export function damp(current: number, target: number, rate: number, dt: number): number {
  return target + (current - target) * Math.exp(-rate * dt);
}

/** 각도 보간. 짧은 쪽으로 돈다 */
export function dampAngle(current: number, target: number, rate: number, dt: number): number {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * (1 - Math.exp(-rate * dt));
}

/** 현재 위치에서 목표로 한 프레임만큼 다가간 위치. 처음이거나 멀리 튀면 바로 옮긴다 */
export function stepPosition(current: Vec3, target: Vec3, dt: number, first = false): Vec3 {
  const d = Math.hypot(target[0] - current[0], target[1] - current[1], target[2] - current[2]);
  if (first || d > SNAP_DISTANCE) return [target[0], target[1], target[2]];
  return [
    damp(current[0], target[0], POSITION_RATE, dt),
    damp(current[1], target[1], POSITION_RATE, dt),
    damp(current[2], target[2], POSITION_RATE, dt),
  ];
}

/** React state로 들고 있는 표시 값. 바뀔 때만 setState 한다 */
export interface DisplayState {
  visible: boolean;
  pose: PoseKind;
  status: string;
  /** 0.1 단위로 끊어 페이드 중에도 렌더가 몇 번만 일어나게 한다 */
  opacity: number;
}

export const HIDDEN_DISPLAY: DisplayState = {
  visible: false,
  pose: 'idle',
  status: '',
  opacity: 0,
};

/** 샘플 결과 → 표시 값. 부재(null)이거나 컷어웨이로 가려지면 보이지 않는다 */
export function displayOf(pose: Pose | null, hidden = false): DisplayState {
  if (!pose || hidden) return HIDDEN_DISPLAY;
  const opacity = Math.round(pose.opacity * 10) / 10;
  return { visible: opacity > 0, pose: pose.pose, status: pose.status, opacity };
}

export function sameDisplay(a: DisplayState, b: DisplayState): boolean {
  return (
    a.visible === b.visible && a.pose === b.pose && a.status === b.status && a.opacity === b.opacity
  );
}
```

`apps/web/src/world/sim/occupancy.ts`:

```ts
import {
  PLACE_IDS,
  professorAt,
  sampleAt,
  type BuildingId,
  type Campus,
  type DayPlan,
  type PlaceId,
  type Pose,
  type PublicMember,
} from '@4this/shared';
import type { FloorKey } from '../contracts';

const PLACES: ReadonlySet<string> = new Set(PLACE_IDS);

export const PROFESSOR_ID = 'professor';
export const PROFESSOR_NAME = '사자 교수님';

export interface Snapshot {
  id: string;
  username: string;
  pose: Pose | null;
}

/** 시각 t에 모든 멤버(+ 사자 교수님)가 어디 있는지 */
export function snapshotAt(
  plan: DayPlan,
  members: readonly PublicMember[],
  t: number,
  campus: Campus,
): Snapshot[] {
  return [
    ...members.map((m) => ({ id: m.id, username: m.username, pose: sampleAt(plan, m.id, t) })),
    { id: PROFESSOR_ID, username: PROFESSOR_NAME, pose: professorAt(t, campus) },
  ];
}

/** 장소(강의실·식당 등)에 있는 포즈면 그 건물. 걷는 중·바깥이면 null */
export function buildingOf(pose: Pose | null, campus: Campus): BuildingId | null {
  if (!pose || !PLACES.has(pose.placeId)) return null;
  return campus.places[pose.placeId as PlaceId].building;
}

/** 사람이 있는 층들 ('eng:2'). 밤에 창문 불빛을 켤 때 쓴다 */
export function occupiedFloors(snapshot: readonly Snapshot[], campus: Campus): Set<FloorKey> {
  const floors = new Set<FloorKey>();
  for (const { pose } of snapshot) {
    const building = buildingOf(pose, campus);
    if (building && pose) floors.add(`${building}:${pose.floor}`);
  }
  return floors;
}

export function sameFloors(a: ReadonlySet<FloorKey>, b: ReadonlySet<FloorKey>): boolean {
  if (a.size !== b.size) return false;
  for (const key of a) if (!b.has(key)) return false;
  return true;
}

/** 건물 패널: 지금 그 건물에 있는 사람. 층, 이름 순 */
export function peopleIn(
  snapshot: readonly Snapshot[],
  building: BuildingId,
  campus: Campus,
): { id: string; username: string; status: string; floor: number }[] {
  return snapshot
    .filter((s) => buildingOf(s.pose, campus) === building)
    .map((s) => ({ id: s.id, username: s.username, status: s.pose!.status, floor: s.pose!.floor }))
    .sort((a, b) => a.floor - b.floor || (a.username < b.username ? -1 : 1));
}

/** 다가간 건물에서 숨긴 층보다 위에 있는 캐릭터는 그리지 않는다 */
export function hiddenByCutaway(
  pose: Pose,
  focused: BuildingId | null,
  hiddenAboveFloor: number | null,
  campus: Campus,
): boolean {
  if (!focused || hiddenAboveFloor === null || pose.floor <= hiddenAboveFloor) return false;
  const { min, max } = campus.buildings[focused];
  const [x, , z] = pose.position;
  return x >= min[0] && x <= max[0] && z >= min[1] && z <= max[1];
}
```

- [ ] **Step 4: 통과·타입 확인**

Run: `npm test -w @4this/web && npm run typecheck -w @4this/web`
Expected: PASS — 21개, 타입 에러 0

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/world/sim
git commit -m "feat: 이동 보간·표시 값·층 점유·컷어웨이 가림 순수 함수"
```

---

### Task 3: 시계·하늘·위치 문구·교수님 대사·카메라 목표 (순수 함수)

**Files:**
- Create: `apps/web/src/world/sim/labels.ts`, `apps/web/src/world/sim/camera.ts`
- Test: `apps/web/src/world/sim/labels.test.ts`, `apps/web/src/world/sim/camera.test.ts`

**Interfaces:**
- Consumes: `WEEKDAY_LABELS`, `kstWeekday`, `kstMinutes`, `kstDate`, `fromMinutes`, `rand01`, `FLOOR_HEIGHT`
- Produces: 위 `labels.ts`·`camera.ts` 목록. 하늘 아이콘 경계는 스펙 §5.5(06/09/17/19시)

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/world/sim/labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CAMPUS, type Pose } from '@4this/shared';
import { PROFESSOR_LINES, describeWhere, formatClock, professorLine, skyIconAt } from './labels';

const kst = (hhmm: string) => Date.parse(`2026-10-21T${hhmm}:00+09:00`);

describe('시계와 하늘', () => {
  it("'수 14:10'처럼 요일과 KST 시각", () => {
    expect(formatClock(kst('14:10'))).toBe('수 14:10');
    expect(formatClock(Date.parse('2026-10-21T15:05:00Z'))).toBe('목 00:05');
  });

  it('시간대별 하늘 아이콘', () => {
    expect(skyIconAt(kst('07:00'))).toBe('🌅');
    expect(skyIconAt(kst('12:00'))).toBe('☀️');
    expect(skyIconAt(kst('18:00'))).toBe('🌇');
    expect(skyIconAt(kst('23:00'))).toBe('🌙');
    expect(skyIconAt(kst('05:59'))).toBe('🌙');
  });
});

describe('describeWhere', () => {
  const base: Pose = {
    position: [0, 0, 0],
    facing: 0,
    pose: 'sitType',
    placeId: 'eng-2f',
    floor: 2,
    status: '2학년 강의',
    opacity: 1,
  };

  it('건물·층·이름표', () => {
    expect(describeWhere(base, CAMPUS)).toBe('공학관 2층 · 2학년 강의');
    expect(describeWhere({ ...base, placeId: 'cafe', floor: 1, status: '카페 ☕' }, CAMPUS)).toBe(
      '카페 · 카페 ☕',
    );
    expect(describeWhere({ ...base, placeId: 'park', status: '공강' }, CAMPUS)).toBe('공원 · 공강');
    expect(describeWhere({ ...base, placeId: 'transit', status: '등교 중' }, CAMPUS)).toBe(
      '이동 중 · 등교 중',
    );
    expect(describeWhere(null, CAMPUS)).toBe('캠퍼스 밖');
  });
});

describe('professorLine', () => {
  it('정해진 문구 중 하나, 같은 날·같은 횟수면 같다', () => {
    const t = kst('10:00');
    expect(PROFESSOR_LINES).toContain(professorLine(t, 0));
    expect(professorLine(t, 3)).toBe(professorLine(kst('15:00'), 3));
    const lines = new Set(Array.from({ length: 20 }, (_, i) => professorLine(t, i)));
    expect(lines.size).toBeGreaterThan(1);
  });
});
```

`apps/web/src/world/sim/camera.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CAMPUS } from '@4this/shared';
import { FOLLOW_DISTANCE, buildingGoal, followPosition } from './camera';

describe('buildingGoal', () => {
  it('건물 가운데를 남동쪽 위에서 본다', () => {
    const goal = buildingGoal('eng', CAMPUS);
    expect(goal.target[0]).toBe(16);
    expect(goal.target[1]).toBeCloseTo(4.8);
    expect(goal.target[2]).toBe(-2);
    expect(goal.position[0]).toBeGreaterThan(goal.target[0]);
    expect(goal.position[1]).toBeGreaterThan(goal.target[1]);
    expect(goal.position[2]).toBeGreaterThan(goal.target[2]);
  });
});

describe('followPosition', () => {
  it('멀면 FOLLOW_DISTANCE 쪽으로 당기고, 가까우면 그대로', () => {
    const far = followPosition([0, 0, 40], [0, 0, 0], 1);
    expect(far[2]).toBeCloseTo(FOLLOW_DISTANCE);
    expect(followPosition([0, 0, 10], [0, 0, 0], 1)).toEqual([0, 0, 10]);
    const half = followPosition([0, 0, 40], [0, 0, 0], 0.5);
    expect(half[2]).toBeCloseTo((40 + FOLLOW_DISTANCE) / 2);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/web -- sim`
Expected: FAIL — `Failed to resolve import "./labels"` / `"./camera"`

- [ ] **Step 3: 구현**

`apps/web/src/world/sim/labels.ts`:

```ts
import {
  PLACE_IDS,
  WEEKDAY_LABELS,
  fromMinutes,
  kstDate,
  kstMinutes,
  kstWeekday,
  rand01,
  type Animal,
  type Campus,
  type PlaceId,
  type Pose,
} from '@4this/shared';

/** 상단 시계 '수 14:10' (KST) */
export function formatClock(t: number): string {
  return `${WEEKDAY_LABELS[kstWeekday(t)]} ${fromMinutes(kstMinutes(t))}`;
}

/** 하늘 아이콘: 06–09 아침, 09–17 낮, 17–19 노을, 19–06 밤 (§5.5) */
export function skyIconAt(t: number): string {
  const h = kstMinutes(t) / 60;
  if (h >= 6 && h < 9) return '🌅';
  if (h >= 9 && h < 17) return '☀️';
  if (h >= 17 && h < 19) return '🌇';
  return '🌙';
}

export const ANIMAL_ICON: Record<Animal | 'lion', string> = {
  dog: '🐶',
  cat: '🐱',
  bear: '🐻',
  duck: '🦆',
  lion: '🦁',
};

const PLACES: ReadonlySet<string> = new Set(PLACE_IDS);

/** "누가 어디 있나" 한 줄 (WebGL 미지원 목록) */
export function describeWhere(pose: Pose | null, campus: Campus): string {
  if (!pose) return '캠퍼스 밖';
  if (PLACES.has(pose.placeId)) {
    const b = campus.buildings[campus.places[pose.placeId as PlaceId].building];
    const where = b.floors > 1 ? `${b.name} ${pose.floor}층` : b.name;
    return `${where} · ${pose.status}`;
  }
  switch (pose.placeId) {
    case 'park':
      return `공원 · ${pose.status}`;
    case 'door':
      return `건물 앞 · ${pose.status}`;
    case 'gate':
      return `정문 · ${pose.status}`;
    default:
      return `이동 중 · ${pose.status}`;
  }
}

/** 사자 교수님 말풍선 문구 (§6.4) */
export const PROFESSOR_LINES = [
  '오늘도 연구 열심히!',
  '논문은 잘 되어 가나?',
  '커피 한 잔 하고 하게나.',
  '질문은 언제든 환영이야.',
  '실험 결과 기대하고 있네!',
] as const;

/** 클릭할 때마다 바뀌는 한 줄. 같은 날·같은 횟수면 모두에게 같은 문구 */
export function professorLine(t: number, clicks: number): string {
  return PROFESSOR_LINES[
    Math.floor(rand01('professor', kstDate(t), clicks) * PROFESSOR_LINES.length)
  ]!;
}
```

`apps/web/src/world/sim/camera.ts`:

```ts
import { FLOOR_HEIGHT, type BuildingId, type Campus } from '@4this/shared';
import type { Vec3 } from './motion';

export interface CameraGoal {
  target: Vec3;
  position: Vec3;
}

/** 처음 화면: 남동쪽 위에서 캠퍼스 전체를 본다 */
export const OVERVIEW: CameraGoal = { target: [0, 0, 0], position: [38, 34, 40] };

/** 캐릭터를 따라갈 때 카메라와 캐릭터 사이 거리 (m) */
export const FOLLOW_DISTANCE = 16;

/** 건물을 클릭했을 때 카메라가 다가갈 곳: 건물 가운데를 남동쪽 위에서 본다 */
export function buildingGoal(id: BuildingId, campus: Campus): CameraGoal {
  const b = campus.buildings[id];
  const w = b.max[0] - b.min[0];
  const d = b.max[1] - b.min[1];
  const h = b.floors * FLOOR_HEIGHT;
  const target: Vec3 = [(b.min[0] + b.max[0]) / 2, h / 2, (b.min[1] + b.max[1]) / 2];
  const distance = Math.max(w, d, h) * 1.2 + 10;
  const dir = [0.55, 0.6, 0.58];
  const len = Math.hypot(dir[0]!, dir[1]!, dir[2]!);
  return {
    target,
    position: [
      target[0] + (dir[0]! / len) * distance,
      target[1] + (dir[1]! / len) * distance,
      target[2] + (dir[2]! / len) * distance,
    ],
  };
}

/** 따라가기: 카메라가 목표보다 멀면 FOLLOW_DISTANCE까지 천천히 당긴다. 새 카메라 위치 */
export function followPosition(camera: Vec3, target: Vec3, k: number): Vec3 {
  const off: Vec3 = [camera[0] - target[0], camera[1] - target[1], camera[2] - target[2]];
  const len = Math.hypot(...off);
  if (len <= FOLLOW_DISTANCE || len === 0) return camera;
  const want = len + (FOLLOW_DISTANCE - len) * k;
  return [
    target[0] + (off[0] / len) * want,
    target[1] + (off[1] / len) * want,
    target[2] + (off[2] / len) * want,
  ];
}
```

- [ ] **Step 4: 통과·타입 확인**

Run: `npm test -w @4this/web && npm run typecheck -w @4this/web`
Expected: PASS — 27개

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/world/sim
git commit -m "feat: 시계·하늘 아이콘·위치 문구·교수님 대사·카메라 목표"
```

---

### Task 4: 오버레이 — 상단 시계와 건물 패널

**Files:**
- Create: `apps/web/src/store/clock.ts`
- Modify: `apps/web/src/store/overlay.ts`
- Test: `apps/web/src/store/overlay.test.ts`

**Interfaces:**
- Consumes: `useWorld`, `formatClock`, `skyIconAt`, `peopleIn`, `snapshotAt`, `OverlayProps`/`BuildingPanelProps`(`ui/contracts.ts`)
- Produces: `useNow(intervalMs)`. `useOverlayProps()`의 `topBar = { clock: '수 14:10', skyIcon }`(1초마다), `building = { building, name, floors, hiddenAboveFloor, onFloor: setHiddenAboveFloor, people, onClose: () => focusBuilding(null) } | null`

- [ ] **Step 1: 실패하는 테스트 작성** — `apps/web/src/store/overlay.test.ts`

```ts
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOOK } from '@4this/shared';
import { useOverlayProps } from './overlay';
import { useWorld } from './world';

const WED_1410 = Date.parse('2026-10-21T14:10:00+09:00');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(WED_1410);
  useWorld.setState(useWorld.getInitialState(), true);
  useWorld.getState().setWorld({
    serverTime: WED_1410,
    members: [
      {
        id: 'a',
        username: '철수',
        look: DEFAULT_LOOK,
        schedules: [{ day: 2, start: '14:00', end: '16:00', kind: 'lecture2', title: '자료구조' }],
      },
    ],
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useOverlayProps (cw#3 범위)', () => {
  it("상단 시계는 '수 14:10'과 낮 아이콘, 1초마다 갱신", () => {
    const { result } = renderHook(() => useOverlayProps());
    expect(result.current.topBar).toEqual({ clock: '수 14:10', skyIcon: '☀️' });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.topBar.clock).toBe('수 14:11');
  });

  it('건물을 누르기 전에는 building이 없다', () => {
    const { result } = renderHook(() => useOverlayProps());
    expect(result.current.building).toBeNull();
  });

  it('건물 패널: 지금 있는 사람·층 버튼·닫기', () => {
    const { result } = renderHook(() => useOverlayProps());
    act(() => useWorld.getState().focusBuilding('eng'));
    const panel = result.current.building!;
    expect(panel).toMatchObject({
      building: 'eng',
      name: '공학관',
      floors: 3,
      hiddenAboveFloor: null,
    });
    expect(panel.people).toEqual([
      { id: 'a', username: '철수', status: '2학년 강의 · 자료구조', floor: 2 },
    ]);

    act(() => panel.onFloor(1));
    expect(result.current.building?.hiddenAboveFloor).toBe(1);
    act(() => result.current.building!.onClose());
    expect(result.current.building).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/web -- overlay`
Expected: FAIL — `expected { clock: '', skyIcon: '☀️' } to deeply equal { clock: '수 14:10', skyIcon: '☀️' }`

- [ ] **Step 3: 구현**

`apps/web/src/store/clock.ts`:

```ts
import { useEffect, useState } from 'react';
import { useWorld } from './world';

/**
 * intervalMs마다 지금 시각(서버 기준)으로 다시 렌더한다. 시계·패널처럼 느리게 바뀌는 화면용.
 * 날짜가 바뀌었으면 이때 계획도 새로 만든다.
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => useWorld.getState().now());
  useEffect(() => {
    const tick = () => {
      useWorld.getState().ensurePlan();
      setNow(useWorld.getState().now());
    };
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
```

`apps/web/src/store/overlay.ts` 전체:

```ts
import { CAMPUS } from '@4this/shared';
import type { BuildingPanelProps, OverlayProps } from '../ui/contracts';
import { formatClock, skyIconAt } from '../world/sim/labels';
import { peopleIn, snapshotAt } from '../world/sim/occupancy';
import { useNow } from './clock';
import { useWorld } from './world';

const noop = () => {};

/**
 * 오버레이에 넣을 실시간 데이터와 핸들러. th의 UiRoot가 부른다.
 * cw#3: 상단 시계·하늘 아이콘, 건물 패널. cw#4에서 접속자·조종·이모지·게시판·연결 상태를 채운다.
 */
export function useOverlayProps(): OverlayProps {
  const t = useNow(1000);
  const members = useWorld((s) => s.members);
  const plan = useWorld((s) => s.plan);
  const focusedBuilding = useWorld((s) => s.focusedBuilding);
  const hiddenAboveFloor = useWorld((s) => s.hiddenAboveFloor);
  const focusBuilding = useWorld((s) => s.focusBuilding);
  const setHiddenAboveFloor = useWorld((s) => s.setHiddenAboveFloor);

  let building: BuildingPanelProps | null = null;
  if (focusedBuilding) {
    const b = CAMPUS.buildings[focusedBuilding];
    building = {
      building: focusedBuilding,
      name: b.name,
      floors: b.floors,
      hiddenAboveFloor,
      onFloor: setHiddenAboveFloor,
      people: plan ? peopleIn(snapshotAt(plan, members, t, CAMPUS), focusedBuilding, CAMPUS) : [],
      onClose: () => focusBuilding(null),
    };
  }

  return {
    topBar: { clock: formatClock(t), skyIcon: skyIconAt(t) },
    presence: { entries: [], spectators: 0, collapsed: false, onToggle: noop, onSelect: noop },
    emoteBar: { disabled: true, onEmote: noop },
    control: { controlling: false, disabled: true, onStart: noop, onStop: noop },
    connection: { state: 'connected' },
    board: null,
    building,
    canControl: false,
  };
}
```

- [ ] **Step 4: 통과·타입 확인**

Run: `npm test -w @4this/web && npm run typecheck -w @4this/web`
Expected: PASS — 30개

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/store
git commit -m "feat: 오버레이 상단 시계·하늘 아이콘·건물 패널 데이터"
```

---

### Task 5: WebGL 미지원 텍스트 목록 (§10)

**Files:**
- Create: `apps/web/src/world/sim/webgl.ts`, `apps/web/src/world/sim/TextFallback.tsx`
- Test: `apps/web/src/world/sim/TextFallback.test.tsx`

**Interfaces:**
- Consumes: `useWorld`, `sampleAt`, `ANIMAL_ICON`, `describeWhere`, `formatClock`
- Produces: `hasWebGL(): boolean`, `<TextFallback />` — 5초마다(멤버가 바뀌면 즉시) `🐶 철수 — 공학관 2층 · 2학년 강의` 형태로 다시 그린다

- [ ] **Step 1: 실패하는 테스트 작성** — `apps/web/src/world/sim/TextFallback.test.tsx`

```tsx
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOOK } from '@4this/shared';
import { useWorld } from '../../store/world';
import { TextFallback } from './TextFallback';
import { hasWebGL } from './webgl';

const WED_1435 = Date.parse('2026-10-21T14:35:00+09:00');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(WED_1435);
  useWorld.setState(useWorld.getInitialState(), true);
  useWorld.getState().setWorld({
    serverTime: WED_1435,
    members: [
      {
        id: 'a',
        username: '철수',
        look: DEFAULT_LOOK,
        schedules: [{ day: 2, start: '14:00', end: '16:00', kind: 'lecture2' }],
      },
      { id: 'b', username: '영희', look: { ...DEFAULT_LOOK, animal: 'duck' }, schedules: [] },
    ],
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('TextFallback', () => {
  it('jsdom에는 WebGL이 없다', () => {
    expect(hasWebGL()).toBe(false);
  });

  it('누가 어디 있는지 목록으로 보여 준다', () => {
    render(<TextFallback />);
    expect(screen.getByText(/3D 캠퍼스를 표시할 수 없어요/)).toBeTruthy();
    expect(screen.getByText('철수').parentElement?.textContent).toBe(
      '🐶 철수 — 공학관 2층 · 2학년 강의',
    );
    expect(screen.getByText('영희').parentElement?.textContent).toBe('🦆 영희 — 캠퍼스 밖');
  });

  it('5초마다 새로 계산한다', () => {
    render(<TextFallback />);
    vi.setSystemTime(Date.parse('2026-10-21T16:10:00+09:00'));
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByText('철수').parentElement?.textContent).toBe('🐶 철수 — 캠퍼스 밖');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/web -- TextFallback`
Expected: FAIL — `Failed to resolve import "./TextFallback"`

- [ ] **Step 3: 구현**

`apps/web/src/world/sim/webgl.ts`:

```ts
/** 브라우저가 WebGL을 쓸 수 있는지. 안 되면 텍스트 목록으로 대신한다 (§10) */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
```

`apps/web/src/world/sim/TextFallback.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { CAMPUS, sampleAt } from '@4this/shared';
import { useWorld } from '../../store/world';
import { ANIMAL_ICON, describeWhere, formatClock } from './labels';

interface Row {
  id: string;
  icon: string;
  username: string;
  where: string;
}

const card = {
  maxWidth: 480,
  margin: '48px auto',
  padding: 24,
  background: 'var(--card)',
  borderRadius: 'var(--radius-lg)',
  boxShadow: 'var(--shadow)',
} as const;

/** WebGL을 못 쓸 때: sampleAt 결과로 "누가 어디 있나" 목록 (5초마다 갱신) */
export function TextFallback() {
  const [state, setState] = useState<{ clock: string; rows: Row[] }>({ clock: '', rows: [] });

  useEffect(() => {
    const tick = () => {
      const world = useWorld.getState();
      const t = world.now();
      const plan = world.ensurePlan();
      setState({
        clock: formatClock(t),
        rows: world.members.map((m) => ({
          id: m.id,
          icon: ANIMAL_ICON[m.look.animal],
          username: m.username,
          where: describeWhere(sampleAt(plan, m.id, t), CAMPUS),
        })),
      });
    };
    tick();
    const id = setInterval(tick, 5000);
    const unsub = useWorld.subscribe((s, prev) => {
      if (s.members !== prev.members) tick();
    });
    return () => {
      clearInterval(id);
      unsub();
    };
  }, []);

  return (
    <main style={card}>
      <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>3D 캠퍼스를 표시할 수 없어요</h1>
      <p style={{ margin: '0 0 16px', color: 'var(--ink-soft)' }}>
        이 브라우저는 WebGL을 지원하지 않아 목록으로 보여 드려요. ({state.clock})
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 1.9 }}>
        {state.rows.map((r) => (
          <li key={r.id}>
            {r.icon} <strong>{r.username}</strong> — {r.where}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -w @4this/web && npm run typecheck -w @4this/web`
Expected: PASS — 33개 (jsdom이 `HTMLCanvasElement.getContext` 미구현 경고를 stderr에 찍는 것은 정상)

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/world/sim
git commit -m "feat: WebGL 미지원 시 '누가 어디 있나' 텍스트 목록"
```

---

### Task 6: 3D 시뮬레이션 — 멤버·교수님·카메라·Campus 연결

단위 테스트는 Task 2~3의 순수 함수가 맡고, 이 Task는 타입체크·빌드·화면 확인으로 검증한다.

**Files:**
- Create: `apps/web/src/world/sim/registry.ts`, `apps/web/src/world/sim/resolvePose.ts`, `apps/web/src/world/sim/MemberAvatar.tsx`, `apps/web/src/world/sim/SimMembers.tsx`, `apps/web/src/world/sim/Professor.tsx`, `apps/web/src/world/sim/CameraRig.tsx`, `apps/web/src/world/sim/useWorldTick.ts`
- Modify: `apps/web/src/world/WorldCanvas.tsx`

**Interfaces:**
- Consumes: `Character`(th, `ref`·`look`·`pose`·`name`·`status`·`opacity`·`highlight`·`onClick`), `Campus`(hm, `CampusProps`), `PROFESSOR_LOOK`, `useSession`, Task 1~5 전부
- Produces: `registry.ts`, `resolvePose.ts`(cw#3 판: `sampleAt` 그대로), `WorldCanvas({ autoLoad, children })`
- 동작: 처음 나타날 때·2.5 m 넘게 튈 때(층 이동·정문 출입, 이때는 투명도 0)는 바로 옮기고, 그 밖에는 지수 감쇠로 따라간다. 부재(`null`)·컷어웨이로 숨긴 층이면 `group.visible = false`. 내 캐릭터는 `highlight`. 캐릭터를 누르면 `focusMember(id)` → 카메라가 따라간다(16 m까지 당김). 건물을 누르면 `focusBuilding(id)` → 카메라가 건물로 다가가고 도착하면 자유 회전

- [ ] **Step 1: 객체 등록·포즈 결정**

`apps/web/src/world/sim/registry.ts`:

```ts
import type { Object3D } from 'three';

/** 멤버 아이디 → 화면의 캐릭터 객체. 카메라 추적·E2E 조회가 읽는다 */
export const memberObjects = new Map<string, Object3D>();

export function registerMember(id: string, object: Object3D | null): void {
  if (object) memberObjects.set(id, object);
  else memberObjects.delete(id);
}
```

`apps/web/src/world/sim/resolvePose.ts`:

```ts
import { sampleAt, type Pose } from '@4this/shared';
import { useWorld } from '../../store/world';

/**
 * 멤버가 시각 t에 보여야 할 모습. 매 프레임 MemberAvatar가 부른다.
 * cw#3: placement 결과 그대로. cw#4에서 직접 조종·복귀 걷기를 먼저 확인하도록 넓힌다.
 */
export function resolvePose(memberId: string, t: number): Pose | null {
  return sampleAt(useWorld.getState().ensurePlan(), memberId, t);
}
```

- [ ] **Step 2: 멤버 캐릭터**

`apps/web/src/world/sim/MemberAvatar.tsx`:

```tsx
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { Group } from 'three';
import { CAMPUS, type PublicMember } from '@4this/shared';
import { useSession } from '../../store/session';
import { useWorld } from '../../store/world';
import { Character } from '../characters/Character';
import {
  FACING_RATE,
  HIDDEN_DISPLAY,
  dampAngle,
  displayOf,
  sameDisplay,
  stepPosition,
  type DisplayState,
} from './motion';
import { hiddenByCutaway } from './occupancy';
import { registerMember } from './registry';
import { resolvePose } from './resolvePose';

/**
 * 멤버 한 명. 매 프레임 resolvePose → ref의 위치·방향을 부드럽게 맞춘다.
 * 포즈·이름표·투명도는 바뀔 때만 React state로 올린다 (매 프레임 setState 금지).
 */
export function MemberAvatar({ member }: { member: PublicMember }) {
  const ref = useRef<Group>(null);
  const placed = useRef(false);
  const shown = useRef<DisplayState>(HIDDEN_DISPLAY);
  const [display, setDisplay] = useState<DisplayState>(HIDDEN_DISPLAY);
  const isMe = useSession((s) => s.session.kind === 'member' && s.session.me.id === member.id);
  const focusMember = useWorld((s) => s.focusMember);

  useEffect(() => {
    registerMember(member.id, ref.current);
    return () => registerMember(member.id, null);
  }, [member.id]);

  useFrame((_, dt) => {
    const group = ref.current;
    if (!group) return;
    const world = useWorld.getState();
    const pose = resolvePose(member.id, world.now());
    const hidden =
      pose !== null && hiddenByCutaway(pose, world.focusedBuilding, world.hiddenAboveFloor, CAMPUS);
    const next = displayOf(pose, hidden);
    if (!sameDisplay(next, shown.current)) {
      shown.current = next;
      setDisplay(next);
    }
    group.visible = next.visible;
    if (!pose) {
      placed.current = false;
      return;
    }
    const p = group.position;
    const [x, y, z] = stepPosition([p.x, p.y, p.z], pose.position, dt, !placed.current);
    p.set(x, y, z);
    group.rotation.y = placed.current
      ? dampAngle(group.rotation.y, pose.facing, FACING_RATE, dt)
      : pose.facing;
    placed.current = true;
  });

  return (
    <Character
      ref={ref}
      look={member.look}
      pose={display.pose}
      name={member.username}
      status={display.status}
      opacity={display.opacity}
      highlight={isMe}
      onClick={() => focusMember(member.id)}
    />
  );
}
```

`apps/web/src/world/sim/SimMembers.tsx`:

```tsx
import { useWorld } from '../../store/world';
import { MemberAvatar } from './MemberAvatar';

/** 승인된 멤버마다 캐릭터 하나 */
export function SimMembers() {
  const members = useWorld((s) => s.members);
  return (
    <>
      {members.map((m) => (
        <MemberAvatar key={m.id} member={m} />
      ))}
    </>
  );
}
```

- [ ] **Step 3: 사자 교수님** — 위치는 바깥 group을 움직이고, 말풍선은 drei `Html`로 머리 위에 4초 띄운다(Character의 `emote`는 이모지 전용이라 쓰지 않는다)

`apps/web/src/world/sim/Professor.tsx`:

```tsx
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { Group } from 'three';
import { CAMPUS, professorAt } from '@4this/shared';
import { useWorld } from '../../store/world';
import { Character } from '../characters/Character';
import { PROFESSOR_LOOK } from '../contracts';
import { professorLine } from './labels';
import { HIDDEN_DISPLAY, displayOf, sameDisplay, type DisplayState } from './motion';
import { PROFESSOR_NAME, hiddenByCutaway } from './occupancy';

/** 말풍선이 떠 있는 시간 */
const BUBBLE_MS = 4000;

const bubbleStyle = {
  background: 'var(--card)',
  color: 'var(--ink)',
  padding: '6px 12px',
  borderRadius: 'var(--radius)',
  boxShadow: 'var(--shadow)',
  whiteSpace: 'nowrap',
  fontSize: 13,
  pointerEvents: 'none',
} as const;

/** 사자 교수님 NPC: 평일 09–18시 연구동 2F. 누르면 말풍선 한 줄 (§6.4) */
export function Professor() {
  const ref = useRef<Group>(null);
  const shown = useRef<DisplayState>(HIDDEN_DISPLAY);
  const clicks = useRef(0);
  const [display, setDisplay] = useState<DisplayState>(HIDDEN_DISPLAY);
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    if (!line) return;
    const id = setTimeout(() => setLine(null), BUBBLE_MS);
    return () => clearTimeout(id);
  }, [line]);

  useFrame(() => {
    const group = ref.current;
    if (!group) return;
    const world = useWorld.getState();
    const pose = professorAt(world.now(), CAMPUS);
    const hidden =
      pose !== null && hiddenByCutaway(pose, world.focusedBuilding, world.hiddenAboveFloor, CAMPUS);
    const next = displayOf(pose, hidden);
    if (!sameDisplay(next, shown.current)) {
      shown.current = next;
      setDisplay(next);
    }
    group.visible = next.visible;
    if (pose) {
      group.position.set(...pose.position);
      group.rotation.y = pose.facing;
    }
  });

  const onClick = () => {
    setLine(professorLine(useWorld.getState().now(), clicks.current++));
  };

  return (
    <group ref={ref} visible={false}>
      <Character
        look={PROFESSOR_LOOK}
        pose={display.pose}
        name={PROFESSOR_NAME}
        status={display.status}
        opacity={display.opacity}
        onClick={onClick}
      />
      {line && display.visible && (
        <Html position={[0, 2.4, 0]} center>
          <div style={bubbleStyle}>{line}</div>
        </Html>
      )}
    </group>
  );
}
```

- [ ] **Step 4: 카메라·Campus용 느린 값**

`apps/web/src/world/sim/CameraRig.tsx`:

```tsx
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type { Vector3 } from 'three';
import { CAMPUS } from '@4this/shared';
import { useWorld } from '../../store/world';
import { buildingGoal, followPosition, type CameraGoal } from './camera';
import { memberObjects } from './registry';

/** drei OrbitControls(makeDefault)에서 쓰는 부분만 */
interface OrbitLike {
  target: Vector3;
  update: () => void;
}

/** 카메라: 건물을 누르면 그 건물로 다가가고, focusedMember가 있으면 그 캐릭터를 따라간다 */
export function CameraRig() {
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;
  const camera = useThree((s) => s.camera);
  const focusedBuilding = useWorld((s) => s.focusedBuilding);
  const goal = useRef<CameraGoal | null>(null);

  useEffect(() => {
    goal.current = focusedBuilding ? buildingGoal(focusedBuilding, CAMPUS) : null;
  }, [focusedBuilding]);

  useFrame((_, dt) => {
    if (!controls) return;
    const { focusedMember } = useWorld.getState();
    const followed = focusedMember ? memberObjects.get(focusedMember) : undefined;

    if (followed?.visible) {
      // 목표가 움직인 만큼 카메라도 같이 옮겨 보는 각도를 지킨다
      const k = 1 - Math.exp(-4 * dt);
      const { x, y, z } = followed.position;
      const dx = (x - controls.target.x) * k;
      const dy = (y + 1 - controls.target.y) * k;
      const dz = (z - controls.target.z) * k;
      controls.target.set(controls.target.x + dx, controls.target.y + dy, controls.target.z + dz);
      camera.position.set(camera.position.x + dx, camera.position.y + dy, camera.position.z + dz);
      const t = controls.target;
      camera.position.set(
        ...followPosition(
          [camera.position.x, camera.position.y, camera.position.z],
          [t.x, t.y, t.z],
          k,
        ),
      );
      controls.update();
      return;
    }

    const g = goal.current;
    if (!g) return;
    const k = 1 - Math.exp(-3 * dt);
    const t = controls.target;
    t.set(
      t.x + (g.target[0] - t.x) * k,
      t.y + (g.target[1] - t.y) * k,
      t.z + (g.target[2] - t.z) * k,
    );
    const p = camera.position;
    p.set(
      p.x + (g.position[0] - p.x) * k,
      p.y + (g.position[1] - p.y) * k,
      p.z + (g.position[2] - p.z) * k,
    );
    controls.update();
    if (Math.hypot(g.position[0] - p.x, g.position[1] - p.y, g.position[2] - p.z) < 0.05) {
      goal.current = null; // 도착하면 사용자가 자유롭게 돌려 볼 수 있다
    }
  });

  return null;
}
```

`apps/web/src/world/sim/useWorldTick.ts`:

```ts
import { useEffect, useState } from 'react';
import { CAMPUS } from '@4this/shared';
import { useWorld } from '../../store/world';
import type { FloorKey } from '../contracts';
import { occupiedFloors, sameFloors, snapshotAt } from './occupancy';

/** Campus에 넘기는 느린 값: 하늘용 시각(10초마다)과 사람이 있는 층(2초마다, 바뀔 때만) */
export function useWorldTick(): { now: number; occupied: ReadonlySet<FloorKey> } {
  const [state, setState] = useState(() => ({
    now: useWorld.getState().now(),
    occupied: new Set<FloorKey>() as ReadonlySet<FloorKey>,
  }));

  useEffect(() => {
    const tick = () => {
      const world = useWorld.getState();
      const t = world.now();
      const occupied = occupiedFloors(
        snapshotAt(world.ensurePlan(), world.members, t, CAMPUS),
        CAMPUS,
      );
      setState((prev) => {
        const nowChanged = Math.abs(t - prev.now) >= 10_000;
        const floorsChanged = !sameFloors(prev.occupied, occupied);
        if (!nowChanged && !floorsChanged) return prev;
        return {
          now: nowChanged ? t : prev.now,
          occupied: floorsChanged ? occupied : prev.occupied,
        };
      });
    };
    tick();
    const id = setInterval(tick, 2000);
    const unsub = useWorld.subscribe((s, prev) => {
      if (s.members !== prev.members) tick();
    });
    return () => {
      clearInterval(id);
      unsub();
    };
  }, []);

  return state;
}
```

- [ ] **Step 5: WorldCanvas 조립** — `apps/web/src/world/WorldCanvas.tsx` 전체

```tsx
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useState, type ReactNode } from 'react';
import { useWorld } from '../store/world';
import { Campus } from './campus/Campus';
import { OVERVIEW } from './sim/camera';
import { CameraRig } from './sim/CameraRig';
import { Professor } from './sim/Professor';
import { SimMembers } from './sim/SimMembers';
import { TextFallback } from './sim/TextFallback';
import { useWorldTick } from './sim/useWorldTick';
import { hasWebGL } from './sim/webgl';

/** Canvas 안의 장면: 캠퍼스 + 멤버 + 교수님 + 카메라 */
function WorldScene() {
  const { now, occupied } = useWorldTick();
  const focusedBuilding = useWorld((s) => s.focusedBuilding);
  const hiddenAboveFloor = useWorld((s) => s.hiddenAboveFloor);
  const focusBuilding = useWorld((s) => s.focusBuilding);
  return (
    <>
      <Campus
        now={now}
        occupiedFloors={occupied}
        focusedBuilding={focusedBuilding}
        hiddenAboveFloor={hiddenAboveFloor}
        onBuildingClick={focusBuilding}
      />
      <SimMembers />
      <Professor />
      <CameraRig />
    </>
  );
}

/**
 * 3D 월드 진입점. 마운트되면 GET /api/world를 부른다 (autoLoad=false면 부르지 않는다: 개발 픽스처용).
 * WebGL이 없으면 텍스트 목록으로 대신한다.
 */
export function WorldCanvas({
  autoLoad = true,
  children,
}: {
  autoLoad?: boolean;
  /** Canvas 안에 더 그릴 것 (개발 페이지의 FPS 측정 등) */
  children?: ReactNode;
}) {
  const [webgl] = useState(hasWebGL);
  useEffect(() => {
    if (autoLoad) void useWorld.getState().load();
  }, [autoLoad]);

  if (!webgl) return <TextFallback />;
  return (
    <Canvas shadows camera={{ position: OVERVIEW.position, fov: 32 }}>
      <color attach="background" args={['#fbeff6']} />
      <WorldScene />
      <OrbitControls makeDefault target={OVERVIEW.target} maxPolarAngle={Math.PI * 0.42} />
      {children}
    </Canvas>
  );
}
```

- [ ] **Step 6: 타입·빌드 확인**

Run: `npm run typecheck -w @4this/web && npm run build`
Expected: 타입 에러 0, `✓ built`

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/world
git commit -m "feat: 매 프레임 sampleAt으로 캐릭터 배치·보간, 교수님, 카메라 포커스"
```

---

### Task 7: `?dev=sim` 개발 페이지(30명·시계 배속·FPS)와 화면 확인

**Files:**
- Create: `apps/web/src/dev/sim/SimDevPage.tsx`
- Modify: `apps/web/src/App.tsx`

**Interfaces:**
- Consumes: `demoMembers`(cw#2), `useWorld.setWorld/setClock`, `WorldCanvas({ autoLoad: false, children })`, `UiRoot`(th)
- Produces: `?dev=sim` — 서버 없이 가짜 멤버 n명(기본 30)으로 월드를 돌린다. `&at=HH:MM`(오늘 KST 시작 시각), `&speed=N`(배속). 왼쪽 아래에 `30명 · ×1 · 60 fps`

- [ ] **Step 1: 개발 페이지** — `apps/web/src/dev/sim/SimDevPage.tsx`

```tsx
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { demoMembers, kstDate, kstMidnight, toMinutes } from '@4this/shared';
import { useWorld } from '../../store/world';
import { WorldCanvas } from '../../world/WorldCanvas';
import { UiRoot } from '../../ui/UiRoot';

/**
 * 시뮬레이션 개발 페이지 (?dev=sim). 서버 없이 가짜 멤버로 월드를 돌려 본다.
 *   ?dev=sim&n=30          멤버 수 (기본 30)
 *   ?dev=sim&at=12:00      오늘 KST 이 시각부터 시작
 *   ?dev=sim&speed=60      시계를 60배로 (1초에 1분)
 */
const params = new URLSearchParams(window.location.search);
const count = Number(params.get('n') ?? 30);
const speed = Number(params.get('speed') ?? 1);
const at = params.get('at');

/** 0.5초마다 평균 FPS를 DOM에 직접 쓴다 (React 렌더 없이) */
function FpsProbe({ target }: { target: RefObject<HTMLSpanElement | null> }) {
  const acc = useRef({ frames: 0, time: 0 });
  useFrame((_, dt) => {
    acc.current.frames++;
    acc.current.time += dt;
    if (acc.current.time >= 0.5 && target.current) {
      target.current.textContent = `${Math.round(acc.current.frames / acc.current.time)} fps`;
      acc.current = { frames: 0, time: 0 };
    }
  });
  return null;
}

const badge = {
  position: 'fixed',
  left: 12,
  bottom: 12,
  padding: '6px 12px',
  borderRadius: 'var(--radius-sm)',
  background: 'var(--card)',
  boxShadow: 'var(--shadow)',
  fontSize: 13,
} as const;

export function SimDevPage() {
  const [ready, setReady] = useState(false);
  const fps = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const world = useWorld.getState();
    world.setWorld({ serverTime: Date.now(), members: demoMembers(count) });
    if (at || speed !== 1) {
      const start = at ? kstMidnight(kstDate(Date.now())) + toMinutes(at) * 60_000 : Date.now();
      world.setClock(start, speed);
      world.ensurePlan();
    }
    setReady(true);
  }, []);

  if (!ready) return null;
  return (
    <div className="app">
      <WorldCanvas autoLoad={false}>
        <FpsProbe target={fps} />
      </WorldCanvas>
      <UiRoot />
      <div style={badge}>
        {count}명 · ×{speed} · <span ref={fps}>… fps</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: App 연결** — `apps/web/src/App.tsx` 전체 (cw#1 파일에 `?dev=sim` 한 줄과 import 한 줄을 더한 것)

```tsx
import { useEffect } from 'react';
import { CampusPreview } from './dev/campus/CampusPreview';
import { CharacterGallery } from './dev/characters/CharacterGallery';
import { SimDevPage } from './dev/sim/SimDevPage';
import { useSession } from './store/session';
import { UiRoot } from './ui/UiRoot';
import { WorldCanvas } from './world/WorldCanvas';
import './ui/tokens.css';

/** ?dev=characters, ?dev=campus, ?dev=sim 은 개발용 단독 페이지 */
const devPage = new URLSearchParams(window.location.search).get('dev');

export function App() {
  const refresh = useSession((s) => s.refresh);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (devPage === 'characters') return <CharacterGallery />;
  if (devPage === 'campus') return <CampusPreview />;
  if (devPage === 'sim') return <SimDevPage />;

  return (
    <div className="app">
      <WorldCanvas />
      <UiRoot />
    </div>
  );
}
```

- [ ] **Step 3: 전체 검사**

Run: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
Expected: 모두 통과 — shared 71개, web 33개 (server 테스트 수는 그때까지 머지된 wj PR에 따라 다르다)

- [ ] **Step 4: 화면 확인**

Run: `npm run dev -w @4this/web` 후 브라우저로 http://localhost:5173/?dev=sim&at=12:10&speed=30
Expected:
- 강의실·식당·카페 건물 안 좌석 자리에 캐릭터들이 앉아 있고, 몇 명은 공원·길 위에서 걷는다. 30배속이라 1초에 30초씩 흘러 걷는 모습이 보인다
- 건물을 누르면 카메라가 그 건물로 천천히 다가간다(th#4 오버레이가 있으면 건물 패널에 사람 목록·층 버튼)
- 캐릭터를 누르면 카메라가 그 캐릭터를 따라간다
- 평일 09–18시면 연구동 2층 교수님 책상에 사자가 있고, 누르면 말풍선 한 줄이 4초 뜬다
- 왼쪽 아래 FPS가 일반 노트북에서 55 이상(헤드리스 브라우저는 소프트웨어 렌더링이라 낮게 나오니 실제 브라우저로 본다)

스크린샷을 PR에 붙인다. 개발자 도구에서 `WebGL` 끄기(Chrome: `chrome://flags` → WebGL 비활성 또는 `--disable-webgl`로 실행)로 텍스트 목록도 한 번 확인한다.

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/dev/sim apps/web/src/App.tsx
git commit -m "feat: ?dev=sim 30명 시뮬레이션 개발 페이지와 FPS 표시"
```

- [ ] **Step 6: push·PR** (cw#2·hm#1·th#1이 머지된 뒤)

```bash
git fetch origin && git merge origin/main
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build
git push origin cw
gh pr create --base main --head cw --title "[cw#3] 월드 시뮬레이션" --body-file .github/pull_request_template.md
```

PR 본문: `?dev=sim` 스크린샷, hm에게 `occupiedFloors`가 2초마다 바뀔 때만 새 Set으로 온다는 점, th에게 `useOverlayProps()`의 `topBar`·`building`이 실제 값이 됐다는 점을 적는다. 머지 방식 **Create a merge commit**.

- [ ] **Step 7: 머지 후 알림**

단톡방: "cw#3 머지됨 — 메인 화면에 실제 멤버가 시간표대로 움직입니다. `?dev=sim&speed=60`으로 빠르게 볼 수 있어요."

---

## Self-Review

- **스펙 커버리지:** §7.6 "DayPlan은 날짜·시간표가 바뀔 때만, 매 프레임은 sampleAt만"(Task 1 `ensurePlan`, Task 6) · §5.3 건물 클릭 → 카메라 다가감·층 버튼·"지금 이 건물에 있는 사람"(Task 2 `peopleIn`·`hiddenByCutaway`, Task 4 패널, Task 6 카메라) · 출입 페이드(cw#2의 opacity를 Task 2 `displayOf`가 0.1 단위로) · §5.5 밤 창문용 `occupiedFloors`(Task 2·6) · §6.3 내 캐릭터 링(`highlight`) · §6.4 교수님·클릭 말풍선(Task 3·6) · §9 상단 `수 14:10 ☀️`(Task 3·4), 이름 클릭 → 캐릭터로 카메라(`focusMember`, Task 1·6; 목록 연결은 cw#4) · §10 WebGL 미지원 목록(Task 5), 시계 어긋남(`syncClock`은 cw#4가 소켓에 연결) · §5.6 30명 확인 경로(Task 7).
- **플레이스홀더:** 없음.
- **계약 일치:** `CharacterProps`·`CampusProps`·`OverlayProps`·`BuildingPanelProps`는 cw#1 그대로 쓴다. `WorldCanvas`에 선택 props(`autoLoad`, `children`)만 더했다(cw 소유).
