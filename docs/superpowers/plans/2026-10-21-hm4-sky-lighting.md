# [hm#4] 하늘·조명·성능 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**담당:** 박효민 · 브랜치 `hm` · 웨이브 4 · 선행 hm#3

**Goal:** 지금 한국 시각(`CampusProps.now`)에 따라 하늘색·안개·해 방향과 세기·반구광이 바뀌게 하고(06–09 복숭아 아침, 09–17 하늘색 낮, 17–19 분홍·보라 노을, 19–06 남색 밤, 경계 30분 보간), 밤에는 사람이 있는 층(`occupiedFloors`)의 창문이 켜지고 가로등이 켜지게 한다. `?dev=campus&perf=1`에 FPS 패널·드로우콜 표시·캐릭터 대신 캡슐 30개를 넣어 성능을 재고, 드로우콜·삼각형을 줄이고 그림자 범위를 판에 맞춘다.

**Architecture:** `skyAt(kstMinutes)`가 시각 → 하늘 팔레트(색·세기·`night` 0~1)·해 방향을 계산하는 순수 함수다(vitest). `Campus`는 `Math.floor(kstMinutes(now))`가 바뀔 때(1분마다)만 다시 계산해 `Lights`(배경·안개·반구광·해 하나)와 `LampGlow`(전구 + 바닥 빛 웅덩이 InstancedMesh, 점광원 없음), `Building`(층별 창유리 색·발광)에 넘긴다. 창 불빛 세기는 순수 함수 `windowGlow(night, lit)`, 층 목록은 `litFloorsOf(occupiedFloors, id)`. 성능은 실내 가구·코드 소품의 그림자를 끄고(그림자 패스 드로우콜이 절반 가까이 준다), 테이블을 인스턴싱하고, 보도블록·꽃 삼각형을 줄여서 맞춘다.

**Tech Stack:** React 19.3 · three 0.186 · @react-three/fiber 9 · @react-three/drei 10 (`Stats`) · vitest 5

> **팀장 메모 (2026-10-28, 박찬우):** Task 1 앞에 **Task 0**(테라스 데크 얇게)을 추가했다. PR #23 리뷰에서 박효민이 짚은 대로, 데크 두께가 0.1 m인데 placement는 바깥 캐릭터를 y = 0에 두어서 테라스에서 발·엉덩이가 0.1 m 묻힌다. 데크를 0.02 m로 줄이면 공용 데이터를 바꾸지 않고 해결된다. 테라스 의자 앉는 면도 0.55 → 0.47 m가 되어 캐릭터 앉는 높이(0.45)와 맞는다.

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
  - 시각은 `kstMinutes(now)`(shared `time.ts`)만 쓴다. cw#3은 `now`를 10초마다, `occupiedFloors`는 내용이 바뀔 때만 새 Set으로 넘긴다. 하늘은 분 단위로만 다시 계산하므로 10초 갱신이어도 렌더 비용이 없다.
  - 구간 경계(06:00, 09:00, 17:00, 19:00) 앞뒤 15분, 모두 30분에 걸쳐 선형으로 섞는다. 밤 정도 `night`는 밤 팔레트에서만 1이다(18:45부터 켜지기 시작해 19:15에 완전히 켜지고, 05:45부터 꺼지기 시작해 06:15에 꺼진다).
  - 그림자는 해(밤에는 달 방향) `directionalLight` 하나, 맵 2048², 범위 ±30 m(판 50×50). 가로등은 점광원 없이 발광 전구 + 가산 혼합 바닥 원으로 흉내 낸다.
  - 성능 목표(스펙 §5.6): 일반 노트북 브라우저에서 캐릭터 30명 기준 60 fps. 개발 페이지 기준으로 캡슐 30개 포함 **드로우콜 600 이하**(그림자 패스 포함), 삼각형 25만 이하.

## File Structure

```
apps/web/src/world/campus/
├─ sky.ts / sky.test.ts               skyAt·phaseAt·mixPalette·sunDirection·skyIcon (순수)
├─ nightLights.ts / nightLights.test.ts  litFloorsOf·windowGlow (순수)
├─ Lights.tsx                         (교체) sky를 받아 배경·안개·반구광·해 갱신
├─ LampGlow.tsx                       가로등 전구·빛 웅덩이
├─ layout.ts / layout.test.ts         (수정) LAMP_HEAD·lampHead
├─ Building.tsx                       (수정) night·litFloors → 층별 창 불빛
├─ Campus.tsx                         (수정) now → sky, occupiedFloors → 층 불빛
├─ CodeProps.tsx                      (수정) Table → Tables(인스턴싱), 실내 소품 그림자 끔
├─ models.tsx                         (수정) Model 그림자 기본값 false
├─ OutdoorProps.tsx                   (수정) 바깥 소품만 shadows
├─ Paths.tsx · Flowers.tsx            (수정) 삼각형 줄이기
└─ EngInterior.tsx · LabInterior.tsx · MainInterior.tsx · CafeInterior.tsx (수정) Tables·그림자
apps/web/src/dev/campus/
├─ PerfTools.tsx                      Stats + 드로우콜 표시 + 캡슐 30개
└─ CampusPreview.tsx                  (수정) time=·lit=·perf= 쿼리, 시각 버튼
```

---

### Task 0: (팀장 추가) 테라스 데크 얇게

**Files:**

- Modify: `apps/web/src/world/campus/CafeInterior.tsx`

- [x] **Step 1: 데크 두께를 상수로 빼고 0.02 m로**

`CafeTerrace` 위에 `DECK_H`를 두고, 데크·의자·테이블·파라솔 높이의 `0.1`을 모두 바꾼다.

```diff
@@ -57,20 +57,23 @@ export function CafeInterior() {
   );
 }
 
+/** 테라스 데크 두께. 캐릭터는 바깥 바닥(y = 0)에 서고 앉으므로 얇게 둬서 발이 묻히지 않게 한다 */
+const DECK_H = 0.02;
+
 /** 카페 바깥 테라스: 데크 + overflow 앞 4자리에 2인 테이블·의자·파라솔 */
 export function CafeTerrace() {
   const pairs = useMemo(() => facingPairs(CAMPUS.places.cafe.overflow), []);
-  const chairs = useMemo(() => pairs.flat().map((s) => chairAt(s, 0.1)), [pairs]);
+  const chairs = useMemo(() => pairs.flat().map((s) => chairAt(s, DECK_H)), [pairs]);
   const w = TERRACE.max[0] - TERRACE.min[0];
   const d = TERRACE.max[1] - TERRACE.min[1];
   return (
     <group>
       <mesh
-        position={[TERRACE.min[0] + w / 2, 0.05, TERRACE.min[1] + d / 2]}
+        position={[TERRACE.min[0] + w / 2, DECK_H / 2, TERRACE.min[1] + d / 2]}
         receiveShadow
         castShadow
       >
-        <boxGeometry args={[w, 0.1, d]} />
+        <boxGeometry args={[w, DECK_H, d]} />
         <meshStandardMaterial color="#ecd2b8" roughness={0.9} />
       </mesh>
       {pairs.map((pair) => {
@@ -78,8 +81,8 @@ export function CafeTerrace() {
         const c = centroid(pair);
         return (
           <group key={c.join(',')}>
-            <Table center={t.center} size={t.size} y={0.1} color="#f6e1cc" />
-            <Parasol pos={[c[0], 0.1, c[1]]} />
+            <Table center={t.center} size={t.size} y={DECK_H} color="#f6e1cc" />
+            <Parasol pos={[c[0], DECK_H, c[1]]} />
           </group>
         );
       })}
```

- [x] **Step 2: 확인**

Run: `npm run typecheck -w @4this/web && npx eslint apps/web/src/world/campus/CafeInterior.tsx && npm test -w @4this/web`
Expected: 에러 0, 테스트 통과(이 Task는 테스트 수를 바꾸지 않는다)

Run: `npm run dev -w @4this/web` 후 http://localhost:5173/?dev=campus&building=cafe&floor=1&cam=-4,12,20&target=-14,0,10
Expected: 테라스 데크가 바닥에 거의 붙어 보이고, 테이블·의자·파라솔이 데크 위에 떠 있거나 묻히지 않는다

- [x] **Step 3: 커밋**

```bash
git add apps/web/src/world/campus/CafeInterior.tsx
git commit -m "fix: 테라스 데크를 얇게 해서 캐릭터 발이 묻히지 않게 하기"
```

---

### Task 1: 시각 → 하늘 계산 (`skyAt`)

**Files:**
- Create: `apps/web/src/world/campus/sky.ts`
- Test: `apps/web/src/world/campus/sky.test.ts`

**Interfaces:**
- Consumes: `mixHex` (hm#1 `pastel.ts`)
- Produces: `type SkyPhase = 'morning' | 'day' | 'sunset' | 'night'`, `interface SkyPalette { background; fog; sunColor; sunIntensity; hemiSky; hemiGround; hemiIntensity; night }`, `SKY_PALETTES`, `BLEND_MIN = 30`, `phaseAt(min): SkyPhase`, `mixPalette(a, b, t)`, `interface Sky extends SkyPalette { sunDir: [x, y, z] }`, `sunDirection(min)`, `skyAt(min: number): Sky`, `skyIcon(min): string` ('🌅' '☀️' '🌇' '🌙' — cw가 상단 바 `skyIcon`에 쓸 수 있다)

- [x] **Step 1: 브랜치 갱신**

```bash
git fetch origin && git checkout hm && git merge origin/main
```

- [x] **Step 2: 실패하는 테스트 작성**

`apps/web/src/world/campus/sky.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { mixHex } from './pastel';
import { mixPalette, phaseAt, skyAt, skyIcon, SKY_PALETTES, sunDirection } from './sky';

const hm = (h: number, m = 0) => h * 60 + m;

describe('phaseAt', () => {
  it('06–09 아침, 09–17 낮, 17–19 노을, 19–06 밤', () => {
    expect(phaseAt(hm(7))).toBe('morning');
    expect(phaseAt(hm(12))).toBe('day');
    expect(phaseAt(hm(18))).toBe('sunset');
    expect(phaseAt(hm(23, 59))).toBe('night');
    expect(phaseAt(hm(3))).toBe('night');
  });
});

describe('skyAt', () => {
  it('구간 한가운데는 그 구간 색 그대로', () => {
    expect(skyAt(hm(12)).background).toBe(SKY_PALETTES.day.background);
    expect(skyAt(hm(7, 30)).background).toBe(SKY_PALETTES.morning.background);
    expect(skyAt(hm(18)).background).toBe(SKY_PALETTES.sunset.background);
    expect(skyAt(hm(3)).background).toBe(SKY_PALETTES.night.background);
  });

  it('경계 시각에는 앞뒤 구간을 반반 섞는다', () => {
    const s = skyAt(hm(9));
    expect(s.background).toBe(
      mixHex(SKY_PALETTES.morning.background, SKY_PALETTES.day.background, 0.5),
    );
    expect(s.sunIntensity).toBeCloseTo((1.7 + 2.1) / 2);
  });

  it('경계 앞뒤 15분(모두 30분)에 걸쳐 섞는다', () => {
    expect(skyAt(hm(18, 44)).night).toBe(0);
    expect(skyAt(hm(18, 50)).night).toBeCloseTo(1 / 6);
    expect(skyAt(hm(19, 15)).night).toBe(1);
    expect(skyAt(hm(5, 50)).night).toBeCloseTo(5 / 6);
    expect(skyAt(hm(6, 15)).night).toBe(0);
  });

  it('하루를 넘는 값도 0~24시로 감는다', () => {
    expect(skyAt(hm(36))).toEqual(skyAt(hm(12)));
    expect(skyAt(-60)).toEqual(skyAt(hm(23)));
  });

  it('빛은 항상 위에서 온다', () => {
    for (let m = 0; m < 1440; m += 10) expect(skyAt(m).sunDir[1]).toBeGreaterThan(0.2);
  });
});

describe('sunDirection', () => {
  it('아침에는 동쪽, 저녁에는 서쪽, 정오 무렵이 가장 높다', () => {
    expect(sunDirection(hm(7))[0]).toBeGreaterThan(0);
    expect(sunDirection(hm(18))[0]).toBeLessThan(0);
    expect(sunDirection(hm(12, 30))[1]).toBeGreaterThan(sunDirection(hm(7))[1]);
  });
});

describe('mixPalette / skyIcon', () => {
  it('t=0은 a, t=1은 b', () => {
    expect(mixPalette(SKY_PALETTES.day, SKY_PALETTES.night, 0)).toEqual(SKY_PALETTES.day);
    expect(mixPalette(SKY_PALETTES.day, SKY_PALETTES.night, 1)).toEqual(SKY_PALETTES.night);
  });

  it('구간별 아이콘', () => {
    expect([hm(7), hm(12), hm(18), hm(22)].map(skyIcon)).toEqual(['🌅', '☀️', '🌇', '🌙']);
  });
});
```

- [x] **Step 3: 실패 확인**

Run: `npm test -w @4this/web`
Expected: FAIL — `Failed to resolve import "./sky"`

- [x] **Step 4: 구현**

숫자 보간은 `x * (1 - t) + y * t`로 써야 t = 0·1에서 정확히 원래 값이 나온다(`x + (y - x) * t`는 부동소수 오차로 `toEqual`이 깨진다).

`apps/web/src/world/campus/sky.ts`:
```ts
import { mixHex } from './pastel';

/**
 * 실제 한국 시각에 따른 하늘·조명 (설계 문서 §5.5). 순수 함수.
 * 06–09 복숭아빛 아침 / 09–17 하늘색 낮 / 17–19 분홍·보라 노을 / 19–06 남색 밤.
 * 구간 경계 앞뒤 15분씩, 모두 30분에 걸쳐 섞는다.
 */

export type SkyPhase = 'morning' | 'day' | 'sunset' | 'night';

export interface SkyPalette {
  background: string;
  fog: string;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  /** 0(낮) ~ 1(밤): 창문 불빛·가로등 세기 */
  night: number;
}

export const SKY_PALETTES: Record<SkyPhase, SkyPalette> = {
  morning: {
    background: '#ffe3d3',
    fog: '#ffe3d3',
    sunColor: '#ffd9b8',
    sunIntensity: 1.7,
    hemiSky: '#fff0e6',
    hemiGround: '#d8e6c4',
    hemiIntensity: 1.15,
    night: 0,
  },
  day: {
    background: '#dff0fb',
    fog: '#e8f3fb',
    sunColor: '#fff3e6',
    sunIntensity: 2.1,
    hemiSky: '#fff6fb',
    hemiGround: '#c9e8c4',
    hemiIntensity: 1.3,
    night: 0,
  },
  sunset: {
    background: '#f4c4dc',
    fog: '#e6c3ea',
    sunColor: '#ffb3c7',
    sunIntensity: 1.4,
    hemiSky: '#f3d4ef',
    hemiGround: '#c9b8d8',
    hemiIntensity: 0.95,
    night: 0,
  },
  night: {
    background: '#2c3157',
    fog: '#2c3157',
    sunColor: '#aab8ff',
    sunIntensity: 0.45,
    hemiSky: '#5a6394',
    hemiGround: '#2d3350',
    hemiIntensity: 0.55,
    night: 1,
  },
};

/** 구간 경계 (분)와 앞뒤 구간 */
const BOUNDARIES: { at: number; from: SkyPhase; to: SkyPhase }[] = [
  { at: 6 * 60, from: 'night', to: 'morning' },
  { at: 9 * 60, from: 'morning', to: 'day' },
  { at: 17 * 60, from: 'day', to: 'sunset' },
  { at: 19 * 60, from: 'sunset', to: 'night' },
];
export const BLEND_MIN = 30;

export function phaseAt(min: number): SkyPhase {
  const m = ((min % 1440) + 1440) % 1440;
  if (m >= 360 && m < 540) return 'morning';
  if (m >= 540 && m < 1020) return 'day';
  if (m >= 1020 && m < 1140) return 'sunset';
  return 'night';
}

export function mixPalette(a: SkyPalette, b: SkyPalette, t: number): SkyPalette {
  const n = (x: number, y: number) => x * (1 - t) + y * t;
  return {
    background: mixHex(a.background, b.background, t),
    fog: mixHex(a.fog, b.fog, t),
    sunColor: mixHex(a.sunColor, b.sunColor, t),
    sunIntensity: n(a.sunIntensity, b.sunIntensity),
    hemiSky: mixHex(a.hemiSky, b.hemiSky, t),
    hemiGround: mixHex(a.hemiGround, b.hemiGround, t),
    hemiIntensity: n(a.hemiIntensity, b.hemiIntensity),
    night: n(a.night, b.night),
  };
}

export interface Sky extends SkyPalette {
  /** 해(밤에는 달) 쪽 단위 벡터. 빛은 이 방향에서 원점을 비춘다 */
  sunDir: [number, number, number];
}

const MOON_DIR: [number, number, number] = [-0.35, 0.85, 0.4];

function normalize(v: [number, number, number]): [number, number, number] {
  const l = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / l, v[1] / l, v[2] / l];
}

/** 해 방향: 06시에 동쪽(+x) 낮게 떠서 정오 무렵 가장 높고 19시에 서쪽(-x)으로 진다 */
export function sunDirection(min: number): [number, number, number] {
  const p = Math.min(1, Math.max(0, (min - 360) / (1140 - 360)));
  const elev = 0.3 + Math.sin(p * Math.PI) * 1.2;
  return normalize([Math.cos(p * Math.PI), elev, 0.45]);
}

/** KST 자정부터 지난 분 → 하늘·조명 */
export function skyAt(min: number): Sky {
  const m = ((min % 1440) + 1440) % 1440;
  let palette = SKY_PALETTES[phaseAt(m)];
  for (const b of BOUNDARIES) {
    const d = m - b.at;
    if (Math.abs(d) < BLEND_MIN / 2) {
      palette = mixPalette(
        SKY_PALETTES[b.from],
        SKY_PALETTES[b.to],
        (d + BLEND_MIN / 2) / BLEND_MIN,
      );
      break;
    }
  }
  const sun = sunDirection(m);
  const k = palette.night;
  const dir = normalize([
    sun[0] + (MOON_DIR[0] - sun[0]) * k,
    sun[1] + (MOON_DIR[1] - sun[1]) * k,
    sun[2] + (MOON_DIR[2] - sun[2]) * k,
  ]);
  return { ...palette, sunDir: dir };
}

/** 상단 바용 하늘 아이콘 */
export function skyIcon(min: number): string {
  return { morning: '🌅', day: '☀️', sunset: '🌇', night: '🌙' }[phaseAt(min)];
}
```

- [x] **Step 5: 통과 확인**

Run: `npm test -w @4this/web`
Expected: PASS — sky 9개

- [x] **Step 6: 커밋**

```bash
git add apps/web/src/world/campus/sky.ts apps/web/src/world/campus/sky.test.ts
git commit -m "feat: KST 시각에 따른 하늘·조명 계산"
```

---

### Task 2: 밤 창문 불빛 (층별)

**Files:**
- Create: `apps/web/src/world/campus/nightLights.ts`
- Modify: `apps/web/src/world/campus/Building.tsx`
- Test: `apps/web/src/world/campus/nightLights.test.ts`

**Interfaces:**
- Consumes: `FloorKey` (`apps/web/src/world/contracts.ts`, `'eng:2'` 꼴), `BuildingId`
- Produces: `GLASS_OPACITY = 0.45`, `GLASS_COLOR`, `WINDOW_LIGHT`, `litFloorsOf(occupied: ReadonlySet<FloorKey>, id: BuildingId): Set<number>`, `windowGlow(night, lit): { color; emissive; opacity }`. `BuildingProps`에 `night?: number`(기본 0), `litFloors?: ReadonlySet<number>`

- [x] **Step 1: 실패하는 테스트 작성**

`apps/web/src/world/campus/nightLights.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { GLASS_COLOR, GLASS_OPACITY, litFloorsOf, WINDOW_LIGHT, windowGlow } from './nightLights';

describe('litFloorsOf', () => {
  it('이 건물의 층만 고른다', () => {
    const occupied = new Set(['eng:1', 'eng:3', 'main:2'] as const);
    expect([...litFloorsOf(occupied, 'eng')].sort()).toEqual([1, 3]);
    expect([...litFloorsOf(occupied, 'main')]).toEqual([2]);
    expect(litFloorsOf(occupied, 'cafe').size).toBe(0);
  });
});

describe('windowGlow', () => {
  it('낮이거나 사람이 없으면 꺼져 있다', () => {
    const off = { color: GLASS_COLOR, emissive: 0, opacity: GLASS_OPACITY };
    expect(windowGlow(0, true)).toEqual(off);
    expect(windowGlow(1, false)).toEqual(off);
  });

  it('밤에 사람이 있는 층은 밝고 불투명해진다', () => {
    const g = windowGlow(1, true);
    expect(g.color).toBe(WINDOW_LIGHT);
    expect(g.emissive).toBeCloseTo(1.2);
    expect(g.opacity).toBeCloseTo(0.95);
    expect(windowGlow(0.5, true).emissive).toBeCloseTo(0.6);
  });
});
```

- [x] **Step 2: 실패 확인**

Run: `npm test -w @4this/web`
Expected: FAIL — `Failed to resolve import "./nightLights"`

- [x] **Step 3: 구현**

`apps/web/src/world/campus/nightLights.ts`:
```ts
import type { BuildingId } from '@4this/shared';
import type { FloorKey } from '../contracts';
import { mixHex } from './pastel';

/** 창유리 기본 불투명도 (낮·불 꺼진 층) */
export const GLASS_OPACITY = 0.45;
export const WINDOW_LIGHT = '#ffc46b';
export const GLASS_COLOR = '#d6ecfa';

/** occupiedFloors('eng:2' 같은 키)에서 이 건물의 층 번호만 뽑는다 */
export function litFloorsOf(occupied: ReadonlySet<FloorKey>, id: BuildingId): Set<number> {
  const out = new Set<number>();
  for (const key of occupied) {
    const [b, f] = key.split(':');
    if (b === id && f) out.add(Number(f));
  }
  return out;
}

/** 창문 하나의 밤 불빛: 사람이 있는 층만 night만큼 켜진다 */
export function windowGlow(
  night: number,
  lit: boolean,
): { color: string; emissive: number; opacity: number } {
  const k = lit ? Math.max(0, Math.min(1, night)) : 0;
  return {
    color: mixHex(GLASS_COLOR, WINDOW_LIGHT, k),
    emissive: 1.2 * k,
    opacity: GLASS_OPACITY + (0.95 - GLASS_OPACITY) * k,
  };
}
```

`Building`은 층마다 창유리 재질(hm#2에서 면 × 층으로 나눠 둠)의 색·발광을 바꾸고, 켜진 창은 컷어웨이로 벽이 흐려져도 60%까지는 남겨 밤에 건물이 빛나 보이게 한다:

`apps/web/src/world/campus/Building.tsx` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/Building.tsx
+++ b/apps/web/src/world/campus/Building.tsx
@@ -13,6 +13,7 @@ import { BUILDING_STYLES } from './buildingStyles';
 import { approach, edgeOpacity, targetOpacity, wallFacesCamera } from './cutaway';
 import { doorPoint, WALL_NORMALS, type WallSide } from './layout';
 import { buildShell, disposeShell } from './shellGeometry';
+import { GLASS_COLOR, GLASS_OPACITY, WINDOW_LIGHT, windowGlow } from './nightLights';
 import { labelTexture } from './signTexture';
 
 export interface BuildingProps {
@@ -25,6 +26,10 @@ export interface BuildingProps {
   interior?: (floor: number) => ReactNode;
   /** 층별 바닥 색 (없으면 건물 기본 바닥 색) */
   floorColors?: Partial<Record<number, string>>;
+  /** 0(낮) ~ 1(밤). 밤에는 litFloors 층 창문이 켜진다 */
+  night?: number;
+  /** 사람이 있는 층 번호 */
+  litFloors?: ReadonlySet<number>;
 }
 
 interface SideMaterials {
@@ -34,8 +39,6 @@ interface SideMaterials {
   glass: MeshStandardMaterial[];
 }
 
-const GLASS_OPACITY = 0.45;
-
 /**
  * 데이터(CAMPUS.buildings[id])로 조립한 건물: 바닥판·외벽(창문 구멍)·문·계단·옥상 난간.
  * 매 프레임 카메라 쪽 벽을 투명하게 하고(컷어웨이) 테두리선만 남긴다.
@@ -47,6 +50,8 @@ export function Building({
   onClick,
   interior,
   floorColors,
+  night = 0,
+  litFloors,
 }: BuildingProps) {
   const b = CAMPUS.buildings[id];
   const style = BUILDING_STYLES[id];
@@ -65,7 +70,9 @@ export function Building({
           { length: b.floors },
           () =>
             new MeshStandardMaterial({
-              color: '#d6ecfa',
+              color: GLASS_COLOR,
+              emissive: WINDOW_LIGHT,
+              emissiveIntensity: 0,
               roughness: 0.2,
               transparent: true,
               opacity: GLASS_OPACITY,
@@ -87,6 +94,20 @@ export function Building({
     [mats],
   );
 
+  // 층별 창유리 기본 불투명도 (밤에 켜진 층은 더 불투명)
+  const glassBase = useRef<number[]>([]);
+  useEffect(() => {
+    for (let i = 0; i < b.floors; i++) {
+      const g = windowGlow(night, litFloors?.has(i + 1) ?? false);
+      glassBase.current[i] = g.opacity;
+      for (const side of WALL_SIDES) {
+        const glass = mats[side].glass[i]!;
+        glass.color.set(g.color);
+        glass.emissiveIntensity = g.emissive;
+      }
+    }
+  }, [night, litFloors, mats, b.floors]);
+
   const opacity = useRef<Record<WallSide, number>>({ n: 1, e: 1, s: 1, w: 1 });
   useFrame((state, delta) => {
     const cam = state.camera.position;
@@ -100,7 +121,12 @@ export function Building({
       m.wall.depthWrite = cur > 0.99;
       m.edge.opacity = edgeOpacity(cur);
       m.edge.visible = m.edge.opacity > 0.01;
-      for (const g of m.glass) g.opacity = GLASS_OPACITY * cur;
+      m.glass.forEach((g, i) => {
+        const base = glassBase.current[i] ?? GLASS_OPACITY;
+        // 불 켜진 창은 벽이 흐려져도 반쯤 남겨 밤에 건물이 빛나 보이게 한다
+        const keep = base > GLASS_OPACITY ? 0.6 : 0;
+        g.opacity = base * Math.max(cur, keep);
+      });
     }
   });
 
```

- [x] **Step 4: 통과 확인**

Run: `npm test -w @4this/web && npm run typecheck -w @4this/web`
Expected: PASS — nightLights 3개, 타입 에러 0

- [x] **Step 5: 커밋**

```bash
git add apps/web/src/world/campus/nightLights.ts apps/web/src/world/campus/nightLights.test.ts apps/web/src/world/campus/Building.tsx
git commit -m "feat: 밤에 사람이 있는 층 창문 불빛"
```

---

### Task 3: 하늘·해·가로등을 캠퍼스에 연결 (+ 미리보기 시각·성능 쿼리)

**Files:**
- Create: `apps/web/src/world/campus/LampGlow.tsx`, `apps/web/src/dev/campus/PerfTools.tsx`
- Modify (교체): `apps/web/src/world/campus/Lights.tsx`, `apps/web/src/world/campus/Campus.tsx`
- Modify: `apps/web/src/world/campus/layout.ts`, `apps/web/src/dev/campus/CampusPreview.tsx`
- Test: `apps/web/src/world/campus/layout.test.ts`

**Interfaces:**
- Produces: `LAMP_HEAD = { out: 0.5, y: 3.45 }`, `lampHead(l: LampSpot): [x, y, z]`, `<Lights sky />`, `<LampGlow night />`. `Campus`가 `now`·`occupiedFloors`를 쓴다(계약 그대로). `?dev=campus&time=19:30&lit=eng:1,main:3&perf=1`, `<PerfTools />`(drei `<Stats />` + `RenderInfo` + `CapsuleCrowd` 30개, `data-testid="perf-info"`에 `드로우콜 N · 삼각형 M`)

- [x] **Step 1: 실패하는 테스트 작성**

`apps/web/src/world/campus/layout.test.ts` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/layout.test.ts
+++ b/apps/web/src/world/campus/layout.test.ts
@@ -2,10 +2,12 @@ import { describe, expect, it } from 'vitest';
 import { CAMPUS, type Vec2 } from '@4this/shared';
 import {
   BUSHES,
+  distToSegment,
   doorPoint,
   FLOWER_BEDS,
   inBuilding,
   inPond,
+  lampHead,
   lampSpots,
   onBoard,
   onPath,
@@ -151,6 +153,15 @@ describe('lampSpots', () => {
     }
   });
 
+  it('전구는 기둥보다 길에 더 가깝고 3 m 위에 있다', () => {
+    const nearest = (p: Vec2) => Math.min(...segs.map((s) => distToSegment(p, s.a, s.b)));
+    for (const l of lamps) {
+      const [x, y, z] = lampHead(l);
+      expect(y).toBeGreaterThan(3);
+      expect(nearest([x, z])).toBeLessThan(nearest(l.pos));
+    }
+  });
+
   it('팔(모델 -x)이 길 쪽을 본다', () => {
     for (const l of lamps) {
       const arm: Vec2 = [l.pos[0] - Math.cos(l.rotY) * 1, l.pos[1] + Math.sin(l.rotY) * 1];
```

- [x] **Step 2: 실패 확인**

Run: `npm test -w @4this/web`
Expected: FAIL — `lampHead is not a function`

- [x] **Step 3: 구현**

KayKit 가로등(배율 3.8)은 `<Model>`이 바운딩 박스 가운데로 옮기므로 전구가 모델 원점에서 팔 쪽(-x)으로 약 0.5 m, 높이 3.45 m에 온다.

`apps/web/src/world/campus/layout.ts` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/layout.ts
+++ b/apps/web/src/world/campus/layout.ts
@@ -315,6 +315,18 @@ export function lampSpots(segs: readonly PathSeg[], c: Campus, spacing = 5.5): L
   return out;
 }
 
+/** KayKit 가로등(배율 3.8)의 전구: 모델 원점에서 팔 쪽(-x)으로 out m, 높이 y m */
+export const LAMP_HEAD = { out: 0.5, y: 3.45 };
+
+/** 가로등 전구 위치 (월드 x, y, z) */
+export function lampHead(l: LampSpot): [number, number, number] {
+  return [
+    l.pos[0] - Math.cos(l.rotY) * LAMP_HEAD.out,
+    LAMP_HEAD.y,
+    l.pos[1] + Math.sin(l.rotY) * LAMP_HEAD.out,
+  ];
+}
+
 export type TreeKind = 'cherry' | 'green';
 
 export interface TreeSpot {
```

`apps/web/src/world/campus/LampGlow.tsx`:
```tsx
import { useLayoutEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  CircleGeometry,
  Object3D,
  SphereGeometry,
  type InstancedMesh,
  type MeshBasicMaterial,
} from 'three';
import { CAMPUS } from '@4this/shared';
import { lampHead, lampSpots, pathSegments } from './layout';

const WARM = '#ffe7a3';

/**
 * 가로등 불빛: 전구 + 바닥의 빛 웅덩이 (각각 InstancedMesh 1개).
 * 점광원을 쓰지 않아서 가로등이 많아도 빛 계산이 늘지 않는다. night가 0이면 꺼진다.
 */
export function LampGlow({ night }: { night: number }) {
  const heads = useMemo(() => lampSpots(pathSegments(CAMPUS), CAMPUS).map(lampHead), []);
  const bulbGeo = useMemo(() => new SphereGeometry(0.16, 12, 8), []);
  const poolGeo = useMemo(() => new CircleGeometry(1.8, 24).rotateX(-Math.PI / 2), []);
  const bulbs = useRef<InstancedMesh>(null);
  const pools = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const b = bulbs.current;
    const p = pools.current;
    if (!b || !p) return;
    const d = new Object3D();
    heads.forEach(([x, y, z], i) => {
      d.position.set(x, y, z);
      d.updateMatrix();
      b.setMatrixAt(i, d.matrix);
      d.position.set(x, 0.12, z);
      d.updateMatrix();
      p.setMatrixAt(i, d.matrix);
    });
    b.instanceMatrix.needsUpdate = true;
    p.instanceMatrix.needsUpdate = true;
    b.computeBoundingSphere();
    p.computeBoundingSphere();
  }, [heads]);

  useLayoutEffect(() => {
    const pm = pools.current?.material as MeshBasicMaterial | undefined;
    if (pm) pm.opacity = 0.45 * night;
  }, [night]);

  return (
    <group>
      <instancedMesh ref={bulbs} args={[bulbGeo, undefined, heads.length]}>
        <meshBasicMaterial color={night > 0.05 ? WARM : '#f4f0ea'} toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={pools} args={[poolGeo, undefined, heads.length]} visible={night > 0.01}>
        <meshBasicMaterial
          color={WARM}
          transparent
          opacity={0}
          depthWrite={false}
          blending={AdditiveBlending}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}
```

`apps/web/src/world/campus/Lights.tsx`:
```tsx
import { useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Color, Fog, type DirectionalLight, type HemisphereLight } from 'three';
import type { Sky } from './sky';

/** 해(그림자를 만드는 유일한 빛)까지 거리 */
const SUN_DISTANCE = 60;

/**
 * 하늘색·안개·반구광·해. sky가 바뀔 때(1분마다)만 갱신한다.
 * 그림자 범위는 50×50 판에 딱 맞춘다(±30 m).
 */
export function Lights({ sky }: { sky: Sky }) {
  const scene = useThree((s) => s.scene);
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);

  useEffect(() => {
    if (!(scene.background instanceof Color)) scene.background = new Color();
    (scene.background as Color).set(sky.background);
    if (!(scene.fog instanceof Fog)) scene.fog = new Fog(sky.fog, 80, 170);
    scene.fog.color.set(sky.fog);
    const s = sun.current;
    if (s) {
      s.color.set(sky.sunColor);
      s.intensity = sky.sunIntensity;
      s.position.set(
        sky.sunDir[0] * SUN_DISTANCE,
        sky.sunDir[1] * SUN_DISTANCE,
        sky.sunDir[2] * SUN_DISTANCE,
      );
    }
    const h = hemi.current;
    if (h) {
      h.color.set(sky.hemiSky);
      h.groundColor.set(sky.hemiGround);
      h.intensity = sky.hemiIntensity;
    }
  }, [scene, sky]);

  return (
    <>
      <hemisphereLight ref={hemi} />
      <directionalLight
        ref={sun}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
        shadow-camera-near={10}
        shadow-camera-far={120}
        shadow-bias={-0.0005}
        shadow-normalBias={0.03}
      />
    </>
  );
}
```

`apps/web/src/world/campus/Campus.tsx`:
```tsx
import { useMemo } from 'react';
import { BUILDING_IDS, kstMinutes, type BuildingId } from '@4this/shared';
import type { CampusProps } from '../contracts';
import { Building } from './Building';
import { CafeInterior, CafeTerrace } from './CafeInterior';
import { EngInterior } from './EngInterior';
import { Flowers } from './Flowers';
import { Gate } from './Gate';
import { Grass } from './Grass';
import { Ground } from './Ground';
import { LabInterior } from './LabInterior';
import { LampGlow } from './LampGlow';
import { Lights } from './Lights';
import { MainInterior } from './MainInterior';
import { NoticeBoard } from './NoticeBoard';
import { OutdoorProps } from './OutdoorProps';
import { Paths } from './Paths';
import { litFloorsOf } from './nightLights';
import { Pond } from './Pond';
import { skyAt } from './sky';
import { Trees } from './Trees';

/** 4thIS 캠퍼스 전체 (지형·길·자연물·정문·소품·건물·조명) */
export function Campus({
  now,
  occupiedFloors,
  focusedBuilding,
  hiddenAboveFloor,
  onBuildingClick,
}: CampusProps) {
  // 층 숨김은 포커스된 건물에만 적용한다
  const hidden = (id: BuildingId) => (focusedBuilding === id ? hiddenAboveFloor : null);
  // 하늘은 1분 단위로만 다시 계산한다
  const minute = Math.floor(kstMinutes(now));
  const sky = useMemo(() => skyAt(minute), [minute]);
  const lit = useMemo(
    () =>
      Object.fromEntries(BUILDING_IDS.map((id) => [id, litFloorsOf(occupiedFloors, id)])) as Record<
        BuildingId,
        Set<number>
      >,
    [occupiedFloors],
  );
  const common = (id: BuildingId) => ({
    id,
    hiddenAboveFloor: hidden(id),
    focused: focusedBuilding === id,
    onClick: onBuildingClick,
    night: sky.night,
    litFloors: lit[id],
  });
  return (
    <group>
      <Lights sky={sky} />
      <Ground />
      <Paths />
      <Grass />
      <Trees />
      <Flowers />
      <Pond />
      <Gate />
      <NoticeBoard />
      <OutdoorProps />
      <LampGlow night={sky.night} />
      <Building {...common('eng')} interior={(floor) => <EngInterior floor={floor} />} />
      <Building
        {...common('lab')}
        interior={(floor) => <LabInterior floor={floor} />}
        floorColors={{ 1: '#a59cb4' }}
      />
      <Building {...common('main')} interior={(floor) => <MainInterior floor={floor} />} />
      <Building {...common('cafe')} interior={() => <CafeInterior />} />
      <CafeTerrace />
    </group>
  );
}
```

미리보기에 시각 고정·켜진 층·성능 쿼리와 시각 버튼을 넣는다. 성능 도구(`perf=1`)는 Task 4에서 재는 데 쓴다. 캡슐 30개는 캐릭터처럼 각자 메시 2개(= 드로우콜 2개 + 그림자 2개)라서 실제 캐릭터 부하를 대략 흉내 낸다.

`apps/web/src/dev/campus/PerfTools.tsx`:
```tsx
import { Stats } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { CAMPUS, type Vec2 } from '@4this/shared';

/** 캐릭터 30명 대신 걷는 캡슐 (캐릭터와 비슷하게 각자 메시 2개 = 드로우콜 2개) */
export function CapsuleCrowd({ count = 30 }: { count?: number }) {
  const routes = useMemo(() => {
    const nodes = CAMPUS.graph.nodes;
    return Array.from({ length: count }, (_, i) => {
      const [a, b] = CAMPUS.graph.edges[i % CAMPUS.graph.edges.length]!;
      return { a: nodes[a]!, b: nodes[b]!, phase: i * 0.37, speed: 0.08 + (i % 5) * 0.02 };
    });
  }, [count]);
  const refs = useRef<(Group | null)[]>([]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    routes.forEach((r, i) => {
      const g = refs.current[i];
      if (!g) return;
      const k = (Math.sin(t * r.speed * 2 + r.phase) + 1) / 2;
      const p: Vec2 = [r.a[0] + (r.b[0] - r.a[0]) * k, r.a[1] + (r.b[1] - r.a[1]) * k];
      g.position.set(p[0], Math.abs(Math.sin(t * 8 + i)) * 0.08, p[1]);
    });
  });
  return (
    <group>
      {routes.map((r, i) => (
        <group
          key={i}
          ref={(g) => {
            refs.current[i] = g;
          }}
        >
          <mesh position-y={0.6} castShadow>
            <capsuleGeometry args={[0.3, 0.5, 4, 12]} />
            <meshStandardMaterial color="#f6dcc0" />
          </mesh>
          <mesh position-y={1.35} castShadow>
            <sphereGeometry args={[0.32, 16, 12]} />
            <meshStandardMaterial color="#fff1a8" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** 드로우콜·삼각형 수를 DOM에 0.5초마다 적는다 (data-testid="perf-info") */
export function RenderInfo() {
  const gl = useThree((s) => s.gl);
  const last = useRef(0);
  useFrame((state) => {
    if (state.clock.elapsedTime - last.current < 0.5) return;
    last.current = state.clock.elapsedTime;
    const el = document.querySelector('[data-testid="perf-info"]');
    if (el) {
      const r = gl.info.render;
      el.textContent = `드로우콜 ${r.calls} · 삼각형 ${r.triangles}`;
    }
  });
  return null;
}

/** ?perf=1 일 때 Canvas 안에 넣는다: FPS 패널 + 렌더 정보 + 캡슐 30개 */
export function PerfTools() {
  return (
    <>
      <Stats />
      <RenderInfo />
      <CapsuleCrowd />
    </>
  );
}
```

`apps/web/src/dev/campus/CampusPreview.tsx` (바뀐 부분):
```diff
--- a/apps/web/src/dev/campus/CampusPreview.tsx
+++ b/apps/web/src/dev/campus/CampusPreview.tsx
@@ -1,8 +1,17 @@
 import { OrbitControls } from '@react-three/drei';
 import { Canvas } from '@react-three/fiber';
-import { useState } from 'react';
-import { BUILDING_IDS, CAMPUS, type BuildingId } from '@4this/shared';
+import { useEffect, useState } from 'react';
+import {
+  BUILDING_IDS,
+  CAMPUS,
+  kstDate,
+  kstMidnight,
+  toMinutes,
+  type BuildingId,
+} from '@4this/shared';
+import type { FloorKey } from '../../world/contracts';
 import { Campus } from '../../world/campus/Campus';
+import { PerfTools } from './PerfTools';
 
 /** '1,2,3' → [1, 2, 3] (잘못되면 기본값) */
 function vec3(param: string | null, fallback: [number, number, number]): [number, number, number] {
@@ -15,6 +24,13 @@ const CAMERA = vec3(params.get('cam'), [38, 34, 40]);
 const TARGET = vec3(params.get('target'), [0, 0, 0]);
 const START_BUILDING = BUILDING_IDS.find((id) => id === params.get('building')) ?? null;
 const START_FLOOR = params.get('floor') ? Number(params.get('floor')) : null;
+/** time=HH:MM 이면 오늘(KST) 그 시각으로 고정 */
+const FIXED_TIME = params.get('time');
+/** lit=eng:1,main:3 → 사람이 있는 층 (밤 창문 불빛) */
+const LIT = new Set((params.get('lit') ?? '').split(',').filter(Boolean) as FloorKey[]);
+const PERF = params.get('perf') === '1';
+
+const fixedNow = (hhmm: string) => kstMidnight(kstDate(Date.now())) + toMinutes(hhmm) * 60_000;
 
 const panel: React.CSSProperties = {
   position: 'fixed',
@@ -44,19 +60,29 @@ const chip = (on: boolean): React.CSSProperties => ({
  * 캠퍼스 미리보기 개발 페이지 (?dev=campus).
  * - cam=x,y,z / target=x,y,z: 카메라 위치·바라보는 점 (스크린샷용)
  * - building=eng&floor=2: 포커스할 건물과 "이 층까지만 보기"
+ * - time=19:30: 하늘·조명 시각 고정 (없으면 지금 시각, 30초마다 갱신)
+ * - lit=eng:1,main:3: 사람이 있는 층 (밤 창문 불빛)
+ * - perf=1: FPS 패널 + 드로우콜 + 캐릭터 대신 캡슐 30개
  */
 export function CampusPreview() {
   const [focused, setFocused] = useState<BuildingId | null>(START_BUILDING);
   const [floor, setFloor] = useState<number | null>(START_FLOOR);
   const [log, setLog] = useState('건물을 눌러 보세요');
   const floors = focused ? CAMPUS.buildings[focused].floors : 0;
+  const [time, setTime] = useState<string | null>(FIXED_TIME);
+  const [tick, setTick] = useState(() => Date.now());
+  useEffect(() => {
+    const id = setInterval(() => setTick(Date.now()), 30_000);
+    return () => clearInterval(id);
+  }, []);
+  const now = time ? fixedNow(time) : tick;
 
   return (
     <div style={{ position: 'fixed', inset: 0 }}>
       <Canvas shadows camera={{ position: CAMERA, fov: 32 }}>
         <Campus
-          now={Date.now()}
-          occupiedFloors={new Set()}
+          now={now}
+          occupiedFloors={LIT}
           focusedBuilding={focused}
           hiddenAboveFloor={floor}
           onBuildingClick={(id) => {
@@ -66,9 +92,22 @@ export function CampusPreview() {
           }}
         />
         <OrbitControls makeDefault target={TARGET} maxPolarAngle={Math.PI * 0.45} />
+        {PERF && <PerfTools />}
       </Canvas>
       <div style={panel}>
         <span data-testid="campus-log">{log}</span>
+        <div>
+          시각:{' '}
+          {['07:30', '12:00', '18:00', '22:00'].map((t) => (
+            <button key={t} style={chip(time === t)} onClick={() => setTime(t)}>
+              {t}
+            </button>
+          ))}
+          <button style={chip(time === null)} onClick={() => setTime(null)}>
+            지금
+          </button>
+        </div>
+        {PERF && <span data-testid="perf-info">측정 중…</span>}
         {focused && (
           <div>
             {CAMPUS.buildings[focused].name}:{' '}
```

- [x] **Step 4: 통과 확인**

Run: `npm test -w @4this/web && npm run typecheck && npm run lint`
Expected: PASS — layout 19개, 에러 0

- [x] **Step 5: 브라우저·스크린샷으로 확인**

Run: `npm run dev -w @4this/web` 후 아래를 찍는다(PR에 첨부, 커밋하지 않음).

```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus&time=07:30" sky-morning.png
```
```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus&time=12:00" sky-day.png
```
```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus&time=18:00" sky-sunset.png
```
```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus&time=22:00&lit=eng:1,eng:3,main:1,main:2,lab:2,cafe:1&cam=30,14,30&target=10,3,-6" sky-night.png
```

Expected:
- 아침: 복숭아빛 배경, 그림자가 서쪽으로 길다(해가 동쪽 낮게). 낮: 연하늘 배경, 그림자 짧다. 노을: 분홍 배경·분홍빛 해·그림자가 동쪽으로.
- 밤: 남색 배경, 길 위 가로등 아래 노란 빛 웅덩이와 전구. `sky-night.png`에서 공학관 1·3층 창만 따뜻한 노란빛이고 2층은 어둡다.
- "지금" 버튼(쿼리 없이)은 실제 KST 시각을 따른다.

- [x] **Step 6: 커밋**

```bash
git add apps/web/src/world/campus apps/web/src/dev/campus
git commit -m "feat: 시각에 따른 하늘·해·가로등과 밤 창문 연결"
```

---

### Task 4: 드로우콜·삼각형 줄이기와 60 fps 확인

**Files:**
- Modify: `apps/web/src/world/campus/CodeProps.tsx`, `apps/web/src/world/campus/models.tsx`, `apps/web/src/world/campus/OutdoorProps.tsx`, `apps/web/src/world/campus/Paths.tsx`, `apps/web/src/world/campus/Flowers.tsx`, `apps/web/src/world/campus/EngInterior.tsx`, `apps/web/src/world/campus/LabInterior.tsx`, `apps/web/src/world/campus/MainInterior.tsx`, `apps/web/src/world/campus/CafeInterior.tsx`

**Interfaces:**
- Produces: `Table` → `Tables({ tables: TableBox[]; y; color?; top? })`(윗판 1 + 다리 1 InstancedMesh). `<Model>`의 `shadows` 기본값 `false`(바깥 소품·테라스 의자만 `shadows`)

- [x] **Step 1: 줄이기 전 측정**

Run: `npm run dev -w @4this/web` 후

```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus&perf=1&time=12:00" perf-before.png
```

Expected: 패널의 `드로우콜 약 850 · 삼각형 약 42만`(헤드리스 소프트웨어 WebGL 기준, 구체 값은 조금 다를 수 있다).

- [x] **Step 2: 줄이기**

1) 실내 가구·코드 소품은 그림자를 만들지 않는다(벽·바닥판이 만든다). `<Model>` 기본값을 바꾸고 바깥 소품만 켠다:

`apps/web/src/world/campus/models.tsx` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/models.tsx
+++ b/apps/web/src/world/campus/models.tsx
@@ -202,10 +202,11 @@ export class ModelBoundary extends Component<BoundaryProps, { failed: boolean }>
 export function Model({
   name,
   items,
-  shadows = true,
+  shadows = false,
 }: {
   name: ModelName;
   items: readonly ModelItem[];
+  /** 그림자를 만들지 (바깥 소품만 true. 실내 가구는 벽·바닥판이 그림자를 만든다) */
   shadows?: boolean;
 }) {
   if (items.length === 0) return null;
```

`apps/web/src/world/campus/OutdoorProps.tsx` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/OutdoorProps.tsx
+++ b/apps/web/src/world/campus/OutdoorProps.tsx
@@ -32,10 +32,10 @@ export function OutdoorProps() {
   );
   return (
     <group>
-      <Model name="bench" items={benches} />
-      <Model name="streetlight" items={lamps} />
-      <Model name="bush" items={bushes} />
-      <Model name="trash" items={trash} />
+      <Model shadows name="bench" items={benches} />
+      <Model shadows name="streetlight" items={lamps} />
+      <Model shadows name="bush" items={bushes} />
+      <Model shadows name="trash" items={trash} />
     </group>
   );
 }
```

2) 테이블을 인스턴싱하고(`Table` 여러 개 → `Tables` 하나), 실내 코드 소품의 `castShadow`를 뺀다:

`apps/web/src/world/campus/CodeProps.tsx` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/CodeProps.tsx
+++ b/apps/web/src/world/campus/CodeProps.tsx
@@ -1,11 +1,14 @@
 import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
-import { BoxGeometry, DoubleSide, type InstancedMesh } from 'three';
+import { BoxGeometry, DoubleSide, Object3D, type InstancedMesh } from 'three';
 import type { Vec2 } from '@4this/shared';
-import { TABLE_TOP } from './furniture';
+import { TABLE_TOP, type TableBox } from './furniture';
 import { itemMatrix, type ModelItem } from './models';
 import { labelTexture } from './signTexture';
 
-/** 두 팩에 없는 가구는 코드로 만든다: 칠판·교탁·층 표지판·테이블·배식대·식판·파라솔 */
+/**
+ * 두 팩에 없는 가구는 코드로 만든다: 칠판·교탁·층 표지판·테이블·배식대·식판·파라솔.
+ * 실내 소품은 그림자를 만들지 않는다(벽·바닥판이 만든다). 그림자 패스 드로우콜을 줄이기 위해서다.
+ */
 
 interface Placed {
   /** 바닥 위 자리 (x, y, z). y는 바닥 높이 */
@@ -18,7 +21,7 @@ interface Placed {
 export function Blackboard({ pos, rotY, width = 4 }: Placed & { width?: number }) {
   return (
     <group position={pos} rotation-y={rotY}>
-      <mesh position={[0, 1.6, 0]} castShadow>
+      <mesh position={[0, 1.6, 0]}>
         <boxGeometry args={[width + 0.16, 1.36, 0.06]} />
         <meshStandardMaterial color="#e8c9a6" roughness={0.9} />
       </mesh>
@@ -32,7 +35,7 @@ export function Blackboard({ pos, rotY, width = 4 }: Placed & { width?: number }
           <meshBasicMaterial color="#f4f8f2" />
         </mesh>
       ))}
-      <mesh position={[0, 0.88, 0.08]} castShadow>
+      <mesh position={[0, 0.88, 0.08]}>
         <boxGeometry args={[width * 0.9, 0.05, 0.12]} />
         <meshStandardMaterial color="#e8c9a6" roughness={0.9} />
       </mesh>
@@ -48,11 +51,11 @@ export function Blackboard({ pos, rotY, width = 4 }: Placed & { width?: number }
 export function Lectern({ pos, rotY }: Placed) {
   return (
     <group position={pos} rotation-y={rotY}>
-      <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
+      <mesh position={[0, 0.55, 0]} receiveShadow>
         <boxGeometry args={[1, 1.1, 0.55]} />
         <meshStandardMaterial color="#e9cfb3" roughness={0.9} />
       </mesh>
-      <mesh position={[0, 1.13, -0.03]} castShadow>
+      <mesh position={[0, 1.13, -0.03]}>
         <boxGeometry args={[1.12, 0.06, 0.66]} />
         <meshStandardMaterial color="#d8b593" roughness={0.9} />
       </mesh>
@@ -85,39 +88,59 @@ export function WallSign({
   );
 }
 
-/** 사각 테이블: 윗판 + 다리 4개 */
-export function Table({
-  center,
-  size,
+/** 사각 테이블 여러 개: 윗판 InstancedMesh 1개 + 다리 InstancedMesh 1개 */
+export function Tables({
+  tables,
   y,
   color = '#f1d9bf',
   top = TABLE_TOP,
 }: {
-  center: Vec2;
-  size: Vec2;
+  tables: readonly TableBox[];
   y: number;
   color?: string;
   top?: number;
 }) {
-  const [w, d] = size;
-  const legs: Vec2[] = [
-    [-w / 2 + 0.1, -d / 2 + 0.1],
-    [w / 2 - 0.1, -d / 2 + 0.1],
-    [-w / 2 + 0.1, d / 2 - 0.1],
-    [w / 2 - 0.1, d / 2 - 0.1],
-  ];
+  const unit = useMemo(() => new BoxGeometry(1, 1, 1), []);
+  useEffect(() => () => unit.dispose(), [unit]);
+  const tops = useRef<InstancedMesh>(null);
+  const legs = useRef<InstancedMesh>(null);
+  useLayoutEffect(() => {
+    const t = tops.current;
+    const l = legs.current;
+    if (!t || !l) return;
+    const d = new Object3D();
+    tables.forEach((tb, i) => {
+      const [w, dd] = tb.size;
+      d.position.set(tb.center[0], y + top - 0.03, tb.center[1]);
+      d.scale.set(w, 0.06, dd);
+      d.updateMatrix();
+      t.setMatrixAt(i, d.matrix);
+      const corners: Vec2[] = [
+        [-w / 2 + 0.1, -dd / 2 + 0.1],
+        [w / 2 - 0.1, -dd / 2 + 0.1],
+        [-w / 2 + 0.1, dd / 2 - 0.1],
+        [w / 2 - 0.1, dd / 2 - 0.1],
+      ];
+      corners.forEach(([x, z], k) => {
+        d.position.set(tb.center[0] + x, y + (top - 0.06) / 2, tb.center[1] + z);
+        d.scale.set(0.08, top - 0.06, 0.08);
+        d.updateMatrix();
+        l.setMatrixAt(i * 4 + k, d.matrix);
+      });
+    });
+    t.instanceMatrix.needsUpdate = true;
+    l.instanceMatrix.needsUpdate = true;
+    t.computeBoundingSphere();
+    l.computeBoundingSphere();
+  }, [tables, y, top]);
   return (
-    <group position={[center[0], y, center[1]]}>
-      <mesh position-y={top - 0.03} castShadow receiveShadow>
-        <boxGeometry args={[w, 0.06, d]} />
+    <group key={tables.length}>
+      <instancedMesh ref={tops} args={[unit, undefined, tables.length]} receiveShadow>
         <meshStandardMaterial color={color} roughness={0.85} />
-      </mesh>
-      {legs.map(([x, z]) => (
-        <mesh key={`${x},${z}`} position={[x, (top - 0.06) / 2, z]} castShadow>
-          <boxGeometry args={[0.08, top - 0.06, 0.08]} />
-          <meshStandardMaterial color="#d8b593" roughness={0.9} />
-        </mesh>
-      ))}
+      </instancedMesh>
+      <instancedMesh ref={legs} args={[unit, undefined, tables.length * 4]}>
+        <meshStandardMaterial color="#d8b593" roughness={0.9} />
+      </instancedMesh>
     </group>
   );
 }
@@ -150,7 +173,6 @@ export function BoxInstances({
       key={items.length}
       ref={ref}
       args={[geometry, undefined, items.length]}
-      castShadow
       receiveShadow
     >
       <meshStandardMaterial color={color} roughness={0.8} />
@@ -163,11 +185,11 @@ export function ServingCounter({ pos, rotY, length }: Placed & { length: number
   const pots = Math.max(1, Math.floor(length / 0.9));
   return (
     <group position={pos} rotation-y={rotY}>
-      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
+      <mesh position={[0, 0.45, 0]} receiveShadow>
         <boxGeometry args={[length, 0.9, 0.7]} />
         <meshStandardMaterial color="#f6d7c3" roughness={0.85} />
       </mesh>
-      <mesh position={[0, 0.92, 0]} castShadow>
+      <mesh position={[0, 0.92, 0]}>
         <boxGeometry args={[length + 0.1, 0.05, 0.8]} />
         <meshStandardMaterial color="#e9e4ef" roughness={0.4} />
       </mesh>
@@ -176,11 +198,7 @@ export function ServingCounter({ pos, rotY, length }: Placed & { length: number
         <meshStandardMaterial color="#d6ecfa" transparent opacity={0.4} roughness={0.2} />
       </mesh>
       {Array.from({ length: pots }, (_, i) => (
-        <mesh
-          key={i}
-          position={[-length / 2 + (length / pots) * (i + 0.5), 1.02, -0.05]}
-          castShadow
-        >
+        <mesh key={i} position={[-length / 2 + (length / pots) * (i + 0.5), 1.02, -0.05]}>
           <cylinderGeometry args={[0.2, 0.18, 0.16, 16]} />
           <meshStandardMaterial
             color={['#ffd9c2', '#fff1a8', '#cdeedd', '#ffd6e2'][i % 4]}
```

`apps/web/src/world/campus/MainInterior.tsx` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/MainInterior.tsx
+++ b/apps/web/src/world/campus/MainInterior.tsx
@@ -1,7 +1,7 @@
 import { useMemo } from 'react';
 import { CAMPUS } from '@4this/shared';
 import { floorY, SLAB_LIFT, WALL_T } from './buildingGeometry';
-import { Blackboard, BoxInstances, Lectern, ServingCounter, Table, WallSign } from './CodeProps';
+import { Blackboard, BoxInstances, Lectern, ServingCounter, Tables, WallSign } from './CodeProps';
 import {
   chairAt,
   chunk,
@@ -32,9 +32,7 @@ function Cafeteria() {
     <group>
       <ServingCounter pos={[-3, y, NORTH + 0.4]} rotY={0} length={7} />
       <WallSign pos={[4, y + 2.3, NORTH + 0.02]} rotY={0} text="식당" bg="#f3c98b" />
-      {tables.map((t) => (
-        <Table key={t.center.join(',')} center={t.center} size={t.size} y={y} />
-      ))}
+      <Tables tables={tables} y={y} />
       <Model name="chair" items={chairs} />
       <BoxInstances items={trays} size={[0.42, 0.03, 0.3]} color="#eef0f6" />
       <Model
@@ -69,7 +67,7 @@ function LectureHall() {
       <Model name="desk" items={f.desks} />
       <Model name="laptop" items={f.laptops} />
       <Model name="computerScreen" items={f.screens} />
-      <Model name="computerKeyboard" items={f.keyboards} shadows={false} />
+      <Model name="computerKeyboard" items={f.keyboards} />
       <Model name="pottedPlant" items={[{ pos: [WEST + 0.5, y, NORTH + 0.5], rotY: 0 }]} />
     </group>
   );
@@ -107,9 +105,7 @@ function Library() {
   return (
     <group>
       <WallSign pos={[0, y + 2.45, NORTH + 0.02]} rotY={0} text="도서관" bg="#f3c98b" />
-      {tables.map((t) => (
-        <Table key={t.center.join(',')} center={t.center} size={t.size} y={y} color="#e9d3bb" />
-      ))}
+      <Tables tables={tables} y={y} color="#e9d3bb" />
       <Model name="chairRounded" items={chairs} />
       <Model name="books" items={books} />
       <Model name="lampRoundTable" items={lamps} />
```

`apps/web/src/world/campus/CafeInterior.tsx` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/CafeInterior.tsx
+++ b/apps/web/src/world/campus/CafeInterior.tsx
@@ -1,7 +1,7 @@
 import { useMemo } from 'react';
 import { CAMPUS } from '@4this/shared';
 import { floorY, SLAB_LIFT, WALL_T } from './buildingGeometry';
-import { BoxInstances, Parasol, Table } from './CodeProps';
+import { BoxInstances, Parasol, Tables } from './CodeProps';
 import {
   centroid,
   chairAt,
@@ -39,9 +39,7 @@ export function CafeInterior() {
   );
   return (
     <group>
-      {tables.map((t) => (
-        <Table key={t.center.join(',')} center={t.center} size={t.size} y={y} color="#f6e1cc" />
-      ))}
+      <Tables tables={tables} y={y} color="#f6e1cc" />
       <Model name="chairRounded" items={chairs} />
       <BoxInstances items={cups} size={[0.1, 0.12, 0.1]} color="#ffffff" />
       <Model name="kitchenBar" items={counter} />
@@ -71,17 +69,12 @@ export function CafeTerrace() {
         <boxGeometry args={[w, 0.1, d]} />
         <meshStandardMaterial color="#ecd2b8" roughness={0.9} />
       </mesh>
+      <Tables tables={pairs.map((pair) => tableBetween(pair))} y={0.1} color="#f6e1cc" />
       {pairs.map((pair) => {
-        const t = tableBetween(pair);
         const c = centroid(pair);
-        return (
-          <group key={c.join(',')}>
-            <Table center={t.center} size={t.size} y={0.1} color="#f6e1cc" />
-            <Parasol pos={[c[0], 0.1, c[1]]} />
-          </group>
-        );
+        return <Parasol key={c.join(',')} pos={[c[0], 0.1, c[1]]} />;
       })}
-      <Model name="chairRounded" items={chairs} />
+      <Model shadows name="chairRounded" items={chairs} />
     </group>
   );
 }
```

`apps/web/src/world/campus/LabInterior.tsx` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/LabInterior.tsx
+++ b/apps/web/src/world/campus/LabInterior.tsx
@@ -1,7 +1,7 @@
 import { useMemo } from 'react';
 import { CAMPUS } from '@4this/shared';
 import { floorY, SLAB_LIFT } from './buildingGeometry';
-import { Table } from './CodeProps';
+import { Tables } from './CodeProps';
 import { chairAt, DESK_TOP, facingSeat, TABLE_TOP, tableBetween } from './furniture';
 import { Model, type ModelItem } from './models';
 
@@ -54,12 +54,12 @@ function ResearchRoom() {
   }));
   return (
     <group>
-      <Table center={table.center} size={table.size} y={y} />
+      <Tables tables={[table]} y={y} />
       <Model name="chairDesk" items={[...chairs, chairAt(prof, y)]} />
       <Model name="laptop" items={laptops} />
       <Model name="desk" items={[profDesk]} />
       <Model name="computerScreen" items={[profScreen]} />
-      <Model name="computerKeyboard" items={[profKeys]} shadows={false} />
+      <Model name="computerKeyboard" items={[profKeys]} />
       <Model name="books" items={[profBooks]} />
       <Model name="bookcaseOpen" items={partition} />
       <Model name="bookcaseClosedWide" items={southShelves} />
```

`apps/web/src/world/campus/EngInterior.tsx` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/EngInterior.tsx
+++ b/apps/web/src/world/campus/EngInterior.tsx
@@ -24,7 +24,7 @@ export function EngInterior({ floor }: { floor: number }) {
       <Model name="desk" items={f.desks} />
       <Model name="laptop" items={f.laptops} />
       <Model name="computerScreen" items={f.screens} />
-      <Model name="computerKeyboard" items={f.keyboards} shadows={false} />
+      <Model name="computerKeyboard" items={f.keyboards} />
       <Model
         name="pottedPlant"
         items={[
```

3) 삼각형 줄이기: 보도블록(약 1,500장) 둥근 모서리 분할 2 → 1, 꽃송이 구 8×6 → 6×4이고 그림자 끔:

`apps/web/src/world/campus/Paths.tsx` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/Paths.tsx
+++ b/apps/web/src/world/campus/Paths.tsx
@@ -9,7 +9,7 @@ const PAVER_COLORS = ['#fbeedd', '#f5e2cc', '#f9e8d6'];
 /** 경로 그래프를 따라 깐 보도블록 (InstancedMesh 1개) + 원형 광장 */
 export function Paths() {
   const tiles = useMemo(() => paverTiles(pathSegments(CAMPUS), CAMPUS), []);
-  const geometry = useMemo(() => new RoundedBoxGeometry(0.56, 0.08, 0.56, 2, 0.05), []);
+  const geometry = useMemo(() => new RoundedBoxGeometry(0.56, 0.08, 0.56, 1, 0.04), []);
   const ref = useRef<InstancedMesh>(null);
 
   useLayoutEffect(() => {
```

`apps/web/src/world/campus/Flowers.tsx` (바뀐 부분):
```diff
--- a/apps/web/src/world/campus/Flowers.tsx
+++ b/apps/web/src/world/campus/Flowers.tsx
@@ -13,7 +13,7 @@ export function Flowers() {
     [],
   );
   const stemGeo = useMemo(() => new CylinderGeometry(0.02, 0.02, 0.3, 4).translate(0, 0.15, 0), []);
-  const headGeo = useMemo(() => new SphereGeometry(0.11, 8, 6), []);
+  const headGeo = useMemo(() => new SphereGeometry(0.11, 6, 4), []);
   const stems = useRef<InstancedMesh>(null);
   const heads = useRef<InstancedMesh>(null);
 
@@ -44,7 +44,7 @@ export function Flowers() {
       <instancedMesh ref={stems} args={[stemGeo, undefined, spots.length]}>
         <meshStandardMaterial color="#8fc98a" roughness={0.9} />
       </instancedMesh>
-      <instancedMesh ref={heads} args={[headGeo, undefined, spots.length]} castShadow>
+      <instancedMesh ref={heads} args={[headGeo, undefined, spots.length]}>
         <meshStandardMaterial roughness={0.8} />
       </instancedMesh>
     </group>
```

- [x] **Step 3: 줄인 뒤 측정**

Run: `npm run typecheck && npm run lint && npm test`, 그리고

```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus&perf=1&time=12:00" perf-after.png
```
```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus&perf=1&time=22:00&lit=eng:1,eng:2,eng:3,main:1,main:2,main:3,lab:2,cafe:1" perf-night.png
```

Expected: 둘 다 `드로우콜 약 590 · 삼각형 약 23만`(목표 600·25만 이하). 밤에 모든 층이 켜져도 드로우콜이 늘지 않는다(빛은 재질 값만 바뀜).

- [x] **Step 4: 실제 노트북에서 60 fps 확인 (사람이 직접)**

일반 노트북의 Chrome(하드웨어 가속 켜짐)에서 http://localhost:5173/?dev=campus&perf=1 을 연다.
Expected: 왼쪽 위 Stats 패널 FPS가 60 근처(최소 55 이상)로 유지된다. 카메라를 돌리고(컷어웨이가 바뀌는 중), 공학관을 눌러 층을 바꾸고, 시각 버튼을 눌러도 떨어지지 않는다. 55 미만이면 PR 본문에 기기·FPS를 적고, `Grass`의 `tries`를 7000 → 4000, `Lights`의 `shadow-mapSize`를 2048 → 1024로 낮춰 다시 잰다.

- [x] **Step 5: 커밋**

```bash
git add apps/web/src/world/campus
git commit -m "perf: 실내 그림자 끄기·테이블 인스턴싱·삼각형 줄이기와 성능 측정 페이지"
```

---

### Task 5: 전체 검사와 PR

- [x] **Step 1: 전체 검사**

Run: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
Expected: 모두 통과. web 71개(hm#3까지 58 + sky 9 + nightLights 3 + layout 1), shared 24개.

- [x] **Step 2: push와 PR**

```bash
git push origin hm
gh pr create --base main --head hm --title "[hm#4] 하늘·조명·성능" --body-file .github/pull_request_template.md
```

PR 본문에 하늘 스크린샷 4장, 성능 전후(드로우콜·삼각형), 실제 노트북 FPS(기기 이름), "`skyIcon(kstMinutes)`을 상단 바 아이콘에 쓸 수 있음"을 적는다. 리뷰어: cw(`now`·`occupiedFloors` 연결). 머지는 **Create a merge commit**.

- [x] **Step 3: 머지 후 알림**

단톡방에 "hm#4 머지됨 — 하늘이 KST를 따라가고 밤에 사람 있는 층 창이 켜집니다. 상단 바 아이콘은 `skyIcon`" 을 알린다.

---

## Self-Review

- 스펙 §5.5: 06–09 복숭아 / 09–17 하늘색 / 17–19 분홍·보라 / 19–06 남색, 경계 30분 보간 → Task 1(`skyAt` 테스트: 구간 가운데·경계 반반·앞뒤 15분·자정 감기). 배경·안개·해 방향·세기·반구광 → Task 3. 밤 창문(사람 있는 층만)·가로등 → Task 2·3.
- 스펙 §5.6: 그림자는 해 하나(밤에는 달 방향으로 같은 빛), 풀·꽃·보도블록·나무·가구 인스턴싱(hm#1~#3) 재확인, 테이블 인스턴싱 추가, 캡슐 30개 기준 측정·60 fps 확인 절차 → Task 4. 그림자 맵 2048·범위 ±30 → Task 3 `Lights`.
- `CampusProps.now`로 분마다 갱신(`Math.floor(kstMinutes(now))` 메모) → Task 3.
- 플레이스홀더 없음. 코드·diff는 임시 프로젝트에서 검사를 통과한 그대로다.
- 이름·타입: `CampusProps`·`FloorKey`·`kstMinutes`는 cw#1 계약 그대로. hm#2의 `Building` 재질 구조(면 × 층 유리)를 그대로 쓴다.
