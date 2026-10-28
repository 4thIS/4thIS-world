# [hm#2] 건물 시스템 + 공학관·연구동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**담당:** 박효민 · 브랜치 `hm` · 웨이브 2 · 선행 hm#1

**Goal:** `Building` 데이터(`CAMPUS.buildings[id]`)만으로 바닥판·외벽(창문 구멍)·문·계단·옥상 난간을 조립하는 건물 모듈과 카메라 방향 컷어웨이를 만들고, 공학관 3개 층(칠판·교탁·"n학년" 표지판·좌석마다 책상+의자+노트북/PC)과 연구동(1F 불 꺼진 로비, 2F 큰 테이블+노트북 6대·책장 파티션·교수님 책상)을 채운다. 본관·카페는 아직 반투명 상자로 남긴다.

**Architecture:** 벽 하나를 "벽 좌표"(u: 벽을 따라, v: 위로)로 다루는 순수 함수(`buildingGeometry.ts`)가 창·문 구멍, 구멍을 뺀 벽 조각, 테두리선, 계단 블록, 계단 구멍 난 바닥판을 계산하고(vitest), `shellGeometry.ts`가 그 사각형들을 상자로 만들어 (벽 면 × 층)마다 지오메트리 하나로 합친다. 컷어웨이는 순수 함수(`cutaway.ts`: 벽이 카메라를 보는지, 불투명도 보간, 테두리선 진하기)를 `Building`의 `useFrame`이 매 프레임 벽 면별 재질에 적용한다. 가구는 `furniture.ts`가 `CAMPUS.places[*].seats`에서 계산하고(좌석 하나 = 의자 하나), hm#1의 `<Model>`이 InstancedMesh로 그린다. Kenney 모델은 앞면이 +z라서 의자는 `facing`, 책상·모니터·노트북·책장은 `facing + π`로 돌린다.

**Tech Stack:** React 19.3 · three 0.186 (`mergeGeometries`) · @react-three/fiber 9 · @react-three/drei 10 · vitest 5 · Kenney Furniture Kit 2.0 (CC0)

> **팀장 메모 (2026-10-26, 박찬우):** Task 1 앞에 **Task 0**(hm#1 테스트 속도)을 추가했다. 컴퓨터가 바쁠 때 `paverTiles` 테스트가 5초 제한에 걸려 가끔 실패한다(th 보고). 쌍마다 `expect`를 수십만 번 부르는 것이 원인이라, 가장 가까운 거리 하나만 검사하게 바꾼다.

## Global Constraints

- Node `>=24`, npm workspaces, `package-lock.json` 커밋. TypeScript는 `~5.9.3` 고정.
- 모든 패키지는 ESM. `@4this/shared`는 빌드하지 않고 TS 소스를 바로 import한다.
- 공용 타입·스키마·경로·이벤트는 **`@4this/shared`에서만** 가져온다. 같은 타입을 다른 곳에 다시 정의하지 않는다.
- 시각은 KST, `packages/shared/src/time.ts`만 쓴다. 랜덤이 화면 결과에 영향을 주면 결정적 값(`rand01()`, `hashString()` 기반)을 쓴다.
- 좌표계: 단위 m, +x 동쪽, +z 남쪽(정문), 캠퍼스 x·z ∈ [-25, 25], `facing` = `rotation.y`(0이면 +z를 봄), 층 높이 3.2 m.
- 파스텔 톤: 배경 `#fbeff6`, 글자 `#5b4d6b`, 카드 `rgba(255,255,255,0.85)`, 강조 분홍 `#ffb3c7`, 라벤더 `#c9bdf2`.
- 코드 스타일: Prettier(작은따옴표, 세미콜론, 100자). 주석과 사용자 문구는 한국어.
- 커밋: `feat:`/`fix:`/`chore:`/`test:`/`docs:` + 한국어 설명. PR 제목: `[hm#N] 제목`.
- 남의 소유 파일(스펙 §12.2, `.github/CODEOWNERS`)은 고치지 않는다. **hm 소유: `packages/shared/src/campus/**`, `apps/web/src/world/campus/**`, `apps/web/src/dev/campus/**`, `apps/web/public/assets/**`, `CREDITS.md`.** `apps/web/src/world/contracts.ts`(cw 계약)는 읽기만 한다.
- 새 npm 패키지를 더하지 않는다(cw#1의 three·R3F·drei로 충분하다).
- `Campus`는 cw#1과 **같은 경로(`apps/web/src/world/campus/Campus.tsx`)·이름·props(`CampusProps`)**를 지킨다. 하늘·조명도 `Campus` 안에서 처리한다.
- 가구는 **`CAMPUS.places[*].seats`에서 계산**한다(좌석 하나 = 의자 하나, 테이블은 좌석 묶음 가운데). 좌석 좌표 = 캐릭터 발밑 = 의자 중심이고 facing 쪽에 책상·테이블이 온다. 의자·벤치의 앉는 면은 th와 맞춘 `SEAT_HEIGHT = 0.45` m(캐릭터 키 약 1.07 m).
- 좌표를 다듬으면 `packages/shared/src/campus/data.ts`만 고치고 `validateCampus` 테스트가 계속 통과해야 한다. `types.ts` 구조는 바꾸지 않는다.
- 성능: 풀·꽃·보도블록·나무·가구는 InstancedMesh, 그림자는 해(directional) 하나.
- 에셋은 레포 `apps/web/public/assets/kaykit|kenney/`에 복사해 둔다(CDN 의존 없음). 내려받은 압축 파일은 **새 빈 폴더**에 풀고(신뢰하지 않는 데이터) 쓰는 파일만 복사한다. 웹에서는 `/assets/kaykit/bench.gltf`처럼 부른다.
- 3D 글자(간판·이름표)는 한글 폰트 파일 없이 CanvasTexture로 그린다.
- 이 PR 고유:
  - 컷어웨이(스펙 §5.3): 건물 가운데 → 카메라 수평 방향과 벽 바깥 법선의 내적 > 0.3 이면 그 벽 면(모든 층)을 불투명도 0.1까지 0.25초에 걸쳐 낮추고 테두리선을 보인다. 창유리도 같이 흐려진다.
  - `hiddenAboveFloor`는 **포커스된 건물에만** 적용한다(그 층보다 위층과 옥상을 숨김). 다른 건물은 모든 층이 보인다.
  - 벽 두께 0.2 m, 바닥판 0.15 m, 바닥판 윗면 = 층 높이 + 0.02 m(잔디·아래층과 깜빡임 방지). 창 1.2×1.3 m(창턱 1.0 m), 문 1.6×2.4 m(1층, 문 노드 쪽 벽), 옥상 난간 0.6 m.
  - 계단은 각 장소의 `landing`(계단참) 옆에 둔다. 계단·계단 구멍이 좌석·넘침 자리·계단참과 겹치지 않음을 테스트한다.
  - Kenney 가구 배율 2(책상 윗면 0.77 m), **의자는 앉는 면이 `SEAT_HEIGHT = 0.45` m가 되도록 배율을 따로 정한다**(`chairDesk`: 원본 앉는 면 0.247 → 배율 1.82).
  - 칠판·교탁·층 표지판·큰 테이블은 두 팩에 없어서 코드로 만든다.
  - 연구동 2F 큰 테이블은 6자리 바운딩 박스를 0.65 m씩 줄인 사각형이다(`tableBetween`). 교수님 책상은 `CAMPUS.professorSeat` 앞 0.7 m.

## File Structure

```
apps/web/public/assets/kenney/      desk·chairDesk·laptop·computerScreen·computerKeyboard·bookcaseOpen·
                                    bookcaseClosedWide·books·pottedPlant·plantSmall1·trashcan (.glb)
CREDITS.md                          (수정) Kenney 줄 추가
apps/web/src/world/campus/
├─ cutaway.ts / cutaway.test.ts     컷어웨이 순수 함수
├─ buildingGeometry.ts / .test.ts   벽 좌표·창문·문·벽 조각·테두리선·바닥판 구멍·계단 블록
├─ buildingStyles.ts                건물별 색·계단 자리
├─ assets.ts                        (수정) Kenney 모델 11개, 의자 배율
├─ furniture.ts / furniture.test.ts 좌석 → 가구 위치 (의자·책상·노트북/PC·테이블)
├─ shellGeometry.ts                 사각형 → 합친 three 지오메트리 (벽·선·유리·바닥판·계단·옥상·문틀)
├─ Building.tsx                     건물 모듈 (컷어웨이·층 숨김·클릭·포커스 강조·이름표)
├─ CodeProps.tsx                    칠판·교탁·벽 표지판·테이블 (코드)
├─ EngInterior.tsx                  공학관 n층 강의실
├─ LabInterior.tsx                  연구동 1F 로비·2F 연구실
└─ Campus.tsx                       (수정) 공학관·연구동을 Building으로
apps/web/src/dev/campus/CampusPreview.tsx  (수정) building=·floor= 쿼리, 층 버튼
```

---

### Task 0: (팀장 추가) `paverTiles` 테스트를 빠르게

**Files:**

- Modify: `apps/web/src/world/campus/layout.test.ts`

- [x] **Step 1: 겹침 검사를 최솟값 한 번으로 바꾸기**

`describe('paverTiles', …)` 안의 첫 번째 `it`를 아래로 바꾼다.

바꾸기 전:

```ts
  it('충분히 많이 깔리고, 서로 0.42 m보다 가깝게 겹치지 않는다', () => {
    expect(tiles.length).toBeGreaterThan(500);
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        const d = Math.hypot(tiles[i]!.x - tiles[j]!.x, tiles[i]!.z - tiles[j]!.z);
        expect(d).toBeGreaterThanOrEqual(0.42);
      }
    }
  });
```

바꾼 뒤:

```ts
  it('충분히 많이 깔리고, 서로 0.42 m보다 가깝게 겹치지 않는다', () => {
    expect(tiles.length).toBeGreaterThan(500);
    // 쌍마다 expect를 부르면 수십만 번이라 느리다. 가장 가까운 거리 하나만 검사한다
    let min = Infinity;
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        min = Math.min(min, Math.hypot(tiles[i]!.x - tiles[j]!.x, tiles[i]!.z - tiles[j]!.z));
      }
    }
    expect(min).toBeGreaterThanOrEqual(0.42);
  });
```

- [x] **Step 2: 통과와 시간 확인**

Run: `npx vitest run --root apps/web src/world/campus/layout.test.ts`
Expected: PASS, 전체 1초 안팎(바꾸기 전에는 이 테스트 하나가 0.7초 이상)

- [x] **Step 3: 커밋**

```bash
git add apps/web/src/world/campus/layout.test.ts
git commit -m "test: paverTiles 겹침 검사를 최솟값 한 번으로 바꿔 시간 초과 막기"
```

---

### Task 1: 컷어웨이 순수 함수

**Files:**
- Create: `apps/web/src/world/campus/cutaway.ts`
- Test: `apps/web/src/world/campus/cutaway.test.ts`

**Interfaces:**
- Produces: `CUTAWAY_DOT = 0.3`, `CUTAWAY_OPACITY = 0.1`, `CUTAWAY_SECONDS = 0.25`, `wallFacesCamera(normal: Vec2, center: Vec2, camera: Vec2): boolean`, `targetOpacity(facing: boolean): number`, `approach(current: number, target: number, dt: number): number`, `edgeOpacity(wallOpacity: number): number`

- [x] **Step 1: 브랜치 갱신**

```bash
git fetch origin && git checkout hm && git merge origin/main
```

- [x] **Step 2: 실패하는 테스트 작성**

`apps/web/src/world/campus/cutaway.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { approach, edgeOpacity, targetOpacity, wallFacesCamera } from './cutaway';

describe('wallFacesCamera', () => {
  const center = [16, -2] as const;

  it('카메라가 남동쪽이면 남쪽·동쪽 벽만 카메라를 본다', () => {
    const cam = [54, 38] as const;
    expect(wallFacesCamera([0, 1], center, cam)).toBe(true); // s
    expect(wallFacesCamera([1, 0], center, cam)).toBe(true); // e
    expect(wallFacesCamera([0, -1], center, cam)).toBe(false); // n
    expect(wallFacesCamera([-1, 0], center, cam)).toBe(false); // w
  });

  it('내적이 0.3 이하이면 투명하게 하지 않는다', () => {
    // 동쪽으로 거의 정면(내적 0.2): 남쪽 벽은 그대로
    expect(wallFacesCamera([0, 1], [0, 0], [0.98, 0.2])).toBe(false);
    expect(wallFacesCamera([0, 1], [0, 0], [0.9, 0.44])).toBe(true);
  });

  it('카메라가 바로 위면 어느 벽도 아니다', () => {
    expect(wallFacesCamera([0, 1], center, center)).toBe(false);
  });
});

describe('approach', () => {
  it('0.25초에 1 → 0.1 전체를 지나간다', () => {
    expect(approach(1, targetOpacity(true), 0.125)).toBeCloseTo(0.55);
    expect(approach(1, targetOpacity(true), 0.25)).toBeCloseTo(0.1);
    expect(approach(1, targetOpacity(true), 1)).toBe(0.1);
  });

  it('되돌아올 때도 같은 속도로, 목표를 넘지 않는다', () => {
    expect(approach(0.1, targetOpacity(false), 0.125)).toBeCloseTo(0.55);
    expect(approach(0.9, targetOpacity(false), 1)).toBe(1);
  });
});

describe('edgeOpacity', () => {
  it('벽이 흐려질수록 선이 진해진다', () => {
    expect(edgeOpacity(1)).toBe(0);
    expect(edgeOpacity(0.55)).toBeCloseTo(0.45);
    expect(edgeOpacity(0.1)).toBeCloseTo(0.9);
  });
});
```

- [x] **Step 3: 실패 확인**

Run: `npm test -w @4this/web`
Expected: FAIL — `Failed to resolve import "./cutaway"`

- [x] **Step 4: 구현**

`apps/web/src/world/campus/cutaway.ts`:
```ts
import type { Vec2 } from '@4this/shared';

/**
 * 컷어웨이 (설계 문서 §5.3): 카메라 쪽을 향한 벽을 투명하게 만든다.
 * - 건물 가운데에서 카메라로 가는 수평 방향과 벽 바깥 법선의 내적이 0.3보다 크면 "카메라 쪽 벽"
 * - 그 벽의 불투명도를 0.25초 동안 0.1까지 낮추고, 대신 테두리선을 보이게 한다
 */
export const CUTAWAY_DOT = 0.3;
export const CUTAWAY_OPACITY = 0.1;
export const CUTAWAY_SECONDS = 0.25;

/** 이 벽이 카메라를 보고 있는지 (카메라가 건물 가운데 바로 위면 false) */
export function wallFacesCamera(normal: Vec2, center: Vec2, camera: Vec2): boolean {
  const dx = camera[0] - center[0];
  const dz = camera[1] - center[1];
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return false;
  return (dx * normal[0] + dz * normal[1]) / len > CUTAWAY_DOT;
}

/** 목표 불투명도 */
export const targetOpacity = (facing: boolean) => (facing ? CUTAWAY_OPACITY : 1);

/** current를 target 쪽으로 dt초만큼 옮긴다. 1 → 0.1 전체를 CUTAWAY_SECONDS에 지나간다 */
export function approach(current: number, target: number, dt: number): number {
  const step = ((1 - CUTAWAY_OPACITY) / CUTAWAY_SECONDS) * dt;
  if (current < target) return Math.min(target, current + step);
  return Math.max(target, current - step);
}

/** 벽이 흐려질수록 테두리선이 진해진다 (벽 불투명 1 → 선 0, 벽 0.1 → 선 0.9) */
export function edgeOpacity(wallOpacity: number): number {
  return Math.max(0, Math.min(0.9, 1 - wallOpacity));
}
```

- [x] **Step 5: 통과 확인**

Run: `npm test -w @4this/web`
Expected: PASS — cutaway 6개

- [x] **Step 6: 커밋**

```bash
git add apps/web/src/world/campus/cutaway.ts apps/web/src/world/campus/cutaway.test.ts
git commit -m "feat: 카메라 방향 컷어웨이 계산"
```

---

### Task 2: 건물 껍데기 계산 (벽·창·문·바닥판·계단)

**Files:**
- Create: `apps/web/src/world/campus/buildingGeometry.ts`, `apps/web/src/world/campus/buildingStyles.ts`
- Test: `apps/web/src/world/campus/buildingGeometry.test.ts`

**Interfaces:**
- Consumes: `WALL_NORMALS`, `WallSide`, `DoorInfo`, `doorPoint` (hm#1 `layout.ts`), `FLOOR_HEIGHT`, `Building`, `Vec2`
- Produces:
  - 상수 `WALL_T = 0.2`, `SLAB_T = 0.15`, `SLAB_LIFT = 0.02`, `WINDOW_W`, `WINDOW_SILL`, `WINDOW_TOP`, `DOOR_W`, `DOOR_H`, `PARAPET_H`, `STAIR_RUN = 3`, `STAIR_STEPS = 10`, `WALL_SIDES = ['n', 'e', 's', 'w']`, `floorY(floor): number`
  - `interface Rect { u0; u1; v0; v1 }`, `interface WallFrame { side; origin; dir; length; normal }`, `wallFrame(b, side)`, `wallPoint(f, u)`, `wallU(f, p)`, `wallOpenings(f, floor, door | null): Rect[]`, `wallPieces(length, height, openings): Rect[]`, `wallOutline(length, height, openings): [u0, v0, u1, v1][]`
  - `interface Box2 { min; max }`, `rectMinus(outer, hole | null): Box2[]`, `interface StairSpec { start: Vec2; dir: WallSide; width }`, `stairHole(s): Box2`, `interface Block { center: [x, y, z]; size: [x, y, z] }`, `stairBlocks(s): Block[]`
  - `interface BuildingStyle { wall; trim; floor; stairs: StairSpec | null }`, `BUILDING_STYLES: Record<BuildingId, BuildingStyle>`

- [x] **Step 1: 실패하는 테스트 작성**

`apps/web/src/world/campus/buildingGeometry.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { BUILDING_IDS, CAMPUS, FLOOR_HEIGHT, PLACE_IDS, type Vec2 } from '@4this/shared';
import {
  DOOR_W,
  rectMinus,
  stairBlocks,
  stairHole,
  wallFrame,
  wallOpenings,
  wallOutline,
  wallPieces,
  wallPoint,
  WALL_T,
  type Rect,
} from './buildingGeometry';
import { BUILDING_STYLES } from './buildingStyles';
import { doorPoint } from './layout';

const area = (rs: readonly Rect[]) => rs.reduce((s, r) => s + (r.u1 - r.u0) * (r.v1 - r.v0), 0);

describe('wallFrame', () => {
  const eng = CAMPUS.buildings.eng; // [12,-9] ~ [20,5]

  it('남·북 벽은 모서리까지, 동·서 벽은 그 사이', () => {
    expect(wallFrame(eng, 'n')).toMatchObject({ origin: [12, -8.9], dir: [1, 0], length: 8 });
    expect(wallFrame(eng, 's')).toMatchObject({ origin: [12, 4.9], length: 8, normal: [0, 1] });
    const w = wallFrame(eng, 'w');
    expect(w.origin).toEqual([12.1, -9 + WALL_T]);
    expect(w.length).toBeCloseTo(14 - WALL_T * 2);
    expect(wallPoint(w, 2)).toEqual([12.1, -9 + WALL_T + 2]);
  });
});

describe('wallOpenings', () => {
  const eng = CAMPUS.buildings.eng;
  const door = doorPoint(eng, CAMPUS.graph.nodes[eng.doorNode]!);

  it('1층 문 벽에는 문이 있고 문과 겹치는 창은 없다', () => {
    const f = wallFrame(eng, 'w');
    const ops = wallOpenings(f, 1, door);
    const doors = ops.filter((o) => o.v0 === 0);
    expect(doors).toHaveLength(1);
    expect((doors[0]!.u0 + doors[0]!.u1) / 2).toBeCloseTo(-2 - (-9 + WALL_T));
    expect(doors[0]!.u1 - doors[0]!.u0).toBeCloseTo(DOOR_W);
    for (let i = 1; i < ops.length; i++) expect(ops[i]!.u0).toBeGreaterThan(ops[i - 1]!.u1);
  });

  it('2층에는 문이 없고 창만 있다', () => {
    const ops = wallOpenings(wallFrame(eng, 'w'), 2, door);
    expect(ops.every((o) => o.v0 > 0)).toBe(true);
    expect(ops.length).toBe(4);
  });
});

describe('wallPieces', () => {
  it('벽 넓이 = 전체 − 구멍', () => {
    const ops: Rect[] = [
      { u0: 1, u1: 2.2, v0: 1, v1: 2.3 },
      { u0: 3, u1: 4.6, v0: 0, v1: 2.4 },
    ];
    const pieces = wallPieces(6, FLOOR_HEIGHT, ops);
    expect(area(pieces)).toBeCloseTo(6 * FLOOR_HEIGHT - 1.2 * 1.3 - 1.6 * 2.4);
    // 문 아래에는 조각이 없다
    expect(pieces.some((p) => p.u0 === 3 && p.v0 === 0)).toBe(false);
  });

  it('구멍이 없으면 벽 한 장', () => {
    expect(wallPieces(5, 3.2, [])).toEqual([{ u0: 0, u1: 5, v0: 0, v1: 3.2 }]);
  });
});

describe('wallOutline', () => {
  it('바깥 4선 + 구멍마다 4선', () => {
    expect(wallOutline(5, 3.2, [{ u0: 1, u1: 2, v0: 1, v1: 2 }])).toHaveLength(8);
  });
});

describe('rectMinus', () => {
  it('구멍만큼 넓이가 준다', () => {
    const outer = { min: [0, 0] as const, max: [10, 8] as const };
    const pieces = rectMinus(outer, { min: [7, 1], max: [8, 4] });
    const a = pieces.reduce((s, p) => s + (p.max[0] - p.min[0]) * (p.max[1] - p.min[1]), 0);
    expect(a).toBeCloseTo(80 - 3);
    expect(pieces).toHaveLength(4);
  });

  it('구멍이 없거나 밖에 있으면 그대로', () => {
    const outer = { min: [0, 0] as const, max: [2, 2] as const };
    expect(rectMinus(outer, null)).toEqual([outer]);
    expect(rectMinus(outer, { min: [5, 5], max: [6, 6] })).toEqual([outer]);
  });
});

describe('stairs', () => {
  const spec = { start: [19.3, 3.4] as const, dir: 'n' as const, width: 1 };

  it('구멍은 올라가는 방향으로 3 m, 폭만큼', () => {
    const h = stairHole(spec);
    expect(h.min[0]).toBeCloseTo(18.8);
    expect(h.max[0]).toBeCloseTo(19.8);
    expect(h.min[1]).toBeCloseTo(0.4);
    expect(h.max[1]).toBeCloseTo(3.4);
  });

  it('마지막 계단 윗면이 한 층 높이', () => {
    const blocks = stairBlocks(spec);
    expect(blocks).toHaveLength(10);
    const top = blocks[9]!;
    expect(top.center[1] + top.size[1] / 2).toBeCloseTo(FLOOR_HEIGHT);
    expect(top.center[2]).toBeLessThan(blocks[0]!.center[2]);
  });
});

describe('BUILDING_STYLES 계단', () => {
  const inside = (p: Vec2, min: Vec2, max: Vec2, m: number) =>
    p[0] > min[0] - m && p[0] < max[0] + m && p[1] > min[1] - m && p[1] < max[1] + m;

  it('여러 층 건물만 계단이 있고, 계단은 건물 안에 있다', () => {
    for (const id of BUILDING_IDS) {
      const b = CAMPUS.buildings[id];
      const stairs = BUILDING_STYLES[id].stairs;
      expect(stairs !== null).toBe(b.floors > 1);
      if (!stairs) continue;
      const h = stairHole(stairs);
      expect(h.min[0]).toBeGreaterThanOrEqual(b.min[0] + WALL_T - 1e-9);
      expect(h.max[0]).toBeLessThanOrEqual(b.max[0] - WALL_T + 1e-9);
      expect(h.min[1]).toBeGreaterThanOrEqual(b.min[1] + WALL_T - 1e-9);
      expect(h.max[1]).toBeLessThanOrEqual(b.max[1] - WALL_T + 1e-9);
    }
  });

  it('계단참·좌석·넘침 자리가 계단(구멍)과 겹치지 않는다', () => {
    for (const pid of PLACE_IDS) {
      const place = CAMPUS.places[pid];
      const stairs = BUILDING_STYLES[place.building].stairs;
      if (!stairs) continue;
      const h = stairHole(stairs);
      for (const p of [
        place.landing,
        ...place.seats.map((s) => s.pos),
        ...place.overflow.map((s) => s.pos),
      ]) {
        expect(inside(p, h.min, h.max, 0.3), `${pid} ${p.join(',')}`).toBe(false);
      }
    }
  });
});
```

- [x] **Step 2: 실패 확인**

Run: `npm test -w @4this/web`
Expected: FAIL — `Failed to resolve import "./buildingGeometry"`

- [x] **Step 3: 구현**

남·북 벽이 모서리를 차지하고 동·서 벽은 그 사이에 낀다(모서리가 겹치지 않음). 창은 벽 길이를 약 2.6 m 칸으로 나눠 가운데에 하나씩 내고, 1층 문 벽에서는 문과 겹치는 창을 뺀다.

`apps/web/src/world/campus/buildingGeometry.ts`:
```ts
import { FLOOR_HEIGHT, type Building, type Vec2 } from '@4this/shared';
import { WALL_NORMALS, type DoorInfo, type WallSide } from './layout';

/**
 * 건물 껍데기 계산 (순수 함수). 벽 하나를 "벽 좌표"(u: 벽을 따라, v: 위로)로 다룬다.
 * 컴포넌트는 결과 사각형을 상자로 만들어 합친다.
 */

export const WALL_T = 0.2;
export const SLAB_T = 0.15;
/** 바닥판 윗면을 층 높이보다 이만큼 올린다 (잔디·아래층과 겹쳐 깜빡이지 않게) */
export const SLAB_LIFT = 0.02;
export const WINDOW_W = 1.2;
export const WINDOW_SILL = 1.0;
export const WINDOW_TOP = 2.3;
export const DOOR_W = 1.6;
export const DOOR_H = 2.4;
export const PARAPET_H = 0.6;
export const STAIR_RUN = 3;
export const STAIR_STEPS = 10;

export const WALL_SIDES: readonly WallSide[] = ['n', 'e', 's', 'w'];

/** n층 바닥 높이 */
export const floorY = (floor: number) => (floor - 1) * FLOOR_HEIGHT;

export interface Rect {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

export interface WallFrame {
  side: WallSide;
  /** 벽 두께 가운데 선에서 u = 0인 점 */
  origin: Vec2;
  /** u가 커지는 방향 (단위 벡터) */
  dir: Vec2;
  length: number;
  normal: Vec2;
}

/** 벽 하나의 좌표틀. 남·북 벽이 모서리를 차지하고 동·서 벽은 그 사이에 낀다 */
export function wallFrame(b: Pick<Building, 'min' | 'max'>, side: WallSide): WallFrame {
  const [x0, z0] = b.min;
  const [x1, z1] = b.max;
  const h = WALL_T / 2;
  const normal = WALL_NORMALS[side];
  switch (side) {
    case 'n':
      return { side, origin: [x0, z0 + h], dir: [1, 0], length: x1 - x0, normal };
    case 's':
      return { side, origin: [x0, z1 - h], dir: [1, 0], length: x1 - x0, normal };
    case 'w':
      return {
        side,
        origin: [x0 + h, z0 + WALL_T],
        dir: [0, 1],
        length: z1 - z0 - WALL_T * 2,
        normal,
      };
    case 'e':
      return {
        side,
        origin: [x1 - h, z0 + WALL_T],
        dir: [0, 1],
        length: z1 - z0 - WALL_T * 2,
        normal,
      };
  }
}

/** 벽 좌표 u → 월드 (x, z) */
export function wallPoint(f: WallFrame, u: number): Vec2 {
  return [f.origin[0] + f.dir[0] * u, f.origin[1] + f.dir[1] * u];
}

/** 월드 점을 벽 좌표 u로 (벽 위로 투영) */
export function wallU(f: WallFrame, p: Vec2): number {
  return (p[0] - f.origin[0]) * f.dir[0] + (p[1] - f.origin[1]) * f.dir[1];
}

/** 이 벽·층의 구멍 (문 + 창문). 1층 문 벽이면 문을 내고 문과 겹치는 창은 뺀다 */
export function wallOpenings(f: WallFrame, floor: number, door: DoorInfo | null): Rect[] {
  const out: Rect[] = [];
  let doorU: number | null = null;
  if (door && floor === 1 && door.side === f.side) {
    doorU = wallU(f, door.pos);
    out.push({ u0: doorU - DOOR_W / 2, u1: doorU + DOOR_W / 2, v0: 0, v1: DOOR_H });
  }
  const n = Math.max(1, Math.floor((f.length - 0.8) / 2.6));
  const spacing = f.length / n;
  for (let i = 0; i < n; i++) {
    const c = spacing * (i + 0.5);
    if (doorU !== null && Math.abs(c - doorU) < (DOOR_W + WINDOW_W) / 2 + 0.3) continue;
    out.push({ u0: c - WINDOW_W / 2, u1: c + WINDOW_W / 2, v0: WINDOW_SILL, v1: WINDOW_TOP });
  }
  return out.sort((a, b) => a.u0 - b.u0);
}

/** 길이 length·높이 height 벽에서 구멍을 뺀 나머지 조각들 */
export function wallPieces(length: number, height: number, openings: readonly Rect[]): Rect[] {
  const out: Rect[] = [];
  let cursor = 0;
  for (const o of [...openings].sort((a, b) => a.u0 - b.u0)) {
    if (o.u0 > cursor) out.push({ u0: cursor, u1: o.u0, v0: 0, v1: height });
    if (o.v0 > 0) out.push({ u0: o.u0, u1: o.u1, v0: 0, v1: o.v0 });
    if (o.v1 < height) out.push({ u0: o.u0, u1: o.u1, v0: o.v1, v1: height });
    cursor = Math.max(cursor, o.u1);
  }
  if (cursor < length) out.push({ u0: cursor, u1: length, v0: 0, v1: height });
  return out;
}

/** 컷어웨이 때 남기는 테두리선: 벽 바깥 사각형 + 구멍마다 사각형. [u0, v0, u1, v1] 선분 */
export function wallOutline(
  length: number,
  height: number,
  openings: readonly Rect[],
): [number, number, number, number][] {
  const rect = (r: Rect): [number, number, number, number][] => [
    [r.u0, r.v0, r.u1, r.v0],
    [r.u1, r.v0, r.u1, r.v1],
    [r.u1, r.v1, r.u0, r.v1],
    [r.u0, r.v1, r.u0, r.v0],
  ];
  return [...rect({ u0: 0, u1: length, v0: 0, v1: height }), ...openings.flatMap(rect)];
}

export interface Box2 {
  min: Vec2;
  max: Vec2;
}

/** 사각형에서 구멍 하나를 뺀 나머지 (최대 4조각). 바닥판 계단 구멍에 쓴다 */
export function rectMinus(outer: Box2, hole: Box2 | null): Box2[] {
  if (!hole) return [outer];
  const hx0 = Math.max(outer.min[0], hole.min[0]);
  const hx1 = Math.min(outer.max[0], hole.max[0]);
  const hz0 = Math.max(outer.min[1], hole.min[1]);
  const hz1 = Math.min(outer.max[1], hole.max[1]);
  if (hx0 >= hx1 || hz0 >= hz1) return [outer];
  const out: Box2[] = [];
  if (hz0 > outer.min[1]) out.push({ min: outer.min, max: [outer.max[0], hz0] });
  if (hz1 < outer.max[1]) out.push({ min: [outer.min[0], hz1], max: outer.max });
  if (hx0 > outer.min[0]) out.push({ min: [outer.min[0], hz0], max: [hx0, hz1] });
  if (hx1 < outer.max[0]) out.push({ min: [hx1, hz0], max: [outer.max[0], hz1] });
  return out;
}

export interface StairSpec {
  /** 첫 계단 앞쪽 가장자리의 가운데 */
  start: Vec2;
  /** 올라가는 방향 */
  dir: WallSide;
  width: number;
}

/** 계단이 차지하는 바닥 사각형 (위층 바닥판에 같은 크기 구멍을 낸다) */
export function stairHole(s: StairSpec): Box2 {
  const [dx, dz] = WALL_NORMALS[s.dir];
  const end: Vec2 = [s.start[0] + dx * STAIR_RUN, s.start[1] + dz * STAIR_RUN];
  const half = s.width / 2;
  const xs = dx === 0 ? [s.start[0] - half, s.start[0] + half] : [s.start[0], end[0]];
  const zs = dz === 0 ? [s.start[1] - half, s.start[1] + half] : [s.start[1], end[1]];
  return {
    min: [Math.min(xs[0]!, xs[1]!), Math.min(zs[0]!, zs[1]!)],
    max: [Math.max(xs[0]!, xs[1]!), Math.max(zs[0]!, zs[1]!)],
  };
}

export interface Block {
  /** 가운데 (x, y, z). y는 그 층 바닥 기준 */
  center: [number, number, number];
  size: [number, number, number];
}

/** 계단 블록들 (꽉 찬 계단). 한 층 높이를 STAIR_STEPS칸으로 오른다 */
export function stairBlocks(s: StairSpec): Block[] {
  const [dx, dz] = WALL_NORMALS[s.dir];
  const depth = STAIR_RUN / STAIR_STEPS;
  const rise = FLOOR_HEIGHT / STAIR_STEPS;
  return Array.from({ length: STAIR_STEPS }, (_, i) => {
    const d = depth * (i + 0.5);
    const h = rise * (i + 1);
    return {
      center: [s.start[0] + dx * d, h / 2, s.start[1] + dz * d],
      size: dx === 0 ? [s.width, h, depth] : [depth, h, s.width],
    };
  });
}
```

계단은 각 건물의 계단참(`landing`) 바로 옆, 벽에 붙여 북쪽으로 오른다. 본관(hm#3)도 미리 정해 둔다.

`apps/web/src/world/campus/buildingStyles.ts`:
```ts
import type { BuildingId } from '@4this/shared';
import type { StairSpec } from './buildingGeometry';

export interface BuildingStyle {
  /** 외벽 */
  wall: string;
  /** 문틀·옥상 난간·이름표 */
  trim: string;
  /** 실내 바닥 */
  floor: string;
  /** 1층에서 2층으로 오르는 계단 (층마다 같은 자리). 1층짜리 건물은 null */
  stairs: StairSpec | null;
}

/** 건물별 파스텔 색과 계단 자리. 계단은 각 장소의 landing(계단참) 바로 옆에 둔다 */
export const BUILDING_STYLES: Record<BuildingId, BuildingStyle> = {
  eng: {
    wall: '#ffe3ea',
    trim: '#ffb3c7',
    floor: '#f6eadf',
    stairs: { start: [19.3, 3.4], dir: 'n', width: 1 },
  },
  lab: {
    wall: '#e3effb',
    trim: '#a9cdf0',
    floor: '#eef0f5',
    stairs: { start: [-19.3, -12.4], dir: 'n', width: 1 },
  },
  main: {
    wall: '#fff3dc',
    trim: '#f3c98b',
    floor: '#f7eee2',
    stairs: { start: [7.3, -12.4], dir: 'n', width: 1 },
  },
  cafe: {
    wall: '#e3f5e8',
    trim: '#a7dcb6',
    floor: '#f3eadf',
    stairs: null,
  },
};
```

- [x] **Step 4: 통과 확인**

Run: `npm test -w @4this/web`
Expected: PASS — buildingGeometry 12개

- [x] **Step 5: 커밋**

```bash
git add apps/web/src/world/campus/buildingGeometry.ts apps/web/src/world/campus/buildingGeometry.test.ts apps/web/src/world/campus/buildingStyles.ts
git commit -m "feat: 건물 벽·창·문·바닥판·계단 계산"
```

---

### Task 3: Kenney 가구 에셋과 좌석 → 가구 계산

**Files:**
- Create: `apps/web/public/assets/kenney/*.glb` (11개), `apps/web/src/world/campus/furniture.ts`
- Modify: `apps/web/src/world/campus/assets.ts`, `CREDITS.md`
- Test: `apps/web/src/world/campus/furniture.test.ts` (assets.test.ts는 hm#1 것이 그대로 새 의자도 검사한다)

**Interfaces:**
- Consumes: `Seat`, `Vec2`, `CAMPUS`, `ModelItem` (hm#1 `models.tsx`), `SEAT_HEIGHT` (hm#1 `assets.ts`)
- Produces:
  - `MODELS`에 `desk`, `chairDesk`, `laptop`, `computerScreen`, `computerKeyboard`, `bookcaseOpen`, `bookcaseClosedWide`, `books`, `pottedPlant`, `plantSmall`, `trashcan`. `KENNEY_SCALE = 2`
  - `DESK_TOP = 0.77`, `TABLE_TOP = 0.75`, `forward(facing): Vec2`, `ahead(seat, d): Vec2`, `chairAt(seat, y): ModelItem`, `facingSeat(seat, d, y): ModelItem`, `centroid(seats): Vec2`, `interface TableBox { center: Vec2; size: Vec2 }`, `tableBetween(seats, gap = 0.65, minSize = 0.8): TableBox`, `interface ClassroomFurniture { chairs; desks; laptops; screens; keyboards }`, `classroomFurniture(seats, y): ClassroomFurniture`

- [x] **Step 1: Kenney Furniture Kit 내려받기 (새 빈 폴더에)**

```bash
DL=$(mktemp -d)   # 새 빈 폴더
curl -fsSL -o "$DL/kenney_furniture-kit.zip" https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip
mkdir "$DL/x" && unzip -q "$DL/kenney_furniture-kit.zip" -d "$DL/x"
head -12 "$DL/x/License.txt"     # "Furniture Kit (2.0)", "License: (Creative Commons Zero, CC0)" 확인
mkdir -p apps/web/public/assets/kenney
for f in desk chairDesk laptop computerScreen computerKeyboard bookcaseOpen bookcaseClosedWide books pottedPlant plantSmall1 trashcan; do
  cp "$DL/x/Models/GLTF format/$f.glb" apps/web/public/assets/kenney/
done
ls apps/web/public/assets/kenney | wc -l    # 11
```

(링크가 바뀌었으면 https://kenney.nl/assets/furniture-kit 페이지의 Download 버튼 주소를 쓴다. zip 안의 `Models/GLTF format/*.glb`만 쓴다.)

- [x] **Step 2: 모델 목록과 출처**

Kenney 모델은 바운딩 박스 원점이 모서리이고 앞면(사람 쪽)이 +z다(의자는 앉은 사람이 +z를 봄, 책상·모니터·책장은 앞면이 +z). `<Model>`이 바닥 가운데로 옮기므로 `yaw`는 모두 0이다. 대체 상자 크기 = 원본 바운딩 박스 × 배율.

`apps/web/src/world/campus/assets.ts` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/assets.ts
+++ b/apps/web/src/world/campus/assets.ts
@@ -1,6 +1,6 @@
 /**
  * 3D 모델 목록. 파일은 apps/web/public/assets/ 에 있다 (CREDITS.md 참고).
- * - scale: 원본 크기에 곱하는 배율 (Kenney는 모두 KENNEY_SCALE)
+ * - scale: 원본 크기에 곱하는 배율 (Kenney는 KENNEY_SCALE, 의자는 앉는 면 기준)
  * - yaw: 모델 앞면이 +z(facing 0)를 보도록 더하는 회전 (라디안)
  * - box: 로딩 실패 때 대신 그리는 상자 크기 [가로 x, 높이 y, 깊이 z] (m, 배율 적용 후)
  * - seatRaw: 앉는 면 높이 (원본 단위). 앉는 모델은 seatRaw × scale = SEAT_HEIGHT가 되게 배율을 정한다
@@ -35,12 +35,44 @@ const kaykit = (
   ...extra,
 });
 
+/** Kenney Furniture Kit은 원본이 작아서 모두 이 배율로 키운다 (책상 높이 약 0.77 m) */
+export const KENNEY_SCALE = 2;
+
+const kenney = (file: string, box: ModelSpec['box'], yaw = 0): ModelSpec => ({
+  url: `/assets/kenney/${file}.glb`,
+  scale: KENNEY_SCALE,
+  yaw,
+  box,
+  textured: false,
+});
+
+/** Kenney 의자: 앉는 면(원본 seatRaw)이 SEAT_HEIGHT에 오도록 배율을 따로 정한다 */
+const kenneyChair = (file: string, seatRaw: number, rawBox: ModelSpec['box']): ModelSpec => {
+  const scale = SEAT_HEIGHT / seatRaw;
+  return {
+    ...kenney(file, [rawBox[0] * scale, rawBox[1] * scale, rawBox[2] * scale]),
+    scale,
+    seatRaw,
+  };
+};
+
 export const MODELS = {
   // 앉는 면(원본 0.1)이 SEAT_HEIGHT가 되는 배율 4.5
   bench: kaykit('bench', SEAT_HEIGHT / 0.1, [1.8, 0.45, 0.68], { seatRaw: 0.1 }),
   streetlight: kaykit('streetlight', 3.8, [1, 3.65, 0.27]),
   bush: kaykit('bush', 3.4, [0.65, 1.3, 0.68], { tint: '#d4f2c8' }),
   trash: kaykit('trash_A', 5, [0.64, 0.26, 0.67]),
+  desk: kenney('desk', [1.47, 0.77, 0.78]),
+  chairDesk: kenneyChair('chairDesk', 0.247, [0.335, 0.608, 0.314]),
+  laptop: kenney('laptop', [0.53, 0.32, 0.48]),
+  computerScreen: kenney('computerScreen', [0.79, 0.59, 0.21]),
+  computerKeyboard: kenney('computerKeyboard', [0.56, 0.06, 0.24]),
+  bookcaseOpen: kenney('bookcaseOpen', [0.8, 1.76, 0.5]),
+  bookcaseClosedWide: kenney('bookcaseClosedWide', [1.6, 1.58, 0.5]),
+  books: kenney('books', [0.3, 0.21, 0.19]),
+  pottedPlant: kenney('pottedPlant', [0.42, 1.31, 0.48]),
+  plantSmall: kenney('plantSmall1', [0.19, 0.28, 0.19]),
+  trashcan: kenney('trashcan', [0.42, 0.86, 0.47]),
 } satisfies Record<string, ModelSpec>;
 
 export type ModelName = keyof typeof MODELS;
```

`CREDITS.md` (바뀐 부분):
```diff
--- a/CREDITS.md
+++ b/CREDITS.md
@@ -3,9 +3,10 @@
 4thIS-world의 3D 소품은 아래 CC0(퍼블릭 도메인) 에셋을 쓴다. 출처 표기는 의무가 아니지만 감사의 뜻으로 남긴다.
 원본 색은 불러올 때 파스텔로 바꾼다(`apps/web/src/world/campus/pastel.ts`). 파일 자체는 고치지 않았다.
 
-| 팩                           | 만든 사람                          | 라이선스 | 받은 곳                                                                                                                                                              | 쓰는 파일 (`apps/web/public/assets/`)                                                                                   |
-| ---------------------------- | ---------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
-| KayKit City Builder Bits 1.0 | Kay Lousberg (www.kaylousberg.com) | CC0 1.0  | https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0 (커밋 `63976910ca04d16f0fc531b9c614244be8128713`, `addons/kaykit_city_builder_bits/Assets/gltf/`) | `kaykit/bench`, `kaykit/streetlight`, `kaykit/bush`, `kaykit/trash_A` (`.gltf` + `.bin`), `kaykit/citybits_texture.png` |
+| 팩                           | 만든 사람                          | 라이선스 | 받은 곳                                                                                                                                                              | 쓰는 파일 (`apps/web/public/assets/`)                                                                                                                                                                                                              |
+| ---------------------------- | ---------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| KayKit City Builder Bits 1.0 | Kay Lousberg (www.kaylousberg.com) | CC0 1.0  | https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0 (커밋 `63976910ca04d16f0fc531b9c614244be8128713`, `addons/kaykit_city_builder_bits/Assets/gltf/`) | `kaykit/bench`, `kaykit/streetlight`, `kaykit/bush`, `kaykit/trash_A` (`.gltf` + `.bin`), `kaykit/citybits_texture.png`                                                                                                                            |
+| Kenney Furniture Kit 2.0     | Kenney (www.kenney.nl)             | CC0 1.0  | https://kenney.nl/assets/furniture-kit (`kenney_furniture-kit.zip`의 `Models/GLTF format/`)                                                                          | `kenney/desk`, `kenney/chairDesk`, `kenney/laptop`, `kenney/computerScreen`, `kenney/computerKeyboard`, `kenney/bookcaseOpen`, `kenney/bookcaseClosedWide`, `kenney/books`, `kenney/pottedPlant`, `kenney/plantSmall1`, `kenney/trashcan` (`.glb`) |
 
 나머지(지형·길·풀·나무·꽃·연못·정문·게시판·건물·칠판·교탁·배식대)는 코드로 만든다.
 
```

- [x] **Step 3: 실패하는 테스트 작성**

`apps/web/src/world/campus/furniture.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { CAMPUS, type Seat } from '@4this/shared';
import { ahead, centroid, classroomFurniture, DESK_TOP, forward, tableBetween } from './furniture';

const N = 0;
const S = Math.PI;

describe('forward / ahead', () => {
  it('facing 0은 +z, π는 -z, π/2는 +x', () => {
    expect(forward(0)[1]).toBeCloseTo(1);
    expect(forward(Math.PI)[1]).toBeCloseTo(-1);
    expect(forward(Math.PI / 2)[0]).toBeCloseTo(1);
    const p = ahead({ pos: [1, 1], facing: S }, 2);
    expect(p[0]).toBeCloseTo(1);
    expect(p[1]).toBeCloseTo(-1);
  });
});

describe('classroomFurniture', () => {
  const seats = CAMPUS.places['eng-1f'].seats;
  const f = classroomFurniture(seats, 3.2);

  it('좌석 하나 = 의자 하나, 의자는 좌석 자리·방향 그대로', () => {
    expect(f.chairs).toHaveLength(seats.length);
    f.chairs.forEach((c, i) => {
      expect(c.pos).toEqual([seats[i]!.pos[0], 3.2, seats[i]!.pos[1]]);
      expect(c.rotY).toBe(seats[i]!.facing);
    });
  });

  it('책상은 좌석 앞 0.7 m에서 사람을 마주 본다', () => {
    f.desks.forEach((d, i) => {
      const s = seats[i]!;
      const [fx, fz] = forward(s.facing);
      expect(d.pos[0]).toBeCloseTo(s.pos[0] + fx * 0.7);
      expect(d.pos[2]).toBeCloseTo(s.pos[1] + fz * 0.7);
      expect(d.rotY).toBeCloseTo(s.facing + Math.PI);
    });
  });

  it('노트북과 PC(모니터+키보드)를 번갈아 책상 위에 둔다', () => {
    expect(f.laptops).toHaveLength(3);
    expect(f.screens).toHaveLength(3);
    expect(f.keyboards).toHaveLength(3);
    for (const l of [...f.laptops, ...f.screens]) expect(l.pos[1]).toBeCloseTo(3.2 + DESK_TOP);
  });

  it('책상은 건물 안에 있다', () => {
    const b = CAMPUS.buildings.eng;
    for (const d of f.desks) {
      expect(d.pos[0]).toBeGreaterThan(b.min[0] + 0.9);
      expect(d.pos[0]).toBeLessThan(b.max[0] - 0.9);
      expect(d.pos[2]).toBeGreaterThan(b.min[1] + 0.6);
    }
  });
});

describe('centroid / tableBetween', () => {
  it('연구동 2F 큰 테이블은 6자리 가운데에 있고 의자와 겹치지 않는다', () => {
    const seats = CAMPUS.places['lab-2f'].seats;
    const t = tableBetween(seats);
    const c = centroid(seats);
    expect(t.center[0]).toBeCloseTo(c[0]);
    expect(t.center[1]).toBeCloseTo(c[1]);
    for (const s of seats) {
      const dx = Math.abs(s.pos[0] - t.center[0]) - t.size[0] / 2;
      const dz = Math.abs(s.pos[1] - t.center[1]) - t.size[1] / 2;
      // 좌석은 테이블 가장자리에서 0.3 m 이상 바깥에 있다
      expect(Math.max(dx, dz)).toBeGreaterThanOrEqual(0.3);
    }
  });

  it('마주 보는 2인 자리는 그 사이에 작은 테이블', () => {
    const seats: Seat[] = [
      { pos: [0, -0.7], facing: N },
      { pos: [0, 0.7], facing: S },
    ];
    const t = tableBetween(seats);
    expect(t.center).toEqual([0, 0]);
    expect(t.size[0]).toBeCloseTo(0.8);
    expect(t.size[1]).toBeCloseTo(0.8);
  });
});
```

- [x] **Step 4: 실패 확인**

Run: `npm test -w @4this/web`
Expected: FAIL — `Failed to resolve import "./furniture"`

- [x] **Step 5: 구현**

`apps/web/src/world/campus/furniture.ts`:
```ts
import type { Seat, Vec2 } from '@4this/shared';
import type { ModelItem } from './models';

/**
 * 좌석 → 가구 위치 계산 (순수 함수). 가구는 항상 CAMPUS.places[*].seats에서 계산해
 * 캐릭터가 앉는 자리와 의자가 어긋나지 않게 한다. 좌석 하나 = 의자 하나.
 * Kenney 모델은 앞면(사람 쪽)이 +z다: 의자는 facing 그대로, 책상·모니터·노트북·책장은
 * 사람을 마주 보도록 facing + π로 돌린다.
 */

/** Kenney 책상(배율 2) 윗면 높이 */
export const DESK_TOP = 0.77;
/** 코드로 만든 테이블 윗면 높이 */
export const TABLE_TOP = 0.75;

/** facing 방향 단위 벡터 (0이면 +z) */
export function forward(facing: number): Vec2 {
  return [Math.sin(facing), Math.cos(facing)];
}

/** 좌석에서 바라보는 쪽으로 d만큼 간 점 */
export function ahead(seat: Seat, d: number): Vec2 {
  const [fx, fz] = forward(seat.facing);
  return [seat.pos[0] + fx * d, seat.pos[1] + fz * d];
}

/** 좌석 자리의 의자 */
export function chairAt(seat: Seat, y: number): ModelItem {
  return { pos: [seat.pos[0], y, seat.pos[1]], rotY: seat.facing };
}

/** 좌석 앞 d m에 놓고 앞면이 사람을 보게 한 물건 */
export function facingSeat(seat: Seat, d: number, y: number): ModelItem {
  const [x, z] = ahead(seat, d);
  return { pos: [x, y, z], rotY: seat.facing + Math.PI };
}

/** 좌석들의 가운데 */
export function centroid(seats: readonly Seat[]): Vec2 {
  const n = seats.length || 1;
  return [seats.reduce((s, x) => s + x.pos[0], 0) / n, seats.reduce((s, x) => s + x.pos[1], 0) / n];
}

export interface TableBox {
  center: Vec2;
  /** x 방향 길이, z 방향 길이 */
  size: Vec2;
}

/**
 * 둘러앉은 좌석들 사이의 테이블. 좌석 바운딩 박스를 사방 gap만큼 줄인다.
 * 한 방향으로만 늘어선 경우(2인 마주 보기 등)에는 그 방향 길이를 minSize로 둔다.
 */
export function tableBetween(seats: readonly Seat[], gap = 0.65, minSize = 0.8): TableBox {
  const xs = seats.map((s) => s.pos[0]);
  const zs = seats.map((s) => s.pos[1]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const z0 = Math.min(...zs);
  const z1 = Math.max(...zs);
  const sideways = seats.some((s) => Math.abs(Math.sin(s.facing)) > 0.5);
  const along = seats.some((s) => Math.abs(Math.cos(s.facing)) > 0.5);
  const w = sideways ? x1 - x0 - gap * 2 : Math.max(minSize, x1 - x0 + minSize);
  const d = along ? z1 - z0 - gap * 2 : Math.max(minSize, z1 - z0 + minSize);
  return {
    center: [(x0 + x1) / 2, (z0 + z1) / 2],
    size: [Math.max(minSize, w), Math.max(minSize, d)],
  };
}

export interface ClassroomFurniture {
  chairs: ModelItem[];
  desks: ModelItem[];
  laptops: ModelItem[];
  screens: ModelItem[];
  keyboards: ModelItem[];
}

/** 강의실·연구실 자리: 좌석마다 의자 + 책상, 책상 위에 노트북과 PC를 번갈아 (짝수 번 노트북) */
export function classroomFurniture(seats: readonly Seat[], y: number): ClassroomFurniture {
  const out: ClassroomFurniture = {
    chairs: [],
    desks: [],
    laptops: [],
    screens: [],
    keyboards: [],
  };
  seats.forEach((seat, i) => {
    out.chairs.push(chairAt(seat, y));
    out.desks.push(facingSeat(seat, 0.7, y));
    if (i % 2 === 0) {
      out.laptops.push(facingSeat(seat, 0.72, y + DESK_TOP));
    } else {
      out.screens.push(facingSeat(seat, 0.9, y + DESK_TOP));
      out.keyboards.push(facingSeat(seat, 0.55, y + DESK_TOP));
    }
  });
  return out;
}
```

- [x] **Step 6: 통과 확인**

Run: `npm test -w @4this/web`
Expected: PASS — furniture 7개, assets 2개(의자 `chairDesk` 앉는 면 0.45 m 포함)

- [x] **Step 7: 커밋**

```bash
git add apps/web/public/assets/kenney CREDITS.md apps/web/src/world/campus/assets.ts apps/web/src/world/campus/furniture.ts apps/web/src/world/campus/furniture.test.ts
git commit -m "feat: Kenney 가구 에셋과 좌석 기준 가구 배치 계산"
```

---

### Task 4: 건물 모듈 (껍데기 지오메트리·컷어웨이·층 숨김·클릭·강조)와 코드 가구

**Files:**
- Create: `apps/web/src/world/campus/shellGeometry.ts`, `apps/web/src/world/campus/Building.tsx`, `apps/web/src/world/campus/CodeProps.tsx`

**Interfaces:**
- Consumes: Task 1~3, `doorPoint`, `WALL_NORMALS` (hm#1), `labelTexture` (hm#1), `itemMatrix`·`ModelItem` (hm#1)
- Produces:
  - `buildShell(b, door, stairs): ShellGeometry` — `{ walls: Record<WallSide, { wall; outline; glass | null }[]>; slabs; stairs; roof; doorFrame }`, `disposeShell(s)`, `mergeBlocks(blocks): BufferGeometry`
  - `interface BuildingProps { id: BuildingId; hiddenAboveFloor: number | null; focused: boolean; onClick?: (id) => void; interior?: (floor: number) => ReactNode; floorColors?: Partial<Record<number, string>> }`, `<Building ... />` — 벽 면마다 재질 1개(투명도 공유), 창유리는 (면 × 층)마다 재질 1개(hm#4에서 층별 밤 불빛에 쓴다), 포커스 시 바닥 둘레 깜빡이는 띠와 큰 이름표
  - `<Blackboard pos rotY width? />`, `<Lectern pos rotY />`, `<WallSign pos rotY text bg? width? />`, `<Table center size y color? top? />`

- [x] **Step 1: 껍데기 지오메트리**

벽 조각 상자들을 (벽 면 × 층)마다 `mergeGeometries`로 하나로 합친다. 테두리선은 벽 바깥 면에서 1 cm 띄운 `LineSegments`, 창유리는 바깥 법선을 보는 평면이다.

`apps/web/src/world/campus/shellGeometry.ts`:
```ts
import { BoxGeometry, BufferGeometry, Float32BufferAttribute, PlaneGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FLOOR_HEIGHT, type Building } from '@4this/shared';
import {
  floorY,
  PARAPET_H,
  rectMinus,
  SLAB_LIFT,
  SLAB_T,
  stairBlocks,
  stairHole,
  wallFrame,
  wallOpenings,
  wallOutline,
  wallPieces,
  WALL_SIDES,
  WALL_T,
  type Block,
  type Box2,
  type StairSpec,
  type WallFrame,
} from './buildingGeometry';
import type { DoorInfo, WallSide } from './layout';

/**
 * 건물 껍데기를 three 지오메트리로 만든다. 벽 한 면·한 층의 상자들은 하나로 합쳐
 * (벽 면 × 층)마다 드로우콜 1개가 되게 한다.
 */

/** 상자 목록 → 합친 지오메트리 하나 */
export function mergeBlocks(blocks: readonly Block[]): BufferGeometry {
  const parts = blocks.map((b) =>
    new BoxGeometry(b.size[0], b.size[1], b.size[2]).translate(
      b.center[0],
      b.center[1],
      b.center[2],
    ),
  );
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return merged;
}

/** 벽 좌표 사각형(u, v) → 그 벽 위의 월드 상자 */
function wallBlock(
  f: WallFrame,
  y0: number,
  r: { u0: number; u1: number; v0: number; v1: number },
  depth = WALL_T,
): Block {
  const uc = (r.u0 + r.u1) / 2;
  const w = r.u1 - r.u0;
  const h = r.v1 - r.v0;
  const along = f.dir[0] !== 0;
  return {
    center: [f.origin[0] + f.dir[0] * uc, y0 + (r.v0 + r.v1) / 2, f.origin[1] + f.dir[1] * uc],
    size: along ? [w, h, depth] : [depth, h, w],
  };
}

export interface WallFloorGeometry {
  wall: BufferGeometry;
  outline: BufferGeometry;
  /** 창유리 (없으면 null) */
  glass: BufferGeometry | null;
}

export interface ShellGeometry {
  /** walls[side][floor - 1] */
  walls: Record<WallSide, WallFloorGeometry[]>;
  /** slabs[floor - 1]: 그 층 바닥판 (위층은 계단 구멍) */
  slabs: BufferGeometry[];
  /** stairs[floor - 1]: 그 층에서 위층으로 오르는 계단. 없으면 null */
  stairs: (BufferGeometry | null)[];
  /** 옥상 바닥 + 난간 */
  roof: BufferGeometry;
  /** 1층 문틀 + 차양 */
  doorFrame: BufferGeometry;
}

function outlineGeometry(f: WallFrame, y0: number, segs: [number, number, number, number][]) {
  const out = WALL_T / 2 + 0.01; // 바깥 면에 살짝 띄운다
  const ox = f.normal[0] * out;
  const oz = f.normal[1] * out;
  const pos: number[] = [];
  for (const [u0, v0, u1, v1] of segs) {
    pos.push(
      f.origin[0] + f.dir[0] * u0 + ox,
      y0 + v0,
      f.origin[1] + f.dir[1] * u0 + oz,
      f.origin[0] + f.dir[0] * u1 + ox,
      y0 + v1,
      f.origin[1] + f.dir[1] * u1 + oz,
    );
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}

function glassGeometry(
  f: WallFrame,
  y0: number,
  windows: { u0: number; u1: number; v0: number; v1: number }[],
) {
  if (windows.length === 0) return null;
  const parts = windows.map((r) => {
    const uc = (r.u0 + r.u1) / 2;
    const g = new PlaneGeometry(r.u1 - r.u0, r.v1 - r.v0);
    // 평면 기본 법선 +z → 벽 바깥 법선 쪽으로 돌린다
    g.rotateY(Math.atan2(f.normal[0], f.normal[1]));
    g.translate(f.origin[0] + f.dir[0] * uc, y0 + (r.v0 + r.v1) / 2, f.origin[1] + f.dir[1] * uc);
    return g;
  });
  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  return merged;
}

/** 건물 하나의 껍데기 전체 */
export function buildShell(
  b: Pick<Building, 'min' | 'max' | 'floors'>,
  door: DoorInfo,
  stairs: StairSpec | null,
): ShellGeometry {
  const walls = {} as Record<WallSide, WallFloorGeometry[]>;
  for (const side of WALL_SIDES) {
    const f = wallFrame(b, side);
    walls[side] = Array.from({ length: b.floors }, (_, i) => {
      const floor = i + 1;
      const y0 = floorY(floor);
      const openings = wallOpenings(f, floor, door);
      const pieces = wallPieces(f.length, FLOOR_HEIGHT, openings);
      return {
        wall: mergeBlocks(pieces.map((r) => wallBlock(f, y0, r))),
        outline: outlineGeometry(f, y0, wallOutline(f.length, FLOOR_HEIGHT, openings)),
        glass: glassGeometry(
          f,
          y0,
          openings.filter((o) => o.v0 > 0),
        ),
      };
    });
  }

  const outer: Box2 = { min: b.min, max: b.max };
  const hole = stairs ? stairHole(stairs) : null;
  const slabs = Array.from({ length: b.floors }, (_, i) => {
    const top = floorY(i + 1) + SLAB_LIFT;
    const rects = rectMinus(outer, i === 0 ? null : hole);
    return mergeBlocks(
      rects.map((r) => ({
        center: [(r.min[0] + r.max[0]) / 2, top - SLAB_T / 2, (r.min[1] + r.max[1]) / 2],
        size: [r.max[0] - r.min[0], SLAB_T, r.max[1] - r.min[1]],
      })),
    );
  });

  const stairGeos = Array.from({ length: b.floors }, (_, i) => {
    if (!stairs || i + 1 >= b.floors) return null;
    const y = floorY(i + 1) + SLAB_LIFT;
    return mergeBlocks(
      stairBlocks(stairs).map((s) => ({
        center: [s.center[0], s.center[1] + y, s.center[2]],
        size: s.size,
      })),
    );
  });

  const roofY = floorY(b.floors + 1);
  const roofBlocks: Block[] = [
    {
      center: [(b.min[0] + b.max[0]) / 2, roofY, (b.min[1] + b.max[1]) / 2],
      size: [b.max[0] - b.min[0] + 0.2, 0.2, b.max[1] - b.min[1] + 0.2],
    },
  ];
  for (const side of WALL_SIDES) {
    const f = wallFrame(b, side);
    roofBlocks.push(
      wallBlock(f, roofY + 0.1, { u0: -0.1, u1: f.length + 0.1, v0: 0, v1: PARAPET_H }, 0.3),
    );
  }

  const df = wallFrame(b, door.side);
  const du = (door.pos[0] - df.origin[0]) * df.dir[0] + (door.pos[1] - df.origin[1]) * df.dir[1];
  const frame = (u0: number, u1: number, v0: number, v1: number, depth: number, push: number) => {
    const blk = wallBlock(df, 0, { u0, u1, v0, v1 }, depth);
    blk.center[0] += df.normal[0] * push;
    blk.center[2] += df.normal[1] * push;
    return blk;
  };
  const doorFrame = mergeBlocks([
    frame(du - 0.95, du - 0.8, 0, 2.55, 0.34, 0.03),
    frame(du + 0.8, du + 0.95, 0, 2.55, 0.34, 0.03),
    frame(du - 0.95, du + 0.95, 2.4, 2.55, 0.34, 0.03),
    // 차양
    frame(du - 1.2, du + 1.2, 2.75, 2.87, 1.1, 0.55),
  ]);

  return { walls, slabs, stairs: stairGeos, roof: mergeBlocks(roofBlocks), doorFrame };
}

/** 지오메트리를 모두 정리한다 (건물이 사라질 때) */
export function disposeShell(s: ShellGeometry) {
  for (const side of WALL_SIDES) {
    for (const w of s.walls[side]) {
      w.wall.dispose();
      w.outline.dispose();
      w.glass?.dispose();
    }
  }
  for (const g of [...s.slabs, ...s.stairs, s.roof, s.doorFrame]) g?.dispose();
}
```

- [x] **Step 2: Building 컴포넌트**

`useFrame`에서 벽 면마다 `wallFacesCamera` → `approach`로 불투명도를 옮기고, 0.99보다 낮으면 `depthWrite`를 꺼서 뒤쪽 실내가 보이게 한다. 테두리선 재질은 `edgeOpacity`로, 0이면 `visible = false`(드로우콜 없음).

`apps/web/src/world/campus/Building.tsx`:
```tsx
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  DoubleSide,
  LineBasicMaterial,
  MeshStandardMaterial,
  type Material,
  type Mesh,
} from 'three';
import { CAMPUS, FLOOR_HEIGHT, type BuildingId, type Vec2 } from '@4this/shared';
import { WALL_SIDES } from './buildingGeometry';
import { BUILDING_STYLES } from './buildingStyles';
import { approach, edgeOpacity, targetOpacity, wallFacesCamera } from './cutaway';
import { doorPoint, WALL_NORMALS, type WallSide } from './layout';
import { buildShell, disposeShell } from './shellGeometry';
import { labelTexture } from './signTexture';

export interface BuildingProps {
  id: BuildingId;
  /** 이 층보다 위층(과 옥상)을 숨긴다. null이면 모두 보임 */
  hiddenAboveFloor: number | null;
  focused: boolean;
  onClick?: (id: BuildingId) => void;
  /** 층마다 실내 가구 (floor는 1부터) */
  interior?: (floor: number) => ReactNode;
  /** 층별 바닥 색 (없으면 건물 기본 바닥 색) */
  floorColors?: Partial<Record<number, string>>;
}

interface SideMaterials {
  wall: MeshStandardMaterial;
  edge: LineBasicMaterial;
  /** glass[floor - 1] */
  glass: MeshStandardMaterial[];
}

const GLASS_OPACITY = 0.45;

/**
 * 데이터(CAMPUS.buildings[id])로 조립한 건물: 바닥판·외벽(창문 구멍)·문·계단·옥상 난간.
 * 매 프레임 카메라 쪽 벽을 투명하게 하고(컷어웨이) 테두리선만 남긴다.
 */
export function Building({
  id,
  hiddenAboveFloor,
  focused,
  onClick,
  interior,
  floorColors,
}: BuildingProps) {
  const b = CAMPUS.buildings[id];
  const style = BUILDING_STYLES[id];
  const center: Vec2 = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2];
  const door = useMemo(() => doorPoint(b, CAMPUS.graph.nodes[b.doorNode]!), [b]);
  const shell = useMemo(() => buildShell(b, door, style.stairs), [b, door, style]);
  useEffect(() => () => disposeShell(shell), [shell]);

  const mats = useMemo(() => {
    const out = {} as Record<WallSide, SideMaterials>;
    for (const side of WALL_SIDES) {
      out[side] = {
        wall: new MeshStandardMaterial({ color: style.wall, roughness: 0.85, transparent: true }),
        edge: new LineBasicMaterial({ color: style.trim, transparent: true, opacity: 0 }),
        glass: Array.from(
          { length: b.floors },
          () =>
            new MeshStandardMaterial({
              color: '#d6ecfa',
              roughness: 0.2,
              transparent: true,
              opacity: GLASS_OPACITY,
              side: DoubleSide,
              depthWrite: false,
            }),
        ),
      };
    }
    return out;
  }, [b.floors, style]);
  useEffect(
    () => () => {
      for (const side of WALL_SIDES) {
        const m = mats[side];
        [m.wall, m.edge, ...m.glass].forEach((x: Material) => x.dispose());
      }
    },
    [mats],
  );

  const opacity = useRef<Record<WallSide, number>>({ n: 1, e: 1, s: 1, w: 1 });
  useFrame((state, delta) => {
    const cam = state.camera.position;
    const dt = Math.min(delta, 0.1);
    for (const side of WALL_SIDES) {
      const facing = wallFacesCamera(WALL_NORMALS[side], center, [cam.x, cam.z]);
      const cur = approach(opacity.current[side], targetOpacity(facing), dt);
      opacity.current[side] = cur;
      const m = mats[side];
      m.wall.opacity = cur;
      m.wall.depthWrite = cur > 0.99;
      m.edge.opacity = edgeOpacity(cur);
      m.edge.visible = m.edge.opacity > 0.01;
      for (const g of m.glass) g.opacity = GLASS_OPACITY * cur;
    }
  });

  const label = useMemo(
    () => labelTexture(b.name, { bg: style.trim, fg: '#ffffff', width: 384, height: 128 }),
    [b.name, style.trim],
  );
  useEffect(() => () => label.dispose(), [label]);

  const visibleFloor = (floor: number) => hiddenAboveFloor === null || floor <= hiddenAboveFloor;
  const roofY = b.floors * FLOOR_HEIGHT;
  const click = (e: ThreeEvent<MouseEvent>) => {
    if (!onClick) return;
    e.stopPropagation();
    onClick(id);
  };

  return (
    <group onClick={click}>
      {Array.from({ length: b.floors }, (_, i) => {
        const floor = i + 1;
        return (
          <group key={floor} visible={visibleFloor(floor)}>
            <mesh geometry={shell.slabs[i]} receiveShadow castShadow>
              <meshStandardMaterial color={floorColors?.[floor] ?? style.floor} roughness={0.9} />
            </mesh>
            {shell.stairs[i] && (
              <mesh geometry={shell.stairs[i]!} receiveShadow castShadow>
                <meshStandardMaterial color={style.trim} roughness={0.85} />
              </mesh>
            )}
            {WALL_SIDES.map((side) => {
              const g = shell.walls[side][i]!;
              return (
                <group key={side}>
                  <mesh geometry={g.wall} material={mats[side].wall} castShadow receiveShadow />
                  <lineSegments geometry={g.outline} material={mats[side].edge} />
                  {g.glass && <mesh geometry={g.glass} material={mats[side].glass[i]} />}
                </group>
              );
            })}
            {interior?.(floor)}
          </group>
        );
      })}
      <mesh geometry={shell.doorFrame} castShadow>
        <meshStandardMaterial color={style.trim} roughness={0.8} />
      </mesh>
      <mesh geometry={shell.roof} visible={hiddenAboveFloor === null} castShadow receiveShadow>
        <meshStandardMaterial color={style.trim} roughness={0.85} />
      </mesh>
      <sprite
        position={[center[0], roofY + (focused ? 2.2 : 1.6), center[1]]}
        scale={focused ? [4.2, 1.4, 1] : [3, 1, 1]}
      >
        <spriteMaterial map={label} transparent depthWrite={false} toneMapped={false} />
      </sprite>
      {focused && <FocusRing min={b.min} max={b.max} color={style.trim} />}
    </group>
  );
}

/** 포커스된 건물 바닥 둘레에서 깜빡이는 띠 */
function FocusRing({ min, max, color }: { min: Vec2; max: Vec2; color: string }) {
  const ref = useRef<Mesh[]>([]);
  useFrame((state) => {
    const o = 0.55 + 0.35 * Math.sin(state.clock.elapsedTime * 3);
    for (const m of ref.current) if (m) (m.material as MeshStandardMaterial).opacity = o;
  });
  const pad = 0.6;
  const x0 = min[0] - pad;
  const x1 = max[0] + pad;
  const z0 = min[1] - pad;
  const z1 = max[1] + pad;
  const t = 0.3;
  const bars: [number, number, number, number][] = [
    [(x0 + x1) / 2, z0, x1 - x0 + t, t],
    [(x0 + x1) / 2, z1, x1 - x0 + t, t],
    [x0, (z0 + z1) / 2, t, z1 - z0],
    [x1, (z0 + z1) / 2, t, z1 - z0],
  ];
  return (
    <group>
      {bars.map(([x, z, w, d], i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) ref.current[i] = m;
          }}
          position={[x, 0.1, z]}
        >
          <boxGeometry args={[w, 0.06, d]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.6}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}
    </group>
  );
}
```

- [x] **Step 3: 코드 가구 (칠판·교탁·벽 표지판·테이블)**

`apps/web/src/world/campus/CodeProps.tsx`:
```tsx
import { useEffect, useMemo } from 'react';
import type { Vec2 } from '@4this/shared';
import { TABLE_TOP } from './furniture';
import { labelTexture } from './signTexture';

/** 두 팩에 없는 가구는 코드로 만든다: 칠판·교탁·층 표지판·큰 테이블 */

interface Placed {
  /** 바닥 위 자리 (x, y, z). y는 바닥 높이 */
  pos: readonly [number, number, number];
  /** 앞면(+z)이 보는 방향 */
  rotY: number;
}

/** 칠판: 초록 판 + 나무 테두리 + 분필 받침. 앞면이 rotY 쪽을 본다 */
export function Blackboard({ pos, rotY, width = 4 }: Placed & { width?: number }) {
  return (
    <group position={pos} rotation-y={rotY}>
      <mesh position={[0, 1.6, 0]} castShadow>
        <boxGeometry args={[width + 0.16, 1.36, 0.06]} />
        <meshStandardMaterial color="#e8c9a6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.6, 0.035]}>
        <planeGeometry args={[width, 1.2]} />
        <meshStandardMaterial color="#7fa894" roughness={0.95} />
      </mesh>
      {[1.95, 1.75, 1.55].map((y, i) => (
        <mesh key={y} position={[-width / 2 + 1 + i * 0.15, y, 0.04]}>
          <planeGeometry args={[1.4 - i * 0.3, 0.05]} />
          <meshBasicMaterial color="#f4f8f2" />
        </mesh>
      ))}
      <mesh position={[0, 0.88, 0.08]} castShadow>
        <boxGeometry args={[width * 0.9, 0.05, 0.12]} />
        <meshStandardMaterial color="#e8c9a6" roughness={0.9} />
      </mesh>
      <mesh position={[0.6, 0.92, 0.08]} rotation-z={Math.PI / 2}>
        <cylinderGeometry args={[0.015, 0.015, 0.12, 6]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/** 교탁: 앞면 판 + 윗판 */
export function Lectern({ pos, rotY }: Placed) {
  return (
    <group position={pos} rotation-y={rotY}>
      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1, 1.1, 0.55]} />
        <meshStandardMaterial color="#e9cfb3" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.13, -0.03]} castShadow>
        <boxGeometry args={[1.12, 0.06, 0.66]} />
        <meshStandardMaterial color="#d8b593" roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.6, 0.28]}>
        <boxGeometry args={[0.6, 0.3, 0.02]} />
        <meshStandardMaterial color="#ffb3c7" roughness={0.8} />
      </mesh>
    </group>
  );
}

/** 벽에 붙이는 글자 표지판 ("1학년") */
export function WallSign({
  pos,
  rotY,
  text,
  bg = '#ffb3c7',
  width = 1.4,
}: Placed & { text: string; bg?: string; width?: number }) {
  const tex = useMemo(
    () => labelTexture(text, { bg, fg: '#ffffff', width: 384, height: 128, fontSize: 68 }),
    [text, bg],
  );
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={pos} rotation-y={rotY}>
      <planeGeometry args={[width, width / 3]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} />
    </mesh>
  );
}

/** 사각 테이블: 윗판 + 다리 4개 */
export function Table({
  center,
  size,
  y,
  color = '#f1d9bf',
  top = TABLE_TOP,
}: {
  center: Vec2;
  size: Vec2;
  y: number;
  color?: string;
  top?: number;
}) {
  const [w, d] = size;
  const legs: Vec2[] = [
    [-w / 2 + 0.1, -d / 2 + 0.1],
    [w / 2 - 0.1, -d / 2 + 0.1],
    [-w / 2 + 0.1, d / 2 - 0.1],
    [w / 2 - 0.1, d / 2 - 0.1],
  ];
  return (
    <group position={[center[0], y, center[1]]}>
      <mesh position-y={top - 0.03} castShadow receiveShadow>
        <boxGeometry args={[w, 0.06, d]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      {legs.map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, (top - 0.06) / 2, z]} castShadow>
          <boxGeometry args={[0.08, top - 0.06, 0.08]} />
          <meshStandardMaterial color="#d8b593" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}
```

- [x] **Step 4: 타입·린트 확인**

Run: `npm run typecheck -w @4this/web && npm run lint`
Expected: 에러 0

- [x] **Step 5: 커밋**

```bash
git add apps/web/src/world/campus/shellGeometry.ts apps/web/src/world/campus/Building.tsx apps/web/src/world/campus/CodeProps.tsx
git commit -m "feat: 데이터로 조립하는 건물 모듈과 컷어웨이·층 숨김"
```

---

### Task 5: 공학관·연구동 실내와 캠퍼스 연결

**Files:**
- Create: `apps/web/src/world/campus/EngInterior.tsx`, `apps/web/src/world/campus/LabInterior.tsx`
- Modify: `apps/web/src/world/campus/Campus.tsx`, `apps/web/src/dev/campus/CampusPreview.tsx`

**Interfaces:**
- Consumes: Task 3·4, `CAMPUS.places['eng-1f' | 'eng-2f' | 'eng-3f' | 'lab-2f']`, `CAMPUS.professorSeat`
- Produces:
  - `<EngInterior floor />`: 북쪽 벽 칠판(좌석 가운데 x)·교탁·"n학년" 표지판, 좌석마다 `chairDesk` + `desk` + (짝수 번 `laptop` / 홀수 번 `computerScreen`+`computerKeyboard`), 화분·쓰레기통
  - `<LabInterior floor />`: 1F 로비(안내 책상·화분, 바닥 어둡게 `floorColors={{ 1: '#a59cb4' }}`), 2F 큰 테이블 + 의자·노트북 6, `professorSeat` 의자·책상·모니터·키보드·책, 책장 파티션(`bookcaseOpen` 4개, 교수님 책상 앞은 비움), 남쪽 벽 `bookcaseClosedWide` 2개(넘침 "책장 옆 스탠딩")
  - `Campus`: 공학관·연구동은 `<Building>`, 본관·카페는 `<BuildingBoxes ids={['main', 'cafe']}>`. `hiddenAboveFloor`는 `focusedBuilding`에만
  - `?dev=campus&building=eng&floor=2`: 시작 포커스·층, 패널에 "1F까지 / 2F까지 / … / 전체 / 닫기" 버튼

- [x] **Step 1: 공학관·연구동 실내**

`apps/web/src/world/campus/EngInterior.tsx`:
```tsx
import { useMemo } from 'react';
import { CAMPUS, type PlaceId } from '@4this/shared';
import { floorY, SLAB_LIFT, WALL_T } from './buildingGeometry';
import { Blackboard, Lectern, WallSign } from './CodeProps';
import { centroid, classroomFurniture } from './furniture';
import { Model } from './models';

/** 공학관 n층 강의실: 북쪽 벽 칠판·교탁·"n학년" 표지판, 좌석마다 책상+의자+노트북/PC */
export function EngInterior({ floor }: { floor: number }) {
  const b = CAMPUS.buildings.eng;
  const place = CAMPUS.places[`eng-${floor}f` as PlaceId];
  const y = floorY(floor) + SLAB_LIFT;
  const f = useMemo(() => classroomFurniture(place.seats, y), [place, y]);
  const cx = centroid(place.seats)[0];
  // 북쪽 벽 안쪽 면
  const wallZ = b.min[1] + WALL_T;

  return (
    <group>
      <Blackboard pos={[cx, y, wallZ + 0.03]} rotY={0} width={4.2} />
      <Lectern pos={[cx, y, b.min[1] + 1.9]} rotY={0} />
      <WallSign pos={[b.min[0] + 1.3, y + 2.35, wallZ + 0.02]} rotY={0} text={`${floor}학년`} />
      <Model name="chairDesk" items={f.chairs} />
      <Model name="desk" items={f.desks} />
      <Model name="laptop" items={f.laptops} />
      <Model name="computerScreen" items={f.screens} />
      <Model name="computerKeyboard" items={f.keyboards} shadows={false} />
      <Model
        name="pottedPlant"
        items={[
          { pos: [b.min[0] + 0.6, y, b.min[1] + 0.6], rotY: 0 },
          { pos: [b.max[0] - 0.6, y, b.min[1] + 0.6], rotY: 0 },
        ]}
      />
      <Model name="trashcan" items={[{ pos: [b.min[0] + 0.5, y, b.max[1] - 0.6], rotY: 0 }]} />
    </group>
  );
}
```

`apps/web/src/world/campus/LabInterior.tsx`:
```tsx
import { useMemo } from 'react';
import { CAMPUS } from '@4this/shared';
import { floorY, SLAB_LIFT } from './buildingGeometry';
import { Table } from './CodeProps';
import { chairAt, DESK_TOP, facingSeat, TABLE_TOP, tableBetween } from './furniture';
import { Model, type ModelItem } from './models';

/** 연구동 1F: 불 꺼진 로비 (안내 데스크와 화분만, 바닥은 어둡게 — Building의 floorColors) */
function Lobby() {
  const y = floorY(1) + SLAB_LIFT;
  return (
    <group>
      <Model name="desk" items={[{ pos: [-15, y, -14.2], rotY: Math.PI }]} />
      <Model
        name="pottedPlant"
        items={[
          { pos: [-13.3, y, -11.8], rotY: 0 },
          { pos: [-16.7, y, -11.8], rotY: 0 },
        ]}
      />
    </group>
  );
}

/** 연구동 2F 연구실: 큰 사각 테이블 + 노트북 6대, 책장 파티션, 건너편 교수님 책상 */
function ResearchRoom() {
  const place = CAMPUS.places['lab-2f'];
  const prof = CAMPUS.professorSeat;
  const y = floorY(2) + SLAB_LIFT;
  const table = useMemo(() => tableBetween(place.seats), [place]);
  const chairs = useMemo(() => place.seats.map((s) => chairAt(s, y)), [place, y]);
  const laptops = useMemo(
    () => place.seats.map((s) => facingSeat(s, 0.85, y + TABLE_TOP)),
    [place, y],
  );
  // 교수님 책상 (professorSeat 기준) 위에 모니터·키보드·책
  const profDesk = facingSeat(prof, 0.7, y);
  const profScreen = facingSeat(prof, 0.9, y + DESK_TOP);
  const profKeys = facingSeat(prof, 0.55, y + DESK_TOP);
  const profBooks: ModelItem = {
    pos: [profDesk.pos[0], y + DESK_TOP, profDesk.pos[2] - 0.5],
    rotY: profDesk.rotY,
  };
  // 팀 테이블과 교수님 자리 사이 책장 파티션 (교수님 책상 앞은 비워 둔다), 앞면이 팀 쪽(-x)
  const partitionX = profDesk.pos[0] - 0.65;
  const partition: ModelItem[] = [-18.4, -17.6, -14, -13.2].map((z) => ({
    pos: [partitionX, y, z],
    rotY: -Math.PI / 2,
  }));
  // 남쪽 벽 책장 (넘칠 때 "책장 옆 스탠딩"), 앞면이 북쪽
  const southShelves: ModelItem[] = [-16.3, -14.6].map((x) => ({
    pos: [x, y, -11.45],
    rotY: Math.PI,
  }));
  return (
    <group>
      <Table center={table.center} size={table.size} y={y} />
      <Model name="chairDesk" items={[...chairs, chairAt(prof, y)]} />
      <Model name="laptop" items={laptops} />
      <Model name="desk" items={[profDesk]} />
      <Model name="computerScreen" items={[profScreen]} />
      <Model name="computerKeyboard" items={[profKeys]} shadows={false} />
      <Model name="books" items={[profBooks]} />
      <Model name="bookcaseOpen" items={partition} />
      <Model name="bookcaseClosedWide" items={southShelves} />
      <Model name="pottedPlant" items={[{ pos: [-10.6, y, -18.4], rotY: 0 }]} />
      <Model
        name="plantSmall"
        items={[{ pos: [table.center[0], y + TABLE_TOP, table.center[1]], rotY: 0 }]}
      />
    </group>
  );
}

export function LabInterior({ floor }: { floor: number }) {
  return floor === 1 ? <Lobby /> : <ResearchRoom />;
}
```

- [x] **Step 2: Campus 연결**

`apps/web/src/world/campus/Campus.tsx` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/Campus.tsx
+++ b/apps/web/src/world/campus/Campus.tsx
@@ -1,9 +1,13 @@
+import type { BuildingId } from '@4this/shared';
 import type { CampusProps } from '../contracts';
+import { Building } from './Building';
 import { BuildingBoxes } from './BuildingBoxes';
+import { EngInterior } from './EngInterior';
 import { Flowers } from './Flowers';
 import { Gate } from './Gate';
 import { Grass } from './Grass';
 import { Ground } from './Ground';
+import { LabInterior } from './LabInterior';
 import { Lights } from './Lights';
 import { NoticeBoard } from './NoticeBoard';
 import { OutdoorProps } from './OutdoorProps';
@@ -12,7 +16,9 @@ import { Pond } from './Pond';
 import { Trees } from './Trees';
 
 /** 4thIS 캠퍼스 전체 (지형·길·자연물·정문·소품·건물·조명) */
-export function Campus({ focusedBuilding, onBuildingClick }: CampusProps) {
+export function Campus({ focusedBuilding, hiddenAboveFloor, onBuildingClick }: CampusProps) {
+  // 층 숨김은 포커스된 건물에만 적용한다
+  const hidden = (id: BuildingId) => (focusedBuilding === id ? hiddenAboveFloor : null);
   return (
     <group>
       <Lights />
@@ -25,7 +31,26 @@ export function Campus({ focusedBuilding, onBuildingClick }: CampusProps) {
       <Gate />
       <NoticeBoard />
       <OutdoorProps />
-      <BuildingBoxes focusedBuilding={focusedBuilding} onBuildingClick={onBuildingClick} />
+      <Building
+        id="eng"
+        hiddenAboveFloor={hidden('eng')}
+        focused={focusedBuilding === 'eng'}
+        onClick={onBuildingClick}
+        interior={(floor) => <EngInterior floor={floor} />}
+      />
+      <Building
+        id="lab"
+        hiddenAboveFloor={hidden('lab')}
+        focused={focusedBuilding === 'lab'}
+        onClick={onBuildingClick}
+        interior={(floor) => <LabInterior floor={floor} />}
+        floorColors={{ 1: '#a59cb4' }}
+      />
+      <BuildingBoxes
+        ids={['main', 'cafe']}
+        focusedBuilding={focusedBuilding}
+        onBuildingClick={onBuildingClick}
+      />
     </group>
   );
 }
```

- [x] **Step 3: 미리보기 페이지에 건물·층 조작 추가**

`apps/web/src/dev/campus/CampusPreview.tsx`:
```tsx
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import { BUILDING_IDS, CAMPUS, type BuildingId } from '@4this/shared';
import { Campus } from '../../world/campus/Campus';

/** '1,2,3' → [1, 2, 3] (잘못되면 기본값) */
function vec3(param: string | null, fallback: [number, number, number]): [number, number, number] {
  const v = param?.split(',').map(Number);
  return v && v.length === 3 && v.every(Number.isFinite) ? [v[0]!, v[1]!, v[2]!] : fallback;
}

const params = new URLSearchParams(window.location.search);
const CAMERA = vec3(params.get('cam'), [38, 34, 40]);
const TARGET = vec3(params.get('target'), [0, 0, 0]);
const START_BUILDING = BUILDING_IDS.find((id) => id === params.get('building')) ?? null;
const START_FLOOR = params.get('floor') ? Number(params.get('floor')) : null;

const panel: React.CSSProperties = {
  position: 'fixed',
  left: 16,
  top: 16,
  padding: '10px 14px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.85)',
  color: '#5b4d6b',
  font: '13px/1.6 sans-serif',
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const chip = (on: boolean): React.CSSProperties => ({
  border: 'none',
  borderRadius: 999,
  padding: '3px 10px',
  marginRight: 4,
  cursor: 'pointer',
  background: on ? '#c9bdf2' : '#f4ecfa',
  color: on ? '#fff' : '#5b4d6b',
});

/**
 * 캠퍼스 미리보기 개발 페이지 (?dev=campus).
 * - cam=x,y,z / target=x,y,z: 카메라 위치·바라보는 점 (스크린샷용)
 * - building=eng&floor=2: 포커스할 건물과 "이 층까지만 보기"
 */
export function CampusPreview() {
  const [focused, setFocused] = useState<BuildingId | null>(START_BUILDING);
  const [floor, setFloor] = useState<number | null>(START_FLOOR);
  const [log, setLog] = useState('건물을 눌러 보세요');
  const floors = focused ? CAMPUS.buildings[focused].floors : 0;

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows camera={{ position: CAMERA, fov: 32 }}>
        <Campus
          now={Date.now()}
          occupiedFloors={new Set()}
          focusedBuilding={focused}
          hiddenAboveFloor={floor}
          onBuildingClick={(id) => {
            setFocused(id);
            setFloor(null);
            setLog(`건물 클릭: ${id}`);
          }}
        />
        <OrbitControls makeDefault target={TARGET} maxPolarAngle={Math.PI * 0.45} />
      </Canvas>
      <div style={panel}>
        <span data-testid="campus-log">{log}</span>
        {focused && (
          <div>
            {CAMPUS.buildings[focused].name}:{' '}
            {Array.from({ length: floors }, (_, i) => i + 1).map((f) => (
              <button key={f} style={chip(floor === f)} onClick={() => setFloor(f)}>
                {f}F까지
              </button>
            ))}
            <button style={chip(floor === null)} onClick={() => setFloor(null)}>
              전체
            </button>
            <button style={chip(false)} onClick={() => setFocused(null)}>
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [x] **Step 4: 타입·린트·테스트**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 에러 0, 테스트 모두 통과

- [x] **Step 5: 브라우저로 확인**

Run: `npm run dev -w @4this/web` 후 http://localhost:5173/?dev=campus
Expected:
- 공학관(분홍, 3층)·연구동(하늘색, 2층)이 옥상 난간과 이름표("공학관", "연구동")를 달고 서 있다. 본관·카페는 아직 반투명 상자.
- 카메라(남동쪽)를 보는 남·동쪽 벽은 거의 투명하고 분홍/하늘 테두리선만 남는다. 드래그로 카메라를 돌리면 0.25초에 걸쳐 다른 벽이 흐려지고 아까 벽은 돌아온다.
- 공학관 1층 서쪽 벽에 문과 차양, 연구동 1층 남쪽 벽에 문. 계단이 계단참 옆에 있다.
- 공학관을 누르면 바닥 둘레에 분홍 띠가 깜빡이고 이름표가 커지며, 패널에 층 버튼이 생긴다. "1F까지"를 누르면 2·3층과 옥상이 사라지고 1층 강의실이 보인다.

- [x] **Step 6: Playwright 스크린샷 (PR에 첨부, 커밋하지 않음)**

```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus" buildings-overview.png
```
```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus&building=eng&floor=1&cam=34,14,16&target=16,1,-2" eng-1f.png
```
```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus&building=lab&floor=2&cam=-2,14,2&target=-15,3,-15" lab-2f.png
```

Expected:
- `eng-1f.png`: 북쪽 벽 초록 칠판·교탁·"1학년" 표지판, 의자 6개가 모두 칠판(북쪽)을 보고, 책상 위 노트북·모니터 화면이 의자 쪽을 본다.
- `lab-2f.png`: 가운데 큰 테이블 둘레 의자 6개와 노트북 6대, 동쪽에 책장 파티션 너머 교수님 책상(모니터가 서쪽 = 의자 쪽), 남쪽 벽 책장 2개, 1층은 어두운 로비.

- [x] **Step 7: 커밋**

```bash
git add apps/web/src/world/campus apps/web/src/dev/campus
git commit -m "feat: 공학관·연구동 실내 가구와 캠퍼스 연결"
```

---

### Task 6: 전체 검사와 PR

- [x] **Step 1: 전체 검사**

Run: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
Expected: 모두 통과. web 53개(hm#1까지 28 + cutaway 6 + buildingGeometry 12 + furniture 7; 다른 PR이 먼저 머지됐으면 더 많다).

- [x] **Step 2: push와 PR**

```bash
git push origin hm
gh pr create --base main --head hm --title "[hm#2] 건물 시스템 + 공학관·연구동" --body-file .github/pull_request_template.md
```

PR 본문에 스크린샷 3장, "`hiddenAboveFloor`는 포커스된 건물에만 적용", "의자 앉는 면 0.45 m", "좌석 좌표는 바꾸지 않음"을 적는다. 리뷰어: cw(건물 클릭·층 숨김을 sim/카메라에서 씀), th(의자 높이). 머지는 **Create a merge commit**.

- [x] **Step 3: 머지 후 알림**

단톡방에 "hm#2 머지됨 — 공학관·연구동이 건물로 바뀌었고 컷어웨이·층 숨김이 됩니다" 를 알린다.

---

## Self-Review

- 스펙 §5.3: 바닥판·벽·창문·문·계단 코드 조립, 층 높이 3.2 m, 지붕 없이 옥상 난간 → Task 2·4. 컷어웨이(내적 > 0.3, 0.1까지 0.25초, 테두리선) → Task 1·4. 건물 클릭·층 숨김 → Task 4·5(카메라 이동·"지금 이 건물에 있는 사람" 목록은 cw#3·th#4 몫, `onBuildingClick`·`focusedBuilding`·`hiddenAboveFloor`로 연결).
- 스펙 §5.2: 공학관 1~3F 칠판·교탁·2열×3줄 책상·자리마다 노트북 또는 PC·"n학년" 표지판, 연구동 2F 큰 사각 테이블+노트북 6대·책장 파티션·교수님 책상, 1F 불 꺼진 로비 → Task 5. 넘침 자리(뒤쪽·책장 옆 스탠딩)는 비워 둔다.
- 가구는 좌석에서 계산(좌석 = 의자, 테이블 = 좌석 묶음 가운데) → Task 3 테스트. 좌표 데이터는 바꾸지 않았다.
- 플레이스홀더 없음. 코드 블록은 임시 프로젝트에서 검사를 통과한 파일 그대로다.
- 이름·타입: `Campus(props: CampusProps)`, `BuildingId`, `FLOOR_HEIGHT`, `Seat`는 cw#1 계약 그대로. hm#1의 `Model`·`ModelItem`·`doorPoint`·`WALL_NORMALS`를 그대로 쓴다.
