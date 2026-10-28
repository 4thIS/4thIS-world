# [hm#3] 본관·카페 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**담당:** 박효민 · 브랜치 `hm` · 웨이브 3 · 선행 hm#2

**Goal:** hm#2의 건물 모듈(조립·컷어웨이·층 숨김·클릭)로 본관 3층(1F 식당: 배식대·4인 테이블 4개·식판, 2F 교양강의실: 칠판·12자리, 3F 도서관: 키 큰 책장·열람 테이블·스탠드)과 카페 1층(카운터·커피머신·스툴·2인 테이블 4개)과 바깥 테라스(넘침 자리에 테이블·파라솔)를 만들어, 네 건물이 모두 같은 모듈을 쓰게 한다. 임시 `BuildingBoxes`는 지운다.

**Architecture:** 가구는 hm#2와 같이 `CAMPUS.places[*].seats`에서 계산한다. 식당·도서관은 좌석을 데이터 순서대로 4개씩(`chunk`), 카페는 2개씩 묶어 `tableBetween`으로 테이블을 만들고, 테라스는 넘침 자리 중 같은 x에서 마주 보는 두 자리를 짝지어(`facingPairs`) 테이블·파라솔을 둔다. 카페 서쪽 벽을 카운터에 쓰기 위해 카페 좌석과 식당 배식대 줄 좌표를 `data.ts`에서 다듬고, 테라스 데크 자리(`TERRACE`)는 풀·덤불이 피하게 한다. 배식대·식판·파라솔은 코드로 만든다.

**Tech Stack:** React 19.3 · three 0.186 · @react-three/fiber 9 · @react-three/drei 10 · vitest 5 · Kenney Furniture Kit 2.0 (CC0)

> **팀장 메모 (2026-10-27, 박찬우):** Task 1 앞에 **Task 0**(옥상 반투명)을 추가했다. PR #18 리뷰에서 공학관 옥상 바닥판이 불투명해 기본 화면에서 3층 강의실이 안 보였다. 층 보기는 "전체" 그대로 두고, 옥상(바닥판+난간)을 반투명하게 해서 위에서 맨 위층 실내가 보이게 한다. 본관·카페도 같은 `Building`을 쓰므로 이 Task 하나로 네 건물에 모두 적용된다.

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
  - 좌표 조정(`data.ts`, 구조 그대로): `main-1f` 넘침(배식대 줄) z −18 → **−17.4**(배식대 앞면이 −18.05라 겹침), `cafe` 좌석 테이블 중심 x −18/−15 → **−16.6/−14**(서쪽 벽 카운터 자리). 건물 바닥 사각형·연못·노드는 바꾸지 않는다.
  - `cafe.overflow` 순서는 **앉는 테라스 4자리가 먼저, 그다음 스탠딩 2자리**(cw#2와 맞춘 순서). 테스트가 앞 4자리가 데크 안에 있는지 확인한다.
  - 의자 배율은 앉는 면 0.45 m 기준: `chair`(원본 0.24 → 1.875), `chairRounded`(원본 0.22 → 2.045). `stoolBar`는 앉는 자리가 아니라 장식이다.
  - 카페 테라스는 건물 밖이라 `Building`이 아니라 `CafeTerrace`(데크·테이블·파라솔·의자)로 `Campus`에 직접 둔다.

## File Structure

```
apps/web/public/assets/kenney/      (추가) chair·chairRounded·kitchenBar·kitchenCoffeeMachine·stoolBar·lampRoundTable (.glb)
CREDITS.md                          (수정) Kenney 파일 목록
packages/shared/src/campus/data.ts  (수정) main-1f 넘침 z, cafe 좌석 x
apps/web/src/world/campus/
├─ layout.ts / layout.test.ts       (수정) TERRACE·onTerrace, 테라스 자리 덤불 2개 제거, 풀이 데크를 피함
├─ furniture.ts / furniture.test.ts (수정) chunk, facingPairs
├─ assets.ts                        (수정) 의자·카운터·커피머신·스툴·스탠드
├─ CodeProps.tsx                    (수정) BoxInstances(식판·컵), ServingCounter(배식대), Parasol
├─ MainInterior.tsx                 본관 1F 식당 · 2F 교양강의실 · 3F 도서관
├─ CafeInterior.tsx                 카페 실내 + 바깥 테라스
├─ Campus.tsx                       (수정) 본관·카페도 Building, 테라스
└─ BuildingBoxes.tsx                (삭제)
```

---

### Task 0: (팀장 추가) 옥상을 반투명하게

**Files:**

- Modify: `apps/web/src/world/campus/Building.tsx`

옥상을 불투명도 0.25로 그린다. `CLICK_MIN_OPACITY`(0.3)보다 낮아서 옥상을 눌러도 클릭이 아래층 캐릭터·바닥으로 그대로 간다. 옥상이 그림자를 드리우면 맨 위층이 어두워지므로 `castShadow`는 뺀다.

- [x] **Step 1: 상수 추가** — `const CLICK_MIN_OPACITY = 0.3;` 바로 아래에 넣는다.

```tsx
/** 옥상(바닥판+난간)은 늘 반투명하게 둬서 위에서 맨 위층 실내가 보이게 한다. CLICK_MIN_OPACITY보다 낮아 클릭도 통과한다 */
const ROOF_OPACITY = 0.25;
```

- [x] **Step 2: 옥상 메시 바꾸기**

바꾸기 전:

```tsx
      <mesh geometry={shell.roof} visible={hiddenAboveFloor === null} castShadow receiveShadow>
        <meshStandardMaterial color={style.trim} roughness={0.85} />
      </mesh>
```

바꾼 뒤:

```tsx
      {/* 그림자를 드리우면 맨 위층이 어두워지므로 옥상은 그림자를 만들지 않는다 */}
      <mesh geometry={shell.roof} visible={hiddenAboveFloor === null} receiveShadow>
        <meshStandardMaterial
          color={style.trim}
          roughness={0.85}
          transparent
          opacity={ROOF_OPACITY}
          depthWrite={false}
        />
      </mesh>
```

- [x] **Step 3: 확인**

Run: `npm run typecheck -w @4this/web && npx eslint apps/web/src/world/campus/Building.tsx`
Expected: 에러 0

Run: `npm run dev -w @4this/web` 후 http://localhost:5173/?dev=sim&at=10:30
Expected: 기본 카메라에서 공학관 옥상이 비쳐 3층 책상·노트북이 위에서 보인다. 연구동도 2층 실내가 위에서 보인다.

- [x] **Step 4: 커밋**

```bash
git add apps/web/src/world/campus/Building.tsx
git commit -m "feat: 옥상을 반투명하게 해서 위에서 맨 위층 실내가 보이게 하기"
```

---

### Task 1: 좌표 다듬기와 테라스 자리

**Files:**
- Modify: `packages/shared/src/campus/data.ts`, `apps/web/src/world/campus/layout.ts`
- Test: `apps/web/src/world/campus/layout.test.ts`

**Interfaces:**
- Consumes: `CAMPUS`, `pathSegments`, `lampSpots`, `BUSHES`, `TREES`, `TRASH_CANS` (hm#1)
- Produces: `TERRACE: { min: Vec2; max: Vec2 }` (`[-10.9, 11.4]`~`[-7.7, 14.1]`), `onTerrace(p, margin = 0): boolean`. `scatterGrass`가 데크(+0.1 m)를 피한다. `BUSHES`에서 `[-10.6, 8]`, `[-10.6, 12]` 제거(카페 넘침 자리와 겹침)

- [x] **Step 1: 브랜치 갱신**

```bash
git fetch origin && git checkout hm && git merge origin/main
```

- [x] **Step 2: 실패하는 테스트 작성**

`apps/web/src/world/campus/layout.test.ts` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/layout.test.ts
+++ b/apps/web/src/world/campus/layout.test.ts
@@ -15,6 +15,8 @@ import {
   scatterGrass,
   scatterInDisc,
   seededRandom,
+  onTerrace,
+  TERRACE,
   TRASH_CANS,
   TREES,
 } from './layout';
@@ -190,3 +192,29 @@ describe('꾸밈 배치', () => {
     }
   });
 });
+
+describe('카페 테라스', () => {
+  const overflow = CAMPUS.places.cafe.overflow;
+  const segs = pathSegments(CAMPUS);
+
+  it('테라스 4자리(overflow 앞 4개)는 데크 안에 있고 데크는 길과 겹치지 않는다', () => {
+    for (const s of overflow.slice(0, 4)) expect(onTerrace(s.pos)).toBe(true);
+    const corners: Vec2[] = [
+      TERRACE.min,
+      TERRACE.max,
+      [TERRACE.min[0], TERRACE.max[1]],
+      [TERRACE.max[0], TERRACE.min[1]],
+    ];
+    for (const c of corners) expect(onPath(c, segs)).toBe(false);
+  });
+
+  it('카페 넘침 자리 근처(0.8 m)에 덤불·나무·가로등이 없다', () => {
+    const lamps = lampSpots(segs, CAMPUS).map((l) => l.pos);
+    const things: Vec2[] = [...BUSHES, ...TREES.map((t) => t.pos), ...lamps, ...TRASH_CANS];
+    for (const s of overflow) {
+      for (const t of things) {
+        expect(Math.hypot(s.pos[0] - t[0], s.pos[1] - t[1])).toBeGreaterThan(0.8);
+      }
+    }
+  });
+});
```

- [x] **Step 3: 실패 확인**

Run: `npm test -w @4this/web`
Expected: FAIL — `onTerrace`·`TERRACE`가 없다(`does not provide an export named 'TERRACE'` 또는 `onTerrace is not a function`)

- [x] **Step 4: 구현**

`apps/web/src/world/campus/layout.ts` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/layout.ts
+++ b/apps/web/src/world/campus/layout.ts
@@ -142,6 +142,18 @@ export function pondCircle(c: Campus): { center: Vec2; r: number } {
   return { center: k.center, r: k.r };
 }
 
+/** 카페 테라스 데크 (카페 overflow 앞 4자리가 이 안에 있다). 풀은 여기를 피한다 */
+export const TERRACE: { min: Vec2; max: Vec2 } = { min: [-10.9, 11.4], max: [-7.7, 14.1] };
+
+export function onTerrace(p: Vec2, margin = 0): boolean {
+  return (
+    p[0] >= TERRACE.min[0] - margin &&
+    p[0] <= TERRACE.max[0] + margin &&
+    p[1] >= TERRACE.min[1] - margin &&
+    p[1] <= TERRACE.max[1] + margin
+  );
+}
+
 /** 둥근 사각형 판 안인지 (inset만큼 안쪽으로) */
 export function onBoard(p: Vec2, inset = 0): boolean {
   const h = BOARD_HALF - inset;
@@ -241,7 +253,13 @@ export function scatterGrass(
       shade: rand(),
     };
     const p: Vec2 = [x, z];
-    if (!onBoard(p, 0.8) || onPath(p, segs, 0.2) || inBuilding(p, c, 0.3) || inPond(p, c, 0.4)) {
+    if (
+      !onBoard(p, 0.8) ||
+      onPath(p, segs, 0.2) ||
+      inBuilding(p, c, 0.3) ||
+      inPond(p, c, 0.4) ||
+      onTerrace(p, 0.1)
+    ) {
       continue;
     }
     out.push(blade);
@@ -363,8 +381,6 @@ export const BUSHES: Vec2[] = [
   [10.9, 0.4],
   [-13.3, -10.5],
   [-16.7, -10.5],
-  [-10.6, 8],
-  [-10.6, 12],
 ];
 
 /** 쓰레기통 (KayKit trash_A) */
```

카페 서쪽 벽(x −19.8)을 카운터 자리로 비우고, 식당 배식대 앞 줄을 배식대 앞면(−18.05)에서 0.65 m 떨어뜨린다:

`packages/shared/src/campus/data.ts` (바뀐 부분):
```diff
--- a/packages/shared/src/campus/data.ts
+++ b/packages/shared/src/campus/data.ts
@@ -102,7 +102,8 @@ export const CAMPUS: Campus = {
       floor: 1,
       landing: MAIN_LANDING,
       seats: [-5.5, -2, 1.5, 5].flatMap((cx) => table4(cx, -15)),
-      overflow: [-6, -4.8, -3.6, -2.4, -1.2, 0].map((x) => seat(x, -18, S)),
+      // 배식대(북쪽 벽) 앞 줄
+      overflow: [-6, -4.8, -3.6, -2.4, -1.2, 0].map((x) => seat(x, -17.4, S)),
     },
     'main-2f': {
       id: 'main-2f',
@@ -125,7 +126,13 @@ export const CAMPUS: Campus = {
       building: 'cafe',
       floor: 1,
       landing: [-13, 10],
-      seats: [...table2(-18, 8.6), ...table2(-15, 8.6), ...table2(-18, 11.4), ...table2(-15, 11.4)],
+      // 서쪽 벽은 카운터 자리라 테이블을 동쪽으로 붙인다
+      seats: [
+        ...table2(-16.6, 8.6),
+        ...table2(-14, 8.6),
+        ...table2(-16.6, 11.4),
+        ...table2(-14, 11.4),
+      ],
       // 테라스(바깥) 4자리 + 스탠딩 2자리
       overflow: [
         seat(-10, 12, N),
```

- [x] **Step 5: 통과 확인**

Run: `npm test -w @4this/web && npm test -w @4this/shared`
Expected: PASS — layout 18개, shared 24개(`validateCampus` 그대로 통과, 좌석이 모두 건물 안)

- [x] **Step 6: 커밋**

```bash
git add packages/shared/src/campus/data.ts apps/web/src/world/campus/layout.ts apps/web/src/world/campus/layout.test.ts
git commit -m "feat: 식당 줄·카페 좌석 좌표 조정과 카페 테라스 자리"
```

---

### Task 2: 좌석 묶기 (4인·2인 테이블, 마주 보는 테라스 자리)

**Files:**
- Modify: `apps/web/src/world/campus/furniture.ts`
- Test: `apps/web/src/world/campus/furniture.test.ts`

**Interfaces:**
- Produces: `chunk<T>(items: readonly T[], n: number): T[][]`, `facingPairs(seats: readonly Seat[]): Seat[][]` (남쪽을 보는 자리 + 같은 x의 북쪽을 보는 자리)

- [x] **Step 1: 실패하는 테스트 작성**

`apps/web/src/world/campus/furniture.test.ts` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/furniture.test.ts
+++ b/apps/web/src/world/campus/furniture.test.ts
@@ -1,6 +1,15 @@
 import { describe, expect, it } from 'vitest';
 import { CAMPUS, type Seat } from '@4this/shared';
-import { ahead, centroid, classroomFurniture, DESK_TOP, forward, tableBetween } from './furniture';
+import {
+  ahead,
+  centroid,
+  chunk,
+  classroomFurniture,
+  DESK_TOP,
+  facingPairs,
+  forward,
+  tableBetween,
+} from './furniture';
 
 const N = 0;
 const S = Math.PI;
@@ -81,3 +90,30 @@ describe('centroid / tableBetween', () => {
     expect(t.size[1]).toBeCloseTo(0.8);
   });
 });
+
+describe('chunk', () => {
+  it('식당 16자리는 4인 테이블 4개, 가운데가 데이터의 테이블 중심', () => {
+    const tables = chunk(CAMPUS.places['main-1f'].seats, 4).map((g) => tableBetween(g));
+    expect(tables.map((t) => t.center)).toEqual([
+      [-5.5, -15],
+      [-2, -15],
+      [1.5, -15],
+      [5, -15],
+    ]);
+  });
+
+  it('카페 8자리는 2인 테이블 4개', () => {
+    expect(chunk(CAMPUS.places.cafe.seats, 2)).toHaveLength(4);
+  });
+});
+
+describe('facingPairs', () => {
+  it('카페 테라스 4자리 → 2인 테이블 2개 (같은 x, 마주 봄)', () => {
+    const pairs = facingPairs(CAMPUS.places.cafe.overflow);
+    expect(pairs).toHaveLength(2);
+    for (const [a, b] of pairs) {
+      expect(a!.pos[0]).toBe(b!.pos[0]);
+      expect(b!.pos[1]).toBeGreaterThan(a!.pos[1]);
+    }
+  });
+});
```

- [x] **Step 2: 실패 확인**

Run: `npm test -w @4this/web`
Expected: FAIL — `chunk is not a function` / `facingPairs is not a function`

- [x] **Step 3: 구현**

`apps/web/src/world/campus/furniture.ts` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/furniture.ts
+++ b/apps/web/src/world/campus/furniture.ts
@@ -97,3 +97,32 @@ export function classroomFurniture(seats: readonly Seat[], y: number): Classroom
   });
   return out;
 }
+
+/** 좌석을 n개씩 묶는다 (table4 → 4개, table2 → 2개씩 데이터 순서대로) */
+export function chunk<T>(items: readonly T[], n: number): T[][] {
+  const out: T[][] = [];
+  for (let i = 0; i < items.length; i += n) out.push(items.slice(i, i + n));
+  return out;
+}
+
+/** 같은 x에서 마주 보는 두 자리(남쪽을 보는 자리 + 북쪽을 보는 자리)를 한 테이블로 묶는다 */
+export function facingPairs(seats: readonly Seat[]): Seat[][] {
+  const used = new Set<number>();
+  const out: Seat[][] = [];
+  seats.forEach((a, i) => {
+    if (used.has(i) || Math.cos(a.facing) < 0.5) return;
+    const j = seats.findIndex(
+      (b, k) =>
+        !used.has(k) &&
+        k !== i &&
+        Math.cos(b.facing) < -0.5 &&
+        Math.abs(b.pos[0] - a.pos[0]) < 0.1 &&
+        b.pos[1] > a.pos[1],
+    );
+    if (j < 0) return;
+    used.add(i);
+    used.add(j);
+    out.push([a, seats[j]!]);
+  });
+  return out;
+}
```

- [x] **Step 4: 통과 확인**

Run: `npm test -w @4this/web`
Expected: PASS — furniture 10개

- [x] **Step 5: 커밋**

```bash
git add apps/web/src/world/campus/furniture.ts apps/web/src/world/campus/furniture.test.ts
git commit -m "feat: 좌석을 테이블 단위로 묶는 함수"
```

---

### Task 3: 에셋 추가와 코드 소품 (식판·배식대·파라솔)

**Files:**
- Create: `apps/web/public/assets/kenney/*.glb` (6개)
- Modify: `apps/web/src/world/campus/assets.ts`, `CREDITS.md`, `apps/web/src/world/campus/CodeProps.tsx`

**Interfaces:**
- Produces:
  - `MODELS`에 `chair`, `chairRounded`(앉는 면 0.45 m), `kitchenBar`, `kitchenCoffeeMachine`, `stoolBar`, `lampRoundTable`
  - `<BoxInstances items size color />`(같은 상자 여러 개, InstancedMesh 1개), `<ServingCounter pos rotY length />`, `<Parasol pos color? />`

- [x] **Step 1: Kenney 파일 추가 (새 빈 폴더에)**

> **팀장 메모 (2026-10-28):** Kenney 사이트가 고정 zip 링크를 막아(403, 브라우저에서도 "Download link expired or invalid") 아래 `curl`이 실패한다. 6개 파일은 팀장이 같은 원본(Furniture Kit 2.0, 10/21 다운로드)에서 꺼내 **main에 올려 두었다**. `git fetch origin && git merge origin/main` 뒤 아래 `ls` 줄로 17개인지만 확인하고 Step 2로 넘어간다.

hm#2와 같은 zip이다. 다시 받아서 새 빈 폴더에 푼다.

```bash
DL=$(mktemp -d)
curl -fsSL -o "$DL/kenney_furniture-kit.zip" https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip
mkdir "$DL/x" && unzip -q "$DL/kenney_furniture-kit.zip" -d "$DL/x"
for f in chair chairRounded kitchenBar kitchenCoffeeMachine stoolBar lampRoundTable; do
  cp "$DL/x/Models/GLTF format/$f.glb" apps/web/public/assets/kenney/
done
ls apps/web/public/assets/kenney | wc -l    # 17
```

- [x] **Step 2: 모델 목록·출처**

`apps/web/src/world/campus/assets.ts` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/assets.ts
+++ b/apps/web/src/world/campus/assets.ts
@@ -73,6 +73,12 @@ export const MODELS = {
   pottedPlant: kenney('pottedPlant', [0.42, 1.31, 0.48]),
   plantSmall: kenney('plantSmall1', [0.19, 0.28, 0.19]),
   trashcan: kenney('trashcan', [0.42, 0.86, 0.47]),
+  chair: kenneyChair('chair', 0.24, [0.2, 0.47, 0.2]),
+  chairRounded: kenneyChair('chairRounded', 0.22, [0.2, 0.455, 0.2]),
+  kitchenBar: kenney('kitchenBar', [0.86, 0.84, 0.42]),
+  kitchenCoffeeMachine: kenney('kitchenCoffeeMachine', [0.38, 0.35, 0.48]),
+  stoolBar: kenney('stoolBar', [0.53, 0.87, 0.46]),
+  lampRoundTable: kenney('lampRoundTable', [0.3, 0.63, 0.35]),
 } satisfies Record<string, ModelSpec>;
 
 export type ModelName = keyof typeof MODELS;
```

`CREDITS.md` (바뀐 부분):
```diff
--- a/CREDITS.md
+++ b/CREDITS.md
@@ -3,10 +3,10 @@
 4thIS-world의 3D 소품은 아래 CC0(퍼블릭 도메인) 에셋을 쓴다. 출처 표기는 의무가 아니지만 감사의 뜻으로 남긴다.
 원본 색은 불러올 때 파스텔로 바꾼다(`apps/web/src/world/campus/pastel.ts`). 파일 자체는 고치지 않았다.
 
-| 팩                           | 만든 사람                          | 라이선스 | 받은 곳                                                                                                                                                              | 쓰는 파일 (`apps/web/public/assets/`)                                                                                                                                                                                                              |
-| ---------------------------- | ---------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
-| KayKit City Builder Bits 1.0 | Kay Lousberg (www.kaylousberg.com) | CC0 1.0  | https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0 (커밋 `63976910ca04d16f0fc531b9c614244be8128713`, `addons/kaykit_city_builder_bits/Assets/gltf/`) | `kaykit/bench`, `kaykit/streetlight`, `kaykit/bush`, `kaykit/trash_A` (`.gltf` + `.bin`), `kaykit/citybits_texture.png`                                                                                                                            |
-| Kenney Furniture Kit 2.0     | Kenney (www.kenney.nl)             | CC0 1.0  | https://kenney.nl/assets/furniture-kit (`kenney_furniture-kit.zip`의 `Models/GLTF format/`)                                                                          | `kenney/desk`, `kenney/chairDesk`, `kenney/laptop`, `kenney/computerScreen`, `kenney/computerKeyboard`, `kenney/bookcaseOpen`, `kenney/bookcaseClosedWide`, `kenney/books`, `kenney/pottedPlant`, `kenney/plantSmall1`, `kenney/trashcan` (`.glb`) |
+| 팩                           | 만든 사람                          | 라이선스 | 받은 곳                                                                                                                                                              | 쓰는 파일 (`apps/web/public/assets/`)                                                                                                                                                                                                                                                                                                                                                     |
+| ---------------------------- | ---------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
+| KayKit City Builder Bits 1.0 | Kay Lousberg (www.kaylousberg.com) | CC0 1.0  | https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0 (커밋 `63976910ca04d16f0fc531b9c614244be8128713`, `addons/kaykit_city_builder_bits/Assets/gltf/`) | `kaykit/bench`, `kaykit/streetlight`, `kaykit/bush`, `kaykit/trash_A` (`.gltf` + `.bin`), `kaykit/citybits_texture.png`                                                                                                                                                                                                                                                                   |
+| Kenney Furniture Kit 2.0     | Kenney (www.kenney.nl)             | CC0 1.0  | https://kenney.nl/assets/furniture-kit (`kenney_furniture-kit.zip`의 `Models/GLTF format/`)                                                                          | `kenney/desk`, `kenney/chairDesk`, `kenney/laptop`, `kenney/computerScreen`, `kenney/computerKeyboard`, `kenney/bookcaseOpen`, `kenney/bookcaseClosedWide`, `kenney/books`, `kenney/pottedPlant`, `kenney/plantSmall1`, `kenney/trashcan`, `kenney/chair`, `kenney/chairRounded`, `kenney/kitchenBar`, `kenney/kitchenCoffeeMachine`, `kenney/stoolBar`, `kenney/lampRoundTable` (`.glb`) |
 
 나머지(지형·길·풀·나무·꽃·연못·정문·게시판·건물·칠판·교탁·배식대)는 코드로 만든다.
 
```

Run: `npm test -w @4this/web -- assets`
Expected: PASS — assets 2개(새 의자 2개도 앉는 면 0.45 m)

- [x] **Step 3: 코드 소품**

`apps/web/src/world/campus/CodeProps.tsx` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/CodeProps.tsx
+++ b/apps/web/src/world/campus/CodeProps.tsx
@@ -1,9 +1,11 @@
-import { useEffect, useMemo } from 'react';
+import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
+import { BoxGeometry, DoubleSide, type InstancedMesh } from 'three';
 import type { Vec2 } from '@4this/shared';
 import { TABLE_TOP } from './furniture';
+import { itemMatrix, type ModelItem } from './models';
 import { labelTexture } from './signTexture';
 
-/** 두 팩에 없는 가구는 코드로 만든다: 칠판·교탁·층 표지판·큰 테이블 */
+/** 두 팩에 없는 가구는 코드로 만든다: 칠판·교탁·층 표지판·테이블·배식대·식판·파라솔 */
 
 interface Placed {
   /** 바닥 위 자리 (x, y, z). y는 바닥 높이 */
@@ -119,3 +121,95 @@ export function Table({
     </group>
   );
 }
+
+/** 같은 상자를 여러 자리에 (식판·책 더미 등). pos의 y는 상자 바닥 */
+export function BoxInstances({
+  items,
+  size,
+  color,
+}: {
+  items: readonly ModelItem[];
+  size: readonly [number, number, number];
+  color: string;
+}) {
+  const geometry = useMemo(
+    () => new BoxGeometry(size[0], size[1], size[2]).translate(0, size[1] / 2, 0),
+    [size],
+  );
+  useEffect(() => () => geometry.dispose(), [geometry]);
+  const ref = useRef<InstancedMesh>(null);
+  useLayoutEffect(() => {
+    const mesh = ref.current;
+    if (!mesh) return;
+    items.forEach((item, i) => mesh.setMatrixAt(i, itemMatrix(item)));
+    mesh.instanceMatrix.needsUpdate = true;
+    mesh.computeBoundingSphere();
+  }, [items]);
+  return (
+    <instancedMesh
+      key={items.length}
+      ref={ref}
+      args={[geometry, undefined, items.length]}
+      castShadow
+      receiveShadow
+    >
+      <meshStandardMaterial color={color} roughness={0.8} />
+    </instancedMesh>
+  );
+}
+
+/** 식당 배식대: 하부장 + 윗판 + 유리 가림막 + 반찬통. 앞면(+z)이 줄 선 쪽 */
+export function ServingCounter({ pos, rotY, length }: Placed & { length: number }) {
+  const pots = Math.max(1, Math.floor(length / 0.9));
+  return (
+    <group position={pos} rotation-y={rotY}>
+      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
+        <boxGeometry args={[length, 0.9, 0.7]} />
+        <meshStandardMaterial color="#f6d7c3" roughness={0.85} />
+      </mesh>
+      <mesh position={[0, 0.92, 0]} castShadow>
+        <boxGeometry args={[length + 0.1, 0.05, 0.8]} />
+        <meshStandardMaterial color="#e9e4ef" roughness={0.4} />
+      </mesh>
+      <mesh position={[0, 1.25, 0.32]}>
+        <boxGeometry args={[length, 0.6, 0.02]} />
+        <meshStandardMaterial color="#d6ecfa" transparent opacity={0.4} roughness={0.2} />
+      </mesh>
+      {Array.from({ length: pots }, (_, i) => (
+        <mesh
+          key={i}
+          position={[-length / 2 + (length / pots) * (i + 0.5), 1.02, -0.05]}
+          castShadow
+        >
+          <cylinderGeometry args={[0.2, 0.18, 0.16, 16]} />
+          <meshStandardMaterial
+            color={['#ffd9c2', '#fff1a8', '#cdeedd', '#ffd6e2'][i % 4]}
+            roughness={0.6}
+          />
+        </mesh>
+      ))}
+    </group>
+  );
+}
+
+/** 테라스 파라솔: 기둥 + 원뿔 지붕 */
+export function Parasol({
+  pos,
+  color = '#ffb3c7',
+}: {
+  pos: readonly [number, number, number];
+  color?: string;
+}) {
+  return (
+    <group position={pos}>
+      <mesh position-y={1.2} castShadow>
+        <cylinderGeometry args={[0.04, 0.04, 2.4, 8]} />
+        <meshStandardMaterial color="#f4f0ea" roughness={0.7} />
+      </mesh>
+      <mesh position-y={2.3} castShadow>
+        <coneGeometry args={[0.72, 0.4, 12, 1, true]} />
+        <meshStandardMaterial color={color} roughness={0.8} side={DoubleSide} />
+      </mesh>
+    </group>
+  );
+}
```

- [x] **Step 4: 타입·린트 확인**

Run: `npm run typecheck -w @4this/web && npm run lint`
Expected: 에러 0

- [x] **Step 5: 커밋**

```bash
git add apps/web/public/assets/kenney CREDITS.md apps/web/src/world/campus/assets.ts apps/web/src/world/campus/CodeProps.tsx
git commit -m "feat: 식당·카페 가구 에셋과 배식대·식판·파라솔"
```

---

### Task 4: 본관 실내 (식당·교양강의실·도서관)

**Files:**
- Create: `apps/web/src/world/campus/MainInterior.tsx`

**Interfaces:**
- Consumes: `CAMPUS.places['main-1f' | 'main-2f' | 'main-3f']`, `chunk`, `tableBetween`, `chairAt`, `facingSeat`, `classroomFurniture`, `Table`, `Blackboard`, `Lectern`, `WallSign`, `ServingCounter`, `BoxInstances`, `<Model>`
- Produces: `<MainInterior floor />`
  - 1F: 북쪽 벽 배식대(x −6.5~0.5, 앞면 z −18.05), 4인 테이블 4개(`chunk(seats, 4)`), 의자 16(`chair`), 식판 16, "식당" 표지판
  - 2F: 칠판(폭 5.5)·교탁, 12자리 책상+`chairDesk`+노트북/PC, "교양강의실" 표지판
  - 3F: 서쪽 벽 `bookcaseOpen` 5개·동쪽 2개(사이사이가 넘침 스탠딩 [−7, −17.5]·[−7, −13]·[7, −17.5]), 북쪽 벽 `bookcaseClosedWide` 4개, 열람 테이블 2개 + `chairRounded` 8 + 책 8 + 스탠드 2, "도서관" 표지판

- [x] **Step 1: 구현**

`apps/web/src/world/campus/MainInterior.tsx`:
```tsx
import { useMemo } from 'react';
import { CAMPUS } from '@4this/shared';
import { floorY, SLAB_LIFT, WALL_T } from './buildingGeometry';
import { Blackboard, BoxInstances, Lectern, ServingCounter, Table, WallSign } from './CodeProps';
import {
  chairAt,
  chunk,
  classroomFurniture,
  facingSeat,
  TABLE_TOP,
  tableBetween,
} from './furniture';
import { Model, type ModelItem } from './models';

const b = CAMPUS.buildings.main;
/** 북쪽 벽 안쪽 면 */
const NORTH = b.min[1] + WALL_T;
const WEST = b.min[0] + WALL_T;
const EAST = b.max[0] - WALL_T;

/** 본관 1F 식당: 북쪽 배식대(앞에 줄 = overflow), 4인 테이블 4개, 자리마다 식판 */
function Cafeteria() {
  const place = CAMPUS.places['main-1f'];
  const y = floorY(1) + SLAB_LIFT;
  const tables = useMemo(() => chunk(place.seats, 4).map((g) => tableBetween(g)), [place]);
  const chairs = useMemo(() => place.seats.map((s) => chairAt(s, y)), [place, y]);
  const trays = useMemo(
    () => place.seats.map((s) => facingSeat(s, 0.42, y + TABLE_TOP)),
    [place, y],
  );
  return (
    <group>
      <ServingCounter pos={[-3, y, NORTH + 0.4]} rotY={0} length={7} />
      <WallSign pos={[4, y + 2.3, NORTH + 0.02]} rotY={0} text="식당" bg="#f3c98b" />
      {tables.map((t) => (
        <Table key={t.center.join(',')} center={t.center} size={t.size} y={y} />
      ))}
      <Model name="chair" items={chairs} />
      <BoxInstances items={trays} size={[0.42, 0.03, 0.3]} color="#eef0f6" />
      <Model
        name="pottedPlant"
        items={[
          { pos: [WEST + 0.5, y, b.max[1] - 0.7], rotY: 0 },
          { pos: [3, y, NORTH + 0.5], rotY: 0 },
        ]}
      />
      <Model name="trashcan" items={[{ pos: [1.6, y, NORTH + 0.4], rotY: 0 }]} />
    </group>
  );
}

/** 본관 2F 교양강의실: 큰 칠판, 12자리(책상+의자+노트북/PC), 교탁 */
function LectureHall() {
  const place = CAMPUS.places['main-2f'];
  const y = floorY(2) + SLAB_LIFT;
  const f = useMemo(() => classroomFurniture(place.seats, y), [place, y]);
  return (
    <group>
      <Blackboard pos={[0, y, NORTH + 0.03]} rotY={0} width={5.5} />
      <Lectern pos={[0, y, NORTH + 0.9]} rotY={0} />
      <WallSign
        pos={[-5.5, y + 2.35, NORTH + 0.02]}
        rotY={0}
        text="교양강의실"
        bg="#f3c98b"
        width={1.8}
      />
      <Model name="chairDesk" items={f.chairs} />
      <Model name="desk" items={f.desks} />
      <Model name="laptop" items={f.laptops} />
      <Model name="computerScreen" items={f.screens} />
      <Model name="computerKeyboard" items={f.keyboards} shadows={false} />
      <Model name="pottedPlant" items={[{ pos: [WEST + 0.5, y, NORTH + 0.5], rotY: 0 }]} />
    </group>
  );
}

/** 본관 3F 도서관: 벽을 따라 키 큰 책장(사이사이가 넘침 스탠딩), 열람 테이블 2개 + 스탠드 + 책 */
function Library() {
  const place = CAMPUS.places['main-3f'];
  const y = floorY(3) + SLAB_LIFT;
  const tables = useMemo(() => chunk(place.seats, 4).map((g) => tableBetween(g)), [place]);
  const chairs = useMemo(() => place.seats.map((s) => chairAt(s, y)), [place, y]);
  const books = useMemo(
    () => place.seats.map((s) => facingSeat(s, 0.45, y + TABLE_TOP)),
    [place, y],
  );
  const lamps = useMemo<ModelItem[]>(
    () => tables.map((t) => ({ pos: [t.center[0], y + TABLE_TOP, t.center[1]], rotY: 0 })),
    [tables, y],
  );
  // 서쪽 벽 책장 (앞면 +x), 동쪽 벽 책장 (앞면 -x), 북쪽 벽 넓은 책장 (앞면 +z)
  const shelves = useMemo<ModelItem[]>(
    () => [
      ...[-18.2, -16.4, -15.6, -14, -12.2].map((z): ModelItem => ({
        pos: [WEST + 0.25, y, z],
        rotY: Math.PI / 2,
      })),
      ...[-18.2, -16.6].map((z): ModelItem => ({ pos: [EAST - 0.25, y, z], rotY: -Math.PI / 2 })),
    ],
    [y],
  );
  const wide = useMemo<ModelItem[]>(
    () => [-4.8, -1.6, 1.6, 4.8].map((x) => ({ pos: [x, y, NORTH + 0.25], rotY: 0 })),
    [y],
  );
  return (
    <group>
      <WallSign pos={[0, y + 2.45, NORTH + 0.02]} rotY={0} text="도서관" bg="#f3c98b" />
      {tables.map((t) => (
        <Table key={t.center.join(',')} center={t.center} size={t.size} y={y} color="#e9d3bb" />
      ))}
      <Model name="chairRounded" items={chairs} />
      <Model name="books" items={books} />
      <Model name="lampRoundTable" items={lamps} />
      <Model name="bookcaseOpen" items={shelves} />
      <Model name="bookcaseClosedWide" items={wide} />
    </group>
  );
}

export function MainInterior({ floor }: { floor: number }) {
  if (floor === 1) return <Cafeteria />;
  if (floor === 2) return <LectureHall />;
  return <Library />;
}
```

- [x] **Step 2: 타입·린트 확인**

Run: `npm run typecheck -w @4this/web && npm run lint`
Expected: 에러 0

- [x] **Step 3: 커밋**

```bash
git add apps/web/src/world/campus/MainInterior.tsx
git commit -m "feat: 본관 식당·교양강의실·도서관 가구"
```

---

### Task 5: 카페(실내·테라스)와 캠퍼스 연결

**Files:**
- Create: `apps/web/src/world/campus/CafeInterior.tsx`
- Modify: `apps/web/src/world/campus/Campus.tsx`
- Delete: `apps/web/src/world/campus/BuildingBoxes.tsx`

**Interfaces:**
- Produces: `<CafeInterior />`(서쪽 카운터 `kitchenBar` 5개 + 커피머신 + 스툴 3, 2인 테이블 4 + `chairRounded` 8 + 컵 8), `<CafeTerrace />`(데크 `TERRACE`, `facingPairs(cafe.overflow)` 테이블 2 + 파라솔 2 + 의자 4). `Campus`는 네 건물 모두 `<Building>`

- [x] **Step 1: 카페**

`apps/web/src/world/campus/CafeInterior.tsx`:
```tsx
import { useMemo } from 'react';
import { CAMPUS } from '@4this/shared';
import { floorY, SLAB_LIFT, WALL_T } from './buildingGeometry';
import { BoxInstances, Parasol, Table } from './CodeProps';
import {
  centroid,
  chairAt,
  chunk,
  facingPairs,
  facingSeat,
  TABLE_TOP,
  tableBetween,
} from './furniture';
import { TERRACE } from './layout';
import { Model, type ModelItem } from './models';

const b = CAMPUS.buildings.cafe;
/** 카운터 가운데 x (서쪽 벽에서 바리스타 설 자리만큼 띄움) */
const COUNTER_X = b.min[0] + WALL_T + 0.9;
const COUNTER_Z = [8.0, 8.86, 9.72, 10.58, 11.44];

/** 카페 1층: 서쪽 카운터(kitchenBar)·커피머신·스툴, 2인 테이블 4개, 자리마다 컵 */
export function CafeInterior() {
  const place = CAMPUS.places.cafe;
  const y = floorY(1) + SLAB_LIFT;
  const tables = useMemo(() => chunk(place.seats, 2).map((g) => tableBetween(g)), [place]);
  const chairs = useMemo(() => place.seats.map((s) => chairAt(s, y)), [place, y]);
  const cups = useMemo(
    () => place.seats.map((s) => facingSeat(s, 0.35, y + TABLE_TOP)),
    [place, y],
  );
  const counter = useMemo<ModelItem[]>(
    () => COUNTER_Z.map((z) => ({ pos: [COUNTER_X, y, z], rotY: Math.PI / 2 })),
    [y],
  );
  const stools = useMemo<ModelItem[]>(
    () => [8.4, 9.7, 11].map((z) => ({ pos: [COUNTER_X + 0.8, y, z], rotY: -Math.PI / 2 })),
    [y],
  );
  return (
    <group>
      {tables.map((t) => (
        <Table key={t.center.join(',')} center={t.center} size={t.size} y={y} color="#f6e1cc" />
      ))}
      <Model name="chairRounded" items={chairs} />
      <BoxInstances items={cups} size={[0.1, 0.12, 0.1]} color="#ffffff" />
      <Model name="kitchenBar" items={counter} />
      <Model
        name="kitchenCoffeeMachine"
        items={[{ pos: [COUNTER_X - 0.05, y + 0.84, COUNTER_Z[0]!], rotY: -Math.PI / 2 }]}
      />
      <Model name="stoolBar" items={stools} />
      <Model name="pottedPlant" items={[{ pos: [b.max[0] - 0.6, y, b.min[1] + 0.6], rotY: 0 }]} />
    </group>
  );
}

/** 카페 바깥 테라스: 데크 + overflow 앞 4자리에 2인 테이블·의자·파라솔 */
export function CafeTerrace() {
  const pairs = useMemo(() => facingPairs(CAMPUS.places.cafe.overflow), []);
  const chairs = useMemo(() => pairs.flat().map((s) => chairAt(s, 0.1)), [pairs]);
  const w = TERRACE.max[0] - TERRACE.min[0];
  const d = TERRACE.max[1] - TERRACE.min[1];
  return (
    <group>
      <mesh
        position={[TERRACE.min[0] + w / 2, 0.05, TERRACE.min[1] + d / 2]}
        receiveShadow
        castShadow
      >
        <boxGeometry args={[w, 0.1, d]} />
        <meshStandardMaterial color="#ecd2b8" roughness={0.9} />
      </mesh>
      {pairs.map((pair) => {
        const t = tableBetween(pair);
        const c = centroid(pair);
        return (
          <group key={c.join(',')}>
            <Table center={t.center} size={t.size} y={0.1} color="#f6e1cc" />
            <Parasol pos={[c[0], 0.1, c[1]]} />
          </group>
        );
      })}
      <Model name="chairRounded" items={chairs} />
    </group>
  );
}
```

- [x] **Step 2: Campus 연결과 임시 상자 삭제**

```bash
git rm apps/web/src/world/campus/BuildingBoxes.tsx
```

`apps/web/src/world/campus/Campus.tsx` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/Campus.tsx
+++ b/apps/web/src/world/campus/Campus.tsx
@@ -1,7 +1,7 @@
 import type { BuildingId } from '@4this/shared';
 import type { CampusProps } from '../contracts';
 import { Building } from './Building';
-import { BuildingBoxes } from './BuildingBoxes';
+import { CafeInterior, CafeTerrace } from './CafeInterior';
 import { EngInterior } from './EngInterior';
 import { Flowers } from './Flowers';
 import { Gate } from './Gate';
@@ -9,6 +9,7 @@ import { Grass } from './Grass';
 import { Ground } from './Ground';
 import { LabInterior } from './LabInterior';
 import { Lights } from './Lights';
+import { MainInterior } from './MainInterior';
 import { NoticeBoard } from './NoticeBoard';
 import { OutdoorProps } from './OutdoorProps';
 import { Paths } from './Paths';
@@ -46,11 +47,21 @@ export function Campus({ focusedBuilding, hiddenAboveFloor, onBuildingClick }: C
         interior={(floor) => <LabInterior floor={floor} />}
         floorColors={{ 1: '#a59cb4' }}
       />
-      <BuildingBoxes
-        ids={['main', 'cafe']}
-        focusedBuilding={focusedBuilding}
-        onBuildingClick={onBuildingClick}
+      <Building
+        id="main"
+        hiddenAboveFloor={hidden('main')}
+        focused={focusedBuilding === 'main'}
+        onClick={onBuildingClick}
+        interior={(floor) => <MainInterior floor={floor} />}
+      />
+      <Building
+        id="cafe"
+        hiddenAboveFloor={hidden('cafe')}
+        focused={focusedBuilding === 'cafe'}
+        onClick={onBuildingClick}
+        interior={() => <CafeInterior />}
       />
+      <CafeTerrace />
     </group>
   );
 }
```

- [x] **Step 3: 타입·린트·테스트**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 에러 0, 테스트 모두 통과

- [x] **Step 4: 브라우저로 확인**

Run: `npm run dev -w @4this/web` 후 http://localhost:5173/?dev=campus
Expected:
- 본관(크림·주황 테두리 3층)과 카페(민트 1층)가 건물이 되었다. 반투명 상자가 더는 없다.
- 카페 동쪽 데크에 분홍 파라솔 2개와 테이블·의자. 데크 위에 풀이 삐져나오지 않는다.
- 본관을 누르고 "1F까지" → 배식대(반찬통·유리 가림막), 4인 테이블 4개에 식판, 의자 등받이가 테이블 반대쪽. "2F까지" → 칠판·교탁·책상 12개. "3F까지" → 벽을 따라 책장, 열람 테이블에 스탠드·책.
- 카페를 누르고 "1F까지" → 서쪽 카운터·커피머신·스툴, 2인 테이블 4개.

- [x] **Step 5: Playwright 스크린샷 (PR에 첨부, 커밋하지 않음)**

```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus" campus-all-buildings.png
```
```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus&building=main&floor=1&cam=10,16,4&target=0,1,-15" main-1f.png
```
```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus&building=main&floor=3&cam=10,20,2&target=0,6,-15" main-3f.png
```
```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus&building=cafe&floor=1&cam=-4,12,20&target=-14,0,10" cafe.png
```

- [x] **Step 6: 커밋**

```bash
git add apps/web/src/world/campus
git commit -m "feat: 카페 실내·테라스와 본관·카페 건물 연결"
```

---

### Task 6: 전체 검사와 PR

- [ ] **Step 1: 전체 검사**

Run: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
Expected: 모두 통과. web 58개(hm#2까지 53 + layout 2 + furniture 3), shared 24개.

- [ ] **Step 2: push와 PR**

```bash
git push origin hm
gh pr create --base main --head hm --title "[hm#3] 본관·카페" --body-file .github/pull_request_template.md
```

PR 본문에 스크린샷 4장과 **좌표 변경**(main-1f 넘침 z −17.4, cafe 테이블 x −16.6/−14, 건물 사각형·연못·노드는 그대로, cafe.overflow 순서 = 테라스 4 → 스탠딩 2)을 적는다. 리뷰어: cw(placement 좌석 좌표). 머지는 **Create a merge commit**.

- [ ] **Step 3: 머지 후 알림**

단톡방에 "hm#3 머지됨 — 본관·카페 완성, 식당 줄·카페 좌석 좌표가 조금 바뀌었어요" 를 알린다.

---

## Self-Review

- 스펙 §5.2: `main-1f` 배식대·4인 테이블 4개·식판(16석)·배식대 줄, `main-2f` 칠판·큰 강의실(12석)·뒤쪽 스탠딩, `main-3f` 책장·열람 테이블·스탠드(8석)·책장 사이 스탠딩, `cafe` 카운터·커피머신·2인 테이블 4개(8석) + 테라스 → Task 1·4·5. 모든 건물이 hm#2 모듈·컷어웨이를 쓴다 → Task 5.
- 가구는 좌석에서 계산(좌석 하나 = 의자 하나, 테이블 = 좌석 묶음 가운데) → Task 2 테스트. 테라스 테이블은 넘침 자리 위치에서 계산.
- `validateCampus`는 그대로 통과(좌석 수·건물 안). `types.ts`는 바꾸지 않았다.
- 플레이스홀더 없음. 코드·diff는 임시 프로젝트에서 검사를 통과한 그대로다.
- 이름·타입: hm#2의 `Building`·`Table`·`classroomFurniture`·`tableBetween`, hm#1의 `Model`·`TERRACE`와 같은 파일의 함수들을 그대로 쓴다.
