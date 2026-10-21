# [hm#1] 캠퍼스 바깥 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**담당:** 박효민 · 브랜치 `hm` · 웨이브 1 · 선행 cw#1

**Goal:** cw#1의 임시 `Campus`(잔디 평면 + 건물 상자)를 같은 이름·경로·props로, 50×50 m 둥근 디오라마 판(흙 단면) 위에 경로 그래프를 따라 깐 보도블록 길·원형 광장, 풀잎, 로우폴리 나무(벚꽃·연두), 꽃밭, 연못(돌 테두리·연잎, 충돌체와 같은 자리), 정문 아치와 "4thIS 캠퍼스" 간판, 정문 옆 게시판, KayKit 벤치·가로등·덤불·쓰레기통(파스텔화)이 있는 캠퍼스 바깥으로 바꾸고, `?dev=campus` 미리보기 페이지를 만든다. 건물 자리는 아직 반투명 상자다(hm#2·hm#3에서 교체).

**Architecture:** 배치 계산(길 선분, 보도블록 위치, 풀 흩뿌리기, 가로등 자리, 문 위치, 파스텔 색)은 모두 `apps/web/src/world/campus/`의 순수 함수로 빼서 vitest로 검사하고, 컴포넌트는 그 결과를 InstancedMesh에 넣기만 한다. 모델은 `assets.ts` 목록 + `models.tsx`의 `<Model name items>` 하나로 불러온다: drei `useGLTF`로 읽고, 메시 조각마다 InstancedMesh 1개(드로우콜 1개)로 여러 자리에 그린다. 로딩 실패는 ErrorBoundary가 잡아 같은 자리에 상자를 그린다. 분위기는 브레인스토밍 프로토타입(`docs/prototype/preview-3d.html`)의 디오라마 판·풀잎·보도블록·꽃·연못·정문·파스텔화 함수를 R3F로 옮긴 것이다.

**Tech Stack:** React 19.3 · three 0.186 (`RoundedBoxGeometry`) · @react-three/fiber 9 · @react-three/drei 10 (`useGLTF`, `OrbitControls`) · vitest 5 · KayKit City Builder Bits 1.0 (CC0)

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
  - 판은 50×50(`BOARD_HALF = 25`), 잔디 윗면이 y = 0이다. 보도블록 윗면은 약 0.07 m.
  - 정문 아치는 `GATE_Z = 23.2`. 그래서 `CAMPUS.gateSpawn`을 판 밖 `[0, 26]`에서 판 안 `[0, 24.5]`로 옮긴다(값만 바꿈, 구조 그대로). cw#2 placement는 `CAMPUS.gateSpawn`을 참조하므로 따로 고칠 것이 없다.
  - 게시판은 **모델만** `CAMPUS.boardPos`에 놓는다. 클릭은 cw가 같은 자리에 두는 투명 클릭 영역(`BoardHotspot`, cw#4)이 받으므로 `Campus`에 게시판 콜백 prop은 없다.
  - `rand01`은 cw#2에서 내부 섞기가 바뀔 수 있다. hm 테스트는 `rand01`의 특정 값에 기대지 않는다(흩뿌리기는 `hashString` 기반 `seededRandom`, 나머지 `rand01`은 화면 꾸밈에만 쓴다).
  - KayKit 텍스처는 캔버스에서 채도 35% 낮추고 (255,238,245)와 50% 섞는다. Kenney(hm#2부터)는 텍스처가 없어서 재질 색에 같은 식을 쓴다.
  - 전역 gitignore가 `*.bin`을 막는 PC가 있어서 `apps/web/public/assets/.gitignore`에 `!*.bin`을 둔다(glTF 버퍼가 빠지면 모델이 안 뜬다).

## File Structure

```
apps/web/public/assets/
├─ .gitignore                 !*.bin (전역 gitignore 무시)
└─ kaykit/                    bench·streetlight·bush·trash_A (.gltf + .bin), citybits_texture.png
CREDITS.md                    에셋 출처
packages/shared/src/campus/
├─ data.ts                    (수정) gateSpawn [0, 24.5]
├─ validate.ts                (수정) gateSpawn·boardPos도 캠퍼스 안인지 검사
└─ validate.test.ts           (수정) 테스트 1개 추가
apps/web/src/world/campus/
├─ pastel.ts / pastel.test.ts       파스텔 색 계산 (pastelRgb·pastelizePixels·pastelHex·mixHex)
├─ assets.ts / assets.test.ts       모델 목록 MODELS (경로·배율·대체 상자·앉는 면), SEAT_HEIGHT
├─ models.tsx                       <Model name items> (useGLTF + InstancedMesh + 파스텔 재질 + 실패 시 상자)
├─ layout.ts / layout.test.ts       바깥 배치 순수 함수·상수 (길·보도블록·풀·가로등·문·나무·꽃밭·덤불)
├─ Ground.tsx                       둥근 디오라마 판 3겹
├─ Paths.tsx                        보도블록 InstancedMesh + 원형 광장
├─ Grass.tsx                        풀잎 InstancedMesh
├─ Trees.tsx                        나무 (줄기·잎 InstancedMesh)
├─ Flowers.tsx                      꽃밭 (줄기·꽃송이 InstancedMesh)
├─ Pond.tsx                         연못 (물·돌·연잎)
├─ signTexture.ts                   CanvasTexture 글자판
├─ Gate.tsx                         정문 아치 + 간판
├─ NoticeBoard.tsx                  게시판 모델
├─ OutdoorProps.tsx                 KayKit 벤치·가로등·덤불·쓰레기통
├─ Lights.tsx                       임시 조명 (hm#4에서 하늘로 교체)
├─ BuildingBoxes.tsx                건물 자리 임시 상자 (hm#2·#3에서 제거)
└─ Campus.tsx                       (교체) 전체 조립
apps/web/src/dev/campus/CampusPreview.tsx  (교체) ?dev=campus
```

---

### Task 1: 에셋 내려받기·출처·파스텔 색 계산

**Files:**
- Create: `apps/web/public/assets/.gitignore`, `apps/web/public/assets/kaykit/*` (9개 파일), `CREDITS.md`, `apps/web/src/world/campus/pastel.ts`, `apps/web/src/world/campus/assets.ts`
- Test: `apps/web/src/world/campus/pastel.test.ts`, `apps/web/src/world/campus/assets.test.ts`

**Interfaces:**
- Produces:
  - `pastelRgb(r, g, b): [r, g, b]` (0~255, 소수 포함), `pastelizePixels(data: Uint8ClampedArray): void`(알파 유지), `pastelHex(hex: string): string`, `mixHex(a: string, b: string, t: number): string`, 상수 `PASTEL_DESATURATE = 0.35`, `PASTEL_MIX = 0.5`, `PASTEL_CREAM = [255, 238, 245]`
  - `SEAT_HEIGHT = 0.45`, `interface ModelSpec { url; scale; yaw; box: [w, h, d]; textured: boolean; tint?: string; seatRaw?: number }`, `MODELS` (`bench`·`streetlight`·`bush`·`trash`), `type ModelName = keyof typeof MODELS`
  - 정적 파일 `/assets/kaykit/{bench,streetlight,bush,trash_A}.gltf`

- [x] **Step 1: 브랜치 준비**

```bash
git fetch origin && git checkout hm && git merge origin/main
```

- [x] **Step 2: KayKit 파일 내려받기 (새 빈 폴더에)**

커밋을 고정해서 받는다. 받은 파일은 신뢰하지 않는 데이터이므로 레포 밖 빈 폴더에 받고, 확인한 뒤 쓰는 파일만 복사한다.

```bash
DL=$(mktemp -d)   # 새 빈 폴더
R=https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0/63976910ca04d16f0fc531b9c614244be8128713
for f in bench.gltf bench.bin streetlight.gltf streetlight.bin bush.gltf bush.bin trash_A.gltf trash_A.bin citybits_texture.png; do
  curl -fsSL -o "$DL/$f" "$R/addons/kaykit_city_builder_bits/Assets/gltf/$f"
done
curl -fsSL -o "$DL/LICENSE.txt" "$R/LICENSE.txt"
head -12 "$DL/LICENSE.txt"     # "License: (Creative Commons Zero, CC0)" 확인
ls -l "$DL"                    # 10개 파일
mkdir -p apps/web/public/assets/kaykit
cp "$DL"/{bench,streetlight,bush,trash_A}.{gltf,bin} "$DL"/citybits_texture.png apps/web/public/assets/kaykit/
```

Expected: `apps/web/public/assets/kaykit/`에 9개 파일(`.gltf` 4, `.bin` 4, `citybits_texture.png`). 각 `.gltf`는 같은 폴더의 `.bin`과 `citybits_texture.png`를 상대 경로로 부른다.

- [x] **Step 3: `.bin`이 커밋되게 하고 출처 남기기**

`apps/web/public/assets/.gitignore`:
```text
# 전역 gitignore가 *.bin을 막아도 glTF 버퍼(.bin)는 꼭 커밋한다
!*.bin
```

`CREDITS.md`:
```markdown
# 에셋 출처 (CREDITS)

4thIS-world의 3D 소품은 아래 CC0(퍼블릭 도메인) 에셋을 쓴다. 출처 표기는 의무가 아니지만 감사의 뜻으로 남긴다.
원본 색은 불러올 때 파스텔로 바꾼다(`apps/web/src/world/campus/pastel.ts`). 파일 자체는 고치지 않았다.

| 팩                           | 만든 사람                          | 라이선스 | 받은 곳                                                                                                                                                              | 쓰는 파일 (`apps/web/public/assets/`)                                                                                   |
| ---------------------------- | ---------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| KayKit City Builder Bits 1.0 | Kay Lousberg (www.kaylousberg.com) | CC0 1.0  | https://github.com/KayKit-Game-Assets/KayKit-City-Builder-Bits-1.0 (커밋 `63976910ca04d16f0fc531b9c614244be8128713`, `addons/kaykit_city_builder_bits/Assets/gltf/`) | `kaykit/bench`, `kaykit/streetlight`, `kaykit/bush`, `kaykit/trash_A` (`.gltf` + `.bin`), `kaykit/citybits_texture.png` |

나머지(지형·길·풀·나무·꽃·연못·정문·게시판·건물·칠판·교탁·배식대)는 코드로 만든다.

- CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/
```

Run: `git add -n apps/web/public/assets`
Expected: `bench.bin` 등 `.bin` 4개가 목록에 있다(전역 gitignore가 `*.bin`을 막아도 이 파일이 되살린다).

- [x] **Step 4: 실패하는 테스트 작성**

`apps/web/src/world/campus/pastel.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { mixHex, pastelHex, pastelizePixels, pastelRgb } from './pastel';

describe('pastelRgb', () => {
  it('빨강은 채도가 빠지고 크림빛과 반씩 섞인다', () => {
    const [r, g, b] = pastelRgb(255, 0, 0);
    expect(r).toBeCloseTo(223.718, 2);
    expect(g).toBeCloseTo(132.343, 2);
    expect(b).toBeCloseTo(135.843, 2);
  });

  it('흰색은 크림빛 쪽으로, 검정은 중간 회색 쪽으로 간다', () => {
    expect(pastelRgb(255, 255, 255)).toEqual([255, 246.5, 250]);
    expect(pastelRgb(0, 0, 0)).toEqual([127.5, 119, 122.5]);
  });
});

describe('pastelizePixels', () => {
  it('RGB만 바꾸고 알파는 그대로 둔다', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 128, 0, 0, 0, 255]);
    pastelizePixels(data);
    expect(Array.from(data)).toEqual([224, 132, 136, 128, 128, 119, 122, 255]);
  });
});

describe('pastelHex', () => {
  it('#rrggbb를 파스텔 #rrggbb로 바꾼다', () => {
    expect(pastelHex('#ff0000')).toBe('#e08488');
    expect(pastelHex('#ffffff')).toBe('#fff7fa');
    expect(pastelHex('000000')).toBe('#80777b');
  });
});

describe('mixHex', () => {
  it('t=0이면 a, t=1이면 b, 0.5면 중간', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ff8040', 0.5)).toBe('#804020');
  });
});
```

`apps/web/src/world/campus/assets.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { MODELS, SEAT_HEIGHT, type ModelSpec } from './assets';

describe('MODELS', () => {
  it('앉는 모델(벤치·의자)은 앉는 면이 SEAT_HEIGHT(0.45 m)에 온다', () => {
    const seats = Object.entries(MODELS as Record<string, ModelSpec>).filter(([, m]) => m.seatRaw);
    expect(seats.length).toBeGreaterThan(0);
    for (const [, m] of seats) expect(m.seatRaw! * m.scale).toBeCloseTo(SEAT_HEIGHT);
  });

  it('파일 경로는 /assets/kaykit 또는 /assets/kenney 아래에 있다', () => {
    for (const m of Object.values(MODELS as Record<string, ModelSpec>)) {
      expect(m.url).toMatch(/^\/assets\/(kaykit\/[\w]+\.gltf|kenney\/[\w]+\.glb)$/);
    }
  });
});
```

- [x] **Step 5: 실패 확인**

Run: `npm test -w @4this/web`
Expected: FAIL — `Failed to resolve import "./pastel"` / `"./assets"`

- [x] **Step 6: 구현**

프로토타입 `pastelTexture`의 픽셀 식을 그대로 옮긴다(밝기 l = 0.299r + 0.587g + 0.114b 쪽으로 35% 당긴 뒤 크림빛과 반씩).

`apps/web/src/world/campus/pastel.ts`:
```ts
/**
 * 원색 에셋을 파스텔로 바꾸는 순수 함수 (설계 문서 §5.4).
 * 채도를 35% 낮추고(밝기 쪽으로 당기기) 크림빛 (255, 238, 245)과 50% 섞는다.
 */

export const PASTEL_DESATURATE = 0.35;
export const PASTEL_MIX = 0.5;
export const PASTEL_CREAM = [255, 238, 245] as const;

export type Rgb = [r: number, g: number, b: number];

/** 0~255 RGB → 파스텔 RGB (소수 포함, 0~255) */
export function pastelRgb(r: number, g: number, b: number): Rgb {
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  const dr = r + (l - r) * PASTEL_DESATURATE;
  const dg = g + (l - g) * PASTEL_DESATURATE;
  const db = b + (l - b) * PASTEL_DESATURATE;
  return [
    dr + (PASTEL_CREAM[0] - dr) * PASTEL_MIX,
    dg + (PASTEL_CREAM[1] - dg) * PASTEL_MIX,
    db + (PASTEL_CREAM[2] - db) * PASTEL_MIX,
  ];
}

/** RGBA 픽셀 배열(캔버스 ImageData.data)을 그 자리에서 파스텔로 바꾼다. 알파는 그대로 둔다 */
export function pastelizePixels(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = pastelRgb(data[i]!, data[i + 1]!, data[i + 2]!);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

const toHex2 = (v: number) =>
  Math.round(Math.min(255, Math.max(0, v)))
    .toString(16)
    .padStart(2, '0');

/** '#rrggbb' → 파스텔 '#rrggbb'. Kenney 모델처럼 재질 색만 있는 경우에 쓴다 */
export function pastelHex(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = pastelRgb((n >> 16) & 255, (n >> 8) & 255, n & 255);
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
}

/** 두 '#rrggbb' 색을 t(0~1)로 섞는다 */
export function mixHex(a: string, b: string, t: number): string {
  const na = Number.parseInt(a.replace('#', ''), 16);
  const nb = Number.parseInt(b.replace('#', ''), 16);
  const ch = (shift: number) => {
    const va = (na >> shift) & 255;
    const vb = (nb >> shift) & 255;
    return toHex2(va + (vb - va) * t);
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}
```

`bench`의 앉는 면은 원본 높이 0.1이라 배율 `SEAT_HEIGHT / 0.1 = 4.5`가 된다. 대체 상자 크기는 원본 바운딩 박스 × 배율이다.

`apps/web/src/world/campus/assets.ts`:
```ts
/**
 * 3D 모델 목록. 파일은 apps/web/public/assets/ 에 있다 (CREDITS.md 참고).
 * - scale: 원본 크기에 곱하는 배율 (Kenney는 모두 KENNEY_SCALE)
 * - yaw: 모델 앞면이 +z(facing 0)를 보도록 더하는 회전 (라디안)
 * - box: 로딩 실패 때 대신 그리는 상자 크기 [가로 x, 높이 y, 깊이 z] (m, 배율 적용 후)
 * - seatRaw: 앉는 면 높이 (원본 단위). 앉는 모델은 seatRaw × scale = SEAT_HEIGHT가 되게 배율을 정한다
 */

/** 캐릭터(th)가 앉을 때 엉덩이 높이. 벤치·의자의 앉는 면을 여기에 맞춘다 (m) */
export const SEAT_HEIGHT = 0.45;

export interface ModelSpec {
  url: string;
  scale: number;
  yaw: number;
  box: readonly [w: number, h: number, d: number];
  /** KayKit처럼 공용 텍스처를 쓰는 모델이면 true (텍스처를 파스텔화), 아니면 재질 색을 파스텔화 */
  textured: boolean;
  /** 파스텔화한 뒤 곱할 색 (덤불을 더 초록으로 등). 없으면 흰색 */
  tint?: string;
  seatRaw?: number;
}

const kaykit = (
  file: string,
  scale: number,
  box: ModelSpec['box'],
  extra: Partial<ModelSpec> = {},
): ModelSpec => ({
  url: `/assets/kaykit/${file}.gltf`,
  scale,
  yaw: 0,
  box,
  textured: true,
  ...extra,
});

export const MODELS = {
  // 앉는 면(원본 0.1)이 SEAT_HEIGHT가 되는 배율 4.5
  bench: kaykit('bench', SEAT_HEIGHT / 0.1, [1.8, 0.45, 0.68], { seatRaw: 0.1 }),
  streetlight: kaykit('streetlight', 3.8, [1, 3.65, 0.27]),
  bush: kaykit('bush', 3.4, [0.65, 1.3, 0.68], { tint: '#d4f2c8' }),
  trash: kaykit('trash_A', 5, [0.64, 0.26, 0.67]),
} satisfies Record<string, ModelSpec>;

export type ModelName = keyof typeof MODELS;
```

- [x] **Step 7: 통과 확인**

Run: `npm test -w @4this/web`
Expected: PASS — pastel 5개, assets 2개 (cw#1의 5개 포함 12개)

- [x] **Step 8: 커밋**

```bash
git add apps/web/public/assets CREDITS.md apps/web/src/world/campus/pastel.ts apps/web/src/world/campus/pastel.test.ts apps/web/src/world/campus/assets.ts apps/web/src/world/campus/assets.test.ts
git commit -m "feat: KayKit 바깥 소품 에셋과 파스텔 색 계산"
```

---

### Task 2: 바깥 배치 계산 (길·보도블록·풀·가로등·문·꾸밈 자리)

**Files:**
- Create: `apps/web/src/world/campus/layout.ts`
- Modify: `packages/shared/src/campus/data.ts`, `packages/shared/src/campus/validate.ts`
- Test: `apps/web/src/world/campus/layout.test.ts`, `packages/shared/src/campus/validate.test.ts`

**Interfaces:**
- Consumes: `CAMPUS`, `Campus`, `Building`, `Vec2`, `hashString` (`@4this/shared`)
- Produces (`layout.ts`):
  - 상수 `BOARD_HALF = 25`, `BOARD_CORNER = 3`, `MAIN_ROAD_WIDTH = 3.2`, `PATH_WIDTH = 2.2`, `PAVER_STEP = 0.62`, `PLAZA = { center: [0, 3], r: 3.8 }`, `GATE_Z = 23.2`
  - `seededRandom(seed: string): () => number` (mulberry32)
  - `type WallSide = 'n' | 's' | 'e' | 'w'`, `WALL_NORMALS: Record<WallSide, Vec2>`, `interface DoorInfo { pos: Vec2; side: WallSide }`, `doorPoint(b: Pick<Building, 'min' | 'max'>, node: Vec2): DoorInfo`
  - `interface PathSeg { a; b; width }`, `pathSegments(c: Campus): PathSeg[]`, `distToSegment(p, a, b)`, `onPath(p, segs, margin?)`, `inBuilding(p, c, margin?)`, `inPond(p, c, margin?)`, `pondCircle(c): { center; r }`, `onBoard(p, inset?)`
  - `interface Paver { x; z; rot; shade }`, `paverTiles(segs, c): Paver[]`
  - `interface Blade { x; z; rotY; tiltX; tiltZ; scale; shade }`, `scatterGrass(c, segs, tries, seed?): Blade[]`, `scatterInDisc(center, r, n, seed): Vec2[]`
  - `interface LampSpot { pos: Vec2; rotY: number }`, `lampSpots(segs, c, spacing = 5.5): LampSpot[]` (KayKit 가로등 팔 = 모델 -x가 길 쪽)
  - `type TreeKind = 'cherry' | 'green'`, `TREES: TreeSpot[]`, `FLOWER_BEDS: FlowerBed[]`, `BUSHES: Vec2[]`, `TRASH_CANS: Vec2[]`

- [x] **Step 1: 실패하는 테스트 작성**

`apps/web/src/world/campus/layout.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { CAMPUS, type Vec2 } from '@4this/shared';
import {
  BUSHES,
  doorPoint,
  FLOWER_BEDS,
  inBuilding,
  inPond,
  lampSpots,
  onBoard,
  onPath,
  pathSegments,
  pondCircle,
  paverTiles,
  scatterGrass,
  scatterInDisc,
  seededRandom,
  TRASH_CANS,
  TREES,
} from './layout';

const segs = pathSegments(CAMPUS);

describe('doorPoint', () => {
  it('문 노드에 가장 가까운 벽에 문을 낸다', () => {
    const b = CAMPUS.buildings;
    expect(doorPoint(b.eng, CAMPUS.graph.nodes['eng-door']!)).toEqual({ side: 'w', pos: [12, -2] });
    expect(doorPoint(b.main, CAMPUS.graph.nodes['main-door']!)).toEqual({
      side: 's',
      pos: [0, -11],
    });
    expect(doorPoint(b.lab, CAMPUS.graph.nodes['lab-door']!)).toEqual({
      side: 's',
      pos: [-15, -11],
    });
    expect(doorPoint(b.cafe, CAMPUS.graph.nodes['cafe-door']!)).toEqual({
      side: 'e',
      pos: [-12, 10],
    });
  });

  it('모서리 근처면 벽 안쪽으로 당긴다', () => {
    expect(doorPoint({ min: [0, 0], max: [4, 4] }, [10, 3.9])).toEqual({
      side: 'e',
      pos: [4, 2.8],
    });
  });
});

describe('pondCircle', () => {
  it('연못은 원 충돌체와 같은 자리·크기다', () => {
    expect(pondCircle(CAMPUS)).toEqual({ center: [-15, 0], r: 3.5 });
  });
});

describe('pathSegments', () => {
  it('간선마다 길 하나 + 건물 4개 문 + 정문 밖', () => {
    expect(segs).toHaveLength(CAMPUS.graph.edges.length + 4 + 1);
  });

  it('모든 그래프 노드는 길 위에 있다', () => {
    for (const p of Object.values(CAMPUS.graph.nodes)) expect(onPath(p, segs)).toBe(true);
  });
});

describe('paverTiles', () => {
  const tiles = paverTiles(segs, CAMPUS);

  it('충분히 많이 깔리고, 서로 0.42 m보다 가깝게 겹치지 않는다', () => {
    expect(tiles.length).toBeGreaterThan(500);
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        const d = Math.hypot(tiles[i]!.x - tiles[j]!.x, tiles[i]!.z - tiles[j]!.z);
        expect(d).toBeGreaterThanOrEqual(0.42);
      }
    }
  });

  it('건물 안이나 판 밖에는 없다', () => {
    for (const t of tiles) {
      expect(inBuilding([t.x, t.z], CAMPUS, -0.05)).toBe(false);
      expect(onBoard([t.x, t.z], 0.4)).toBe(true);
    }
  });

  it('같은 입력이면 같은 결과', () => {
    expect(paverTiles(segs, CAMPUS)).toEqual(tiles);
  });
});

describe('seededRandom', () => {
  it('같은 seed면 같은 수열, [0, 1) 범위, 고르게 퍼진다', () => {
    const a = seededRandom('x');
    const b = seededRandom('x');
    const xs = Array.from({ length: 2000 }, () => a());
    expect(Array.from({ length: 2000 }, () => b())).toEqual(xs);
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThan(1);
    // 10칸 히스토그램이 각각 150~250개 (치우침 없음)
    const bins = Array.from({ length: 10 }, (_, k) => xs.filter((v) => Math.floor(v * 10) === k));
    for (const bin of bins) expect(bin.length).toBeGreaterThan(150);
    for (const bin of bins) expect(bin.length).toBeLessThan(250);
  });
});

describe('scatterInDisc', () => {
  it('모든 점이 원 안에 있고, 사분면마다 고르게 있다', () => {
    const pts = scatterInDisc([2, 3], 1.5, 400, 'bed');
    for (const p of pts) expect(Math.hypot(p[0] - 2, p[1] - 3)).toBeLessThanOrEqual(1.5);
    const quad = [0, 0, 0, 0];
    for (const p of pts) quad[(p[0] > 2 ? 1 : 0) + (p[1] > 3 ? 2 : 0)]! += 1;
    for (const q of quad) expect(q).toBeGreaterThan(70);
  });
});

describe('scatterGrass', () => {
  const blades = scatterGrass(CAMPUS, segs, 3000);

  it('길·건물·연못을 피하고 결정적이다', () => {
    expect(blades.length).toBeGreaterThan(1500);
    for (const b of blades) {
      const p: Vec2 = [b.x, b.z];
      expect(onPath(p, segs, 0.2)).toBe(false);
      expect(inBuilding(p, CAMPUS, 0.3)).toBe(false);
      expect(inPond(p, CAMPUS, 0.4)).toBe(false);
    }
    expect(scatterGrass(CAMPUS, segs, 3000)).toEqual(blades);
  });
});

describe('lampSpots', () => {
  const lamps = lampSpots(segs, CAMPUS);

  it('길 옆(길 위는 아님)에 4 m 이상 떨어져 놓인다', () => {
    expect(lamps.length).toBeGreaterThanOrEqual(8);
    for (const l of lamps) {
      expect(onPath(l.pos, segs, 0.25)).toBe(false);
      expect(onPath(l.pos, segs, 1.2)).toBe(true);
      expect(inBuilding(l.pos, CAMPUS, 0.8)).toBe(false);
    }
    for (let i = 0; i < lamps.length; i++) {
      for (let j = i + 1; j < lamps.length; j++) {
        const d = Math.hypot(
          lamps[i]!.pos[0] - lamps[j]!.pos[0],
          lamps[i]!.pos[1] - lamps[j]!.pos[1],
        );
        expect(d).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it('팔(모델 -x)이 길 쪽을 본다', () => {
    for (const l of lamps) {
      const arm: Vec2 = [l.pos[0] - Math.cos(l.rotY) * 1, l.pos[1] + Math.sin(l.rotY) * 1];
      expect(onPath(arm, segs, 0.25)).toBe(true);
    }
  });
});

describe('꾸밈 배치', () => {
  it('나무는 길·건물·연못과 겹치지 않고 판 안에 있다', () => {
    for (const t of TREES) {
      expect(onPath(t.pos, segs, 1.1 * t.scale)).toBe(false);
      expect(inBuilding(t.pos, CAMPUS, 1.2 * t.scale)).toBe(false);
      expect(inPond(t.pos, CAMPUS, 1)).toBe(false);
      expect(onBoard(t.pos, 1.2)).toBe(true);
      for (const s of [...CAMPUS.parkSpots, ...CAMPUS.benchSpots]) {
        expect(Math.hypot(s.pos[0] - t.pos[0], s.pos[1] - t.pos[1])).toBeGreaterThan(1.5);
      }
    }
  });

  it('꽃밭·덤불·쓰레기통은 길·건물·연못 밖에 있다', () => {
    for (const f of FLOWER_BEDS) {
      expect(onPath(f.center, segs, f.r)).toBe(false);
      expect(inBuilding(f.center, CAMPUS, f.r)).toBe(false);
      expect(inPond(f.center, CAMPUS, f.r)).toBe(false);
    }
    for (const p of [...BUSHES, ...TRASH_CANS]) {
      expect(onPath(p, segs, 0.3)).toBe(false);
      expect(inBuilding(p, CAMPUS, 0.3)).toBe(false);
      expect(inPond(p, CAMPUS, 0.3)).toBe(false);
    }
  });

  it('벤치 자리(benchSpots)는 길·연못과 겹치지 않는다', () => {
    for (const s of CAMPUS.benchSpots) {
      expect(inPond(s.pos, CAMPUS, 0.5)).toBe(false);
      expect(onPath(s.pos, segs, 0.4)).toBe(false);
    }
  });
});
```

`packages/shared/src/campus/validate.test.ts` (바뀐 부분):
```diff
--- a/packages/shared/src/campus/validate.test.ts
+++ b/packages/shared/src/campus/validate.test.ts
@@ -18,4 +18,8 @@ describe('validateCampus', () => {
     expect(errors).toContain('노드 island: 정문에서 닿지 않음');
     expect(errors).toContain('cafe: 좌석 0개 < 8');
   });
+
+  it('정문 등장 지점이 판(캠퍼스) 밖이면 잡아낸다', () => {
+    expect(validateCampus({ ...CAMPUS, gateSpawn: [0, 26] })).toContain('gateSpawn: 캠퍼스 밖');
+  });
 });
```

- [x] **Step 2: 실패 확인**

Run: `npm test -w @4this/web; npm test -w @4this/shared`
Expected: web FAIL — `Failed to resolve import "./layout"`; shared FAIL — `expected [] to include 'gateSpawn: 캠퍼스 밖'`

- [x] **Step 3: 구현**

`rand01(seed, i, 'x')`처럼 비슷한 문자열을 연달아 해시하면 점이 줄지어 생긴다(직접 그려 보면 풀이 대각선 줄로 몰린다). 그래서 흩뿌리기는 seed 하나로 만든 수열 `seededRandom`을 쓴다. 나무·꽃밭·덤불 자리는 테스트가 "길·건물·연못·공원 산책 지점과 겹치지 않음"을 지키도록 고른 값이다.

`apps/web/src/world/campus/layout.ts`:
```ts
import { hashString, type Building, type Campus, type Vec2 } from '@4this/shared';

/**
 * 캠퍼스 바깥 배치 계산 (순수 함수). 컴포넌트는 이 결과만 그린다.
 * 좌표계는 shared/campus와 같다: +x 동쪽, +z 남쪽(정문), 바닥 y = 0.
 */

/** 디오라마 판 반 크기 (판 50×50) */
export const BOARD_HALF = 25;
/** 판 모서리 둥글기 */
export const BOARD_CORNER = 3;
/** 정문 큰길 폭 */
export const MAIN_ROAD_WIDTH = 3.2;
/** 나머지 길 폭 */
export const PATH_WIDTH = 2.2;
/** 보도블록 한 칸 간격 */
export const PAVER_STEP = 0.62;
/** 원형 광장 */
export const PLAZA: { center: Vec2; r: number } = { center: [0, 3], r: 3.8 };
/** 정문 아치의 z 위치 (gate 노드 바로 남쪽) */
export const GATE_Z = 23.2;

/**
 * 문자열 seed로 만드는 결정적 난수열 (mulberry32). rand01(seed, i)를 연달아 부르면
 * 비슷한 문자열끼리 값이 엮여 점들이 줄지어 생기므로, 흩뿌리기는 이것을 쓴다.
 */
export function seededRandom(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type WallSide = 'n' | 's' | 'e' | 'w';

/** 벽 바깥 법선 (x, z) */
export const WALL_NORMALS: Record<WallSide, Vec2> = {
  n: [0, -1],
  s: [0, 1],
  e: [1, 0],
  w: [-1, 0],
};

export interface DoorInfo {
  /** 벽 위의 문 중심 */
  pos: Vec2;
  side: WallSide;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 문 노드에서 가장 가까운 벽(노드가 바깥에 있는 쪽)의 문 위치 */
export function doorPoint(b: Pick<Building, 'min' | 'max'>, node: Vec2): DoorInfo {
  const [x, z] = node;
  const out: [WallSide, number][] = [
    ['w', b.min[0] - x],
    ['e', x - b.max[0]],
    ['n', b.min[1] - z],
    ['s', z - b.max[1]],
  ];
  out.sort((p, q) => q[1] - p[1]);
  const side = out[0]![0];
  const m = 1.2; // 모서리에서 떨어뜨리기
  if (side === 'w' || side === 'e') {
    return {
      side,
      pos: [side === 'w' ? b.min[0] : b.max[0], clamp(z, b.min[1] + m, b.max[1] - m)],
    };
  }
  return { side, pos: [clamp(x, b.min[0] + m, b.max[0] - m), side === 'n' ? b.min[1] : b.max[1]] };
}

export interface PathSeg {
  a: Vec2;
  b: Vec2;
  width: number;
}

/** 경로 그래프 간선 + 문까지 이어지는 짧은 길 + 정문 밖으로 나가는 길 */
export function pathSegments(c: Campus): PathSeg[] {
  const nodes = c.graph.nodes;
  const mainRoad = new Set([
    `${c.gateNode}|south`,
    `south|${c.gateNode}`,
    'south|plaza',
    'plaza|south',
  ]);
  const segs: PathSeg[] = c.graph.edges.map(([a, b]) => ({
    a: nodes[a]!,
    b: nodes[b]!,
    width: mainRoad.has(`${a}|${b}`) ? MAIN_ROAD_WIDTH : PATH_WIDTH,
  }));
  for (const b of Object.values(c.buildings)) {
    const node = nodes[b.doorNode]!;
    segs.push({ a: node, b: doorPoint(b, node).pos, width: PATH_WIDTH });
  }
  const gate = nodes[c.gateNode]!;
  segs.push({ a: gate, b: [gate[0], BOARD_HALF - 0.3], width: MAIN_ROAD_WIDTH });
  return segs;
}

/** 점과 선분 사이 거리 */
export function distToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  const t = len2 === 0 ? 0 : clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2, 0, 1);
  return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dz * t));
}

/** 길(또는 광장) 위인지. margin만큼 넓게 본다 */
export function onPath(p: Vec2, segs: readonly PathSeg[], margin = 0): boolean {
  if (Math.hypot(p[0] - PLAZA.center[0], p[1] - PLAZA.center[1]) <= PLAZA.r + margin) return true;
  return segs.some((s) => distToSegment(p, s.a, s.b) <= s.width / 2 + margin);
}

export function inBuilding(p: Vec2, c: Campus, margin = 0): boolean {
  return Object.values(c.buildings).some(
    (b) =>
      p[0] >= b.min[0] - margin &&
      p[0] <= b.max[0] + margin &&
      p[1] >= b.min[1] - margin &&
      p[1] <= b.max[1] + margin,
  );
}

/** 연못(원 충돌체) 안인지 */
export function inPond(p: Vec2, c: Campus, margin = 0): boolean {
  return c.colliders.some(
    (k) =>
      k.kind === 'circle' && Math.hypot(p[0] - k.center[0], p[1] - k.center[1]) <= k.r + margin,
  );
}

/** 연못 = 첫 번째 원 충돌체. 연못 모델은 이 원에 맞춰 그린다 */
export function pondCircle(c: Campus): { center: Vec2; r: number } {
  const k = c.colliders.find((x) => x.kind === 'circle');
  if (!k || k.kind !== 'circle') throw new Error('연못 충돌체(원)가 없습니다');
  return { center: k.center, r: k.r };
}

/** 둥근 사각형 판 안인지 (inset만큼 안쪽으로) */
export function onBoard(p: Vec2, inset = 0): boolean {
  const h = BOARD_HALF - inset;
  const r = Math.max(0, BOARD_CORNER - inset);
  const ax = Math.abs(p[0]);
  const az = Math.abs(p[1]);
  if (ax > h || az > h) return false;
  const cx = ax - (h - r);
  const cz = az - (h - r);
  if (cx > 0 && cz > 0) return Math.hypot(cx, cz) <= r;
  return true;
}

export interface Paver {
  x: number;
  z: number;
  rot: number;
  /** 0~2 보도블록 색 번호 */
  shade: number;
}

/** 길을 따라 보도블록 위치를 만든다. 광장·건물 안·이미 놓인 칸과 겹치는 것은 뺀다 */
export function paverTiles(segs: readonly PathSeg[], c: Campus): Paver[] {
  const out: Paver[] = [];
  const grid = new Map<string, Paver[]>();
  const cell = 0.5;
  const key = (x: number, z: number) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  const minGap = 0.42;
  const tooClose = (x: number, z: number) => {
    const gx = Math.floor(x / cell);
    const gz = Math.floor(z / cell);
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        for (const p of grid.get(`${gx + i},${gz + j}`) ?? []) {
          if (Math.hypot(p.x - x, p.z - z) < minGap) return true;
        }
      }
    }
    return false;
  };
  for (const s of segs) {
    const dx = s.b[0] - s.a[0];
    const dz = s.b[1] - s.a[1];
    const len = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.round(len / PAVER_STEP));
    const across = Math.max(1, Math.round(s.width / PAVER_STEP));
    const rot = Math.atan2(dx, dz);
    for (let i = 0; i <= steps; i++) {
      for (let j = 0; j < across; j++) {
        const t = i / steps;
        const off = (j - (across - 1) / 2) * PAVER_STEP + (i % 2 ? 0.15 : -0.15);
        const x = s.a[0] + dx * t + Math.cos(rot) * off;
        const z = s.a[1] + dz * t - Math.sin(rot) * off;
        const p: Vec2 = [x, z];
        if (Math.hypot(x - PLAZA.center[0], z - PLAZA.center[1]) < PLAZA.r - 0.2) continue;
        if (inBuilding(p, c, -0.05) || !onBoard(p, 0.4) || tooClose(x, z)) continue;
        const tile: Paver = { x, z, rot, shade: (i * 7 + j * 3) % 3 };
        out.push(tile);
        const k = key(x, z);
        grid.set(k, [...(grid.get(k) ?? []), tile]);
      }
    }
  }
  return out;
}

export interface Blade {
  x: number;
  z: number;
  rotY: number;
  tiltX: number;
  tiltZ: number;
  scale: number;
  /** 0~1 색 섞기 비율 */
  shade: number;
}

/** 풀잎 위치. 길·광장·건물·연못·판 가장자리는 피한다. 같은 seed면 항상 같은 결과 */
export function scatterGrass(
  c: Campus,
  segs: readonly PathSeg[],
  tries: number,
  seed = 'grass',
): Blade[] {
  const rand = seededRandom(seed);
  const out: Blade[] = [];
  for (let i = 0; i < tries; i++) {
    const x = (rand() - 0.5) * 2 * (BOARD_HALF - 0.8);
    const z = (rand() - 0.5) * 2 * (BOARD_HALF - 0.8);
    const blade: Blade = {
      x,
      z,
      rotY: rand() * Math.PI * 2,
      tiltX: (rand() - 0.5) * 0.4,
      tiltZ: (rand() - 0.5) * 0.4,
      scale: 0.7 + rand() * 0.6,
      shade: rand(),
    };
    const p: Vec2 = [x, z];
    if (!onBoard(p, 0.8) || onPath(p, segs, 0.2) || inBuilding(p, c, 0.3) || inPond(p, c, 0.4)) {
      continue;
    }
    out.push(blade);
  }
  return out;
}

/** 원 안에 고르게 흩뿌린 점 */
export function scatterInDisc(center: Vec2, r: number, n: number, seed: string): Vec2[] {
  const rand = seededRandom(seed);
  return Array.from({ length: n }, () => {
    const a = rand() * Math.PI * 2;
    const d = Math.sqrt(rand()) * r;
    return [center[0] + Math.cos(a) * d, center[1] + Math.sin(a) * d] as const;
  });
}

export interface LampSpot {
  pos: Vec2;
  /** 가로등 팔(모델의 -x 방향)이 길 쪽을 보게 하는 rotation.y */
  rotY: number;
}

/** 길 따라 가로등 자리. 긴 길에 spacing 간격으로 양쪽 번갈아 놓는다 */
export function lampSpots(segs: readonly PathSeg[], c: Campus, spacing = 5.5): LampSpot[] {
  const out: LampSpot[] = [];
  segs.forEach((s, si) => {
    const dx = s.b[0] - s.a[0];
    const dz = s.b[1] - s.a[1];
    const len = Math.hypot(dx, dz);
    if (len < spacing * 0.8) return;
    const n = Math.floor(len / spacing);
    const ux = dx / len;
    const uz = dz / len;
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) / n;
      const side = (k + si) % 2 === 0 ? 1 : -1;
      const off = s.width / 2 + 0.6;
      // 길 방향의 오른쪽 수직 (uz, -ux)
      const px = s.a[0] + dx * t + uz * off * side;
      const pz = s.a[1] + dz * t - ux * off * side;
      const pos: Vec2 = [px, pz];
      if (onPath(pos, segs, 0.25) || inBuilding(pos, c, 0.8) || inPond(pos, c, 0.8)) continue;
      if (!onBoard(pos, 1) || out.some((l) => Math.hypot(l.pos[0] - px, l.pos[1] - pz) < 4)) {
        continue;
      }
      // 길 쪽 방향 (-uz, ux) * side
      const tx = -uz * side;
      const tz = ux * side;
      out.push({ pos, rotY: Math.atan2(tz, -tx) });
    }
  });
  return out;
}

export type TreeKind = 'cherry' | 'green';

export interface TreeSpot {
  pos: Vec2;
  scale: number;
  kind: TreeKind;
}

/** 나무 자리 (공원·건물 사이·판 가장자리) */
export const TREES: TreeSpot[] = [
  { pos: [-22, -6], scale: 1.3, kind: 'green' },
  { pos: [-22.5, 4], scale: 1.1, kind: 'cherry' },
  { pos: [-6.5, 13], scale: 0.9, kind: 'cherry' },
  { pos: [-6.5, -7.5], scale: 1.0, kind: 'cherry' },
  { pos: [-3.5, -6.5], scale: 0.9, kind: 'green' },
  { pos: [-9.8, 6.5], scale: 1.0, kind: 'green' },
  { pos: [-3.5, 8], scale: 0.9, kind: 'cherry' },
  { pos: [4.5, 8.5], scale: 1.0, kind: 'cherry' },
  { pos: [7.5, 4.5], scale: 0.85, kind: 'green' },
  { pos: [8, -6.5], scale: 1.1, kind: 'green' },
  { pos: [10, -12], scale: 1.0, kind: 'cherry' },
  { pos: [22.5, -14], scale: 1.2, kind: 'green' },
  { pos: [22.5, 9], scale: 1.0, kind: 'cherry' },
  { pos: [15, 10], scale: 1.1, kind: 'green' },
  { pos: [9, 16], scale: 1.0, kind: 'cherry' },
  { pos: [-8, 17], scale: 1.1, kind: 'green' },
  { pos: [-17, 18], scale: 1.0, kind: 'cherry' },
  { pos: [-22, 15], scale: 1.2, kind: 'green' },
  { pos: [18, 20], scale: 1.0, kind: 'green' },
  { pos: [-22.5, -21], scale: 1.0, kind: 'cherry' },
  { pos: [-4.5, -22], scale: 0.9, kind: 'green' },
  { pos: [12, -21], scale: 1.1, kind: 'cherry' },
  { pos: [22, -22], scale: 0.9, kind: 'cherry' },
];

export interface FlowerBed {
  center: Vec2;
  r: number;
  count: number;
}

/** 꽃밭 (공원 연못 둘레, 광장 옆, 정문 옆) */
export const FLOWER_BEDS: FlowerBed[] = [
  { center: [-19.5, -3.5], r: 1.3, count: 45 },
  { center: [-19.5, 3.8], r: 1.2, count: 40 },
  { center: [-10.5, 3.2], r: 0.9, count: 26 },
  { center: [-10.6, -3.4], r: 0.9, count: 26 },
  { center: [4.5, 5.5], r: 1.0, count: 30 },
  { center: [-4.4, 5.6], r: 1.0, count: 30 },
  { center: [-4, 20.5], r: 1.2, count: 38 },
  { center: [6.5, 22.2], r: 0.9, count: 26 },
  { center: [9, -9.8], r: 0.9, count: 26 },
];

/** 덤불 (KayKit bush) */
export const BUSHES: Vec2[] = [
  [-2.6, 20.2],
  [2.6, 18],
  [-2.6, 16],
  [-8.6, -9.9],
  [-1.8, -9.6],
  [1.8, -9.6],
  [10.9, -4.4],
  [10.9, 0.4],
  [-13.3, -10.5],
  [-16.7, -10.5],
  [-10.6, 8],
  [-10.6, 12],
];

/** 쓰레기통 (KayKit trash_A) */
export const TRASH_CANS: Vec2[] = [
  [2.1, 12.5],
  [6.1, 1.8],
  [-13.2, -4.8],
];
```

정문 아치(`GATE_Z = 23.2`) 바로 바깥, 판 안쪽에서 캐릭터가 나타나게 한다:

`packages/shared/src/campus/data.ts` (바뀐 부분):
```diff
--- a/packages/shared/src/campus/data.ts
+++ b/packages/shared/src/campus/data.ts
@@ -170,7 +170,7 @@ export const CAMPUS: Campus = {
     ],
   },
   gateNode: 'gate',
-  gateSpawn: [0, 26],
+  gateSpawn: [0, 24.5],
   boardPos: [3.5, 21],
   parkNode: 'park',
   parkSpots: [
```

`packages/shared/src/campus/validate.ts` (바뀐 부분):
```diff
--- a/packages/shared/src/campus/validate.ts
+++ b/packages/shared/src/campus/validate.ts
@@ -68,6 +68,8 @@ export function validateCampus(c: Campus): string[] {
 
   const all: [string, Vec2][] = [
     ...Object.entries(nodes),
+    ['gateSpawn', c.gateSpawn],
+    ['boardPos', c.boardPos],
     ...c.parkSpots.map((s, i): [string, Vec2] => [`parkSpots[${i}]`, s.pos]),
     ...c.benchSpots.map((s, i): [string, Vec2] => [`benchSpots[${i}]`, s.pos]),
   ];
```

- [x] **Step 4: 통과 확인**

Run: `npm test -w @4this/web && npm test -w @4this/shared`
Expected: PASS — layout 16개, shared 24개(validate 3개)

- [x] **Step 5: 커밋**

```bash
git add apps/web/src/world/campus/layout.ts apps/web/src/world/campus/layout.test.ts packages/shared/src/campus
git commit -m "feat: 캠퍼스 바깥 배치 계산과 정문 등장 지점 조정"
```

---

### Task 3: 모델 불러오기 (`<Model>`: useGLTF + 인스턴싱 + 파스텔 + 실패 시 상자)

**Files:**
- Create: `apps/web/src/world/campus/models.tsx`

**Interfaces:**
- Consumes: `MODELS`, `ModelSpec`, `ModelName` (Task 1), `pastelHex`, `pastelizePixels` (Task 1)
- Produces:
  - `interface ModelItem { pos: readonly [x, y, z]; rotY: number; scale?: number }` — pos의 y는 바닥 높이(모델 바닥 가운데가 원점이 되게 맞춘다), rotY는 facing과 같은 뜻
  - `itemMatrix(item: ModelItem, out?: Matrix4): Matrix4`
  - `<Model name={ModelName} items={ModelItem[]} shadows?={boolean} />` — 같은 모델을 여러 자리에, 메시 조각마다 InstancedMesh 1개. 로딩 중에는 아무것도 안 그리고, 실패하면 `MODELS[name].box` 크기 상자
  - `FallbackBoxes`, `ModelBoundary`(ErrorBoundary)

순수 계산(배치)은 Task 2에서 테스트했다. 이 파일은 three·React 연결이라 typecheck와 Task 5의 화면 확인으로 검증한다.

- [ ] **Step 1: 구현**

KayKit 모델은 모두 같은 `citybits_texture.png`를 쓰므로, 파스텔 텍스처는 이미지별로 한 번만 만든다(WeakMap 캐시). glTF 장면은 바운딩 박스로 "바닥 가운데 = 원점"이 되게 옮긴 뒤 `yaw`·`scale`을 곱한다.

`apps/web/src/world/campus/models.tsx`:
```tsx
import { useGLTF } from '@react-three/drei';
import { Component, Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  Box3,
  BoxGeometry,
  Color,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  Vector3,
  type BufferGeometry,
  type InstancedMesh,
  type Material,
  type Texture,
} from 'three';
import { MODELS, type ModelName, type ModelSpec } from './assets';
import { pastelHex, pastelizePixels } from './pastel';

/** 모델 하나를 놓을 자리. pos의 y는 바닥 높이, rotY는 facing과 같은 뜻 */
export interface ModelItem {
  pos: readonly [x: number, y: number, z: number];
  rotY: number;
  scale?: number;
}

interface ModelPart {
  geometry: BufferGeometry;
  material: Material;
  /** 모델 원점(바닥 가운데) 기준 이 메시의 변환 */
  matrix: Matrix4;
}

const pastelTextures = new WeakMap<object, Texture>();

/** 공용 텍스처를 캔버스에서 파스텔로 바꾼다. 같은 이미지는 한 번만 바꾼다 */
function pastelTexture(tex: Texture): Texture {
  const img = tex.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (!img) return tex;
  const cached = pastelTextures.get(img);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return tex;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  pastelizePixels(data.data);
  ctx.putImageData(data, 0, 0);
  const out = tex.clone();
  out.image = canvas;
  out.needsUpdate = true;
  pastelTextures.set(img, out);
  return out;
}

function pastelMaterial(src: Material, spec: ModelSpec): Material {
  const base = src as MeshStandardMaterial;
  const m = new MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  if (spec.textured && base.map) {
    m.map = pastelTexture(base.map);
  } else if (base.color) {
    m.color.set(pastelHex(`#${base.color.getHexString()}`));
  }
  if (spec.tint) m.color.multiply(new Color(spec.tint));
  m.name = base.name;
  return m;
}

/** glTF 장면을 (지오메트리, 파스텔 재질, 변환) 목록으로 펼친다. 바닥 가운데가 원점이 된다 */
function extractParts(root: Object3D, spec: ModelSpec): ModelPart[] {
  root.updateMatrixWorld(true);
  const box = new Box3().setFromObject(root);
  const center = box.getCenter(new Vector3());
  const base = new Matrix4()
    .makeRotationY(spec.yaw)
    .multiply(new Matrix4().makeScale(spec.scale, spec.scale, spec.scale))
    .multiply(new Matrix4().makeTranslation(-center.x, -box.min.y, -center.z));
  const parts: ModelPart[] = [];
  root.traverse((o) => {
    if (!(o as Mesh).isMesh) return;
    const mesh = o as Mesh;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    parts.push({
      geometry: mesh.geometry,
      material: pastelMaterial(mats[0]!, spec),
      matrix: base.clone().multiply(mesh.matrixWorld),
    });
  });
  return parts;
}

const tmpPos = new Vector3();
const tmpQuat = new Quaternion();
const tmpScale = new Vector3();
const Y_AXIS = new Vector3(0, 1, 0);

/** 자리 하나의 변환 행렬 (위치 · y 회전 · 배율) */
export function itemMatrix(item: ModelItem, out = new Matrix4()): Matrix4 {
  tmpPos.set(item.pos[0], item.pos[1], item.pos[2]);
  tmpQuat.setFromAxisAngle(Y_AXIS, item.rotY);
  const s = item.scale ?? 1;
  tmpScale.set(s, s, s);
  return out.compose(tmpPos, tmpQuat, tmpScale);
}

function PartInstances({
  part,
  items,
  shadows,
}: {
  part: ModelPart;
  items: readonly ModelItem[];
  shadows: boolean;
}) {
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const m = new Matrix4();
    items.forEach((item, i) => {
      mesh.setMatrixAt(i, itemMatrix(item, m).multiply(part.matrix));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, part]);
  return (
    <instancedMesh
      ref={ref}
      args={[part.geometry, part.material, items.length]}
      castShadow={shadows}
      receiveShadow
    />
  );
}

function LoadedModel({
  name,
  items,
  shadows,
}: {
  name: ModelName;
  items: readonly ModelItem[];
  shadows: boolean;
}) {
  const spec: ModelSpec = MODELS[name];
  const gltf = useGLTF(spec.url, false, false);
  const parts = useMemo(() => extractParts(gltf.scene, spec), [gltf, spec]);
  return (
    <group>
      {parts.map((part, i) => (
        <PartInstances key={`${i}-${items.length}`} part={part} items={items} shadows={shadows} />
      ))}
    </group>
  );
}

const fallbackMaterial = new MeshStandardMaterial({ color: '#e9dff0', roughness: 0.9 });

/** 모델을 못 불러왔을 때 같은 자리에 그리는 단순 상자 */
export function FallbackBoxes({ name, items }: { name: ModelName; items: readonly ModelItem[] }) {
  const spec: ModelSpec = MODELS[name];
  const geometry = useMemo(() => {
    const [w, h, d] = spec.box;
    return new BoxGeometry(w, h, d).translate(0, h / 2, 0);
  }, [spec]);
  const part = useMemo<ModelPart>(
    () => ({ geometry, material: fallbackMaterial, matrix: new Matrix4() }),
    [geometry],
  );
  return <PartInstances key={items.length} part={part} items={items} shadows />;
}

interface BoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

/** 에셋 로딩 실패를 잡아 대체 화면을 보여 준다 (설계 문서 §10) */
export class ModelBoundary extends Component<BoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[campus] 모델을 불러오지 못해 상자로 대신합니다', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * 같은 모델을 여러 자리에 InstancedMesh로 그린다 (메시 조각마다 드로우콜 1개).
 * 불러오는 동안은 아무것도 그리지 않고, 실패하면 상자로 대신한다.
 */
export function Model({
  name,
  items,
  shadows = true,
}: {
  name: ModelName;
  items: readonly ModelItem[];
  shadows?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <ModelBoundary fallback={<FallbackBoxes name={name} items={items} />}>
      <Suspense fallback={null}>
        <LoadedModel name={name} items={items} shadows={shadows} />
      </Suspense>
    </ModelBoundary>
  );
}
```

- [ ] **Step 2: 타입·린트 확인**

Run: `npm run typecheck -w @4this/web && npm run lint`
Expected: 에러 0

- [ ] **Step 3: 커밋**

```bash
git add apps/web/src/world/campus/models.tsx
git commit -m "feat: glTF 모델 인스턴싱·파스텔 재질·로딩 실패 대체 상자"
```

---

### Task 4: 땅과 자연물 (판·보도블록·광장·풀·나무·꽃·연못)

**Files:**
- Create: `apps/web/src/world/campus/Ground.tsx`, `apps/web/src/world/campus/Paths.tsx`, `apps/web/src/world/campus/Grass.tsx`, `apps/web/src/world/campus/Trees.tsx`, `apps/web/src/world/campus/Flowers.tsx`, `apps/web/src/world/campus/Pond.tsx`

**Interfaces:**
- Consumes: `BOARD_HALF`, `BOARD_CORNER`, `PLAZA`, `pathSegments`, `paverTiles`, `scatterGrass`, `TREES`, `FLOWER_BEDS`, `scatterInDisc`, `pondCircle` (Task 2)
- Produces: `<Ground />`, `<Paths />`, `<Grass tries?={number} />`(기본 7000번 시도 → 약 4,800잎), `<Trees />`, `<Flowers />`, `<Pond />`

드로우콜: 보도블록 1, 광장 3, 풀 1, 나무 2, 꽃 2, 연못 4.

- [ ] **Step 1: 디오라마 판**

프로토타입의 `slab` 3겹(잔디·흙 띠·흙)을 그대로 옮긴다. 잔디 윗면이 정확히 y = 0이 되게 위치를 계산한다(ExtrudeGeometry를 눕히면 윗면 = depth + bevel).

`apps/web/src/world/campus/Ground.tsx`:
```tsx
import { useMemo } from 'react';
import { ExtrudeGeometry, Shape } from 'three';
import { BOARD_CORNER, BOARD_HALF } from './layout';

function roundedRect(half: number, r: number): Shape {
  const s = new Shape();
  const x = -half;
  const y = -half;
  const w = half * 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + w - r);
  s.quadraticCurveTo(x + w, y + w, x + w - r, y + w);
  s.lineTo(x + r, y + w);
  s.quadraticCurveTo(x, y + w, x, y + w - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

const BEVEL = 0.3;

/** 둥근 판 한 겹. top은 윗면 높이 */
function Slab({
  half,
  depth,
  color,
  top,
}: {
  half: number;
  depth: number;
  color: string;
  top: number;
}) {
  const geometry = useMemo(() => {
    const g = new ExtrudeGeometry(roundedRect(half - BEVEL, BOARD_CORNER), {
      depth,
      bevelEnabled: true,
      bevelSize: BEVEL,
      bevelThickness: BEVEL,
      bevelSegments: 3,
      curveSegments: 10,
    });
    g.rotateX(-Math.PI / 2);
    return g;
  }, [half, depth]);
  // 돌린 뒤 윗면은 y = depth + BEVEL
  return (
    <mesh geometry={geometry} position-y={top - depth - BEVEL} receiveShadow>
      <meshStandardMaterial color={color} roughness={0.95} />
    </mesh>
  );
}

/** 디오라마 판: 잔디 윗면(y = 0) 아래로 흙 띠와 흙 단면이 보인다 */
export function Ground() {
  return (
    <group>
      <Slab half={BOARD_HALF} depth={0.5} color="#bfe6b4" top={0} />
      <Slab half={BOARD_HALF - 0.15} depth={0.5} color="#d9b38e" top={-0.9} />
      <Slab half={BOARD_HALF - 0.35} depth={1.6} color="#e7c9a9" top={-1.9} />
    </group>
  );
}
```

- [ ] **Step 2: 보도블록과 광장**

`apps/web/src/world/campus/Paths.tsx`:
```tsx
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Object3D, type InstancedMesh } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CAMPUS } from '@4this/shared';
import { PLAZA, pathSegments, paverTiles } from './layout';

const PAVER_COLORS = ['#fbeedd', '#f5e2cc', '#f9e8d6'];

/** 경로 그래프를 따라 깐 보도블록 (InstancedMesh 1개) + 원형 광장 */
export function Paths() {
  const tiles = useMemo(() => paverTiles(pathSegments(CAMPUS), CAMPUS), []);
  const geometry = useMemo(() => new RoundedBoxGeometry(0.56, 0.08, 0.56, 2, 0.05), []);
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const d = new Object3D();
    const c = new Color();
    tiles.forEach((t, i) => {
      d.position.set(t.x, 0.03, t.z);
      d.rotation.set(0, t.rot, 0);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      mesh.setColorAt(i, c.set(PAVER_COLORS[t.shade]!));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [tiles]);

  return (
    <group>
      <instancedMesh ref={ref} args={[geometry, undefined, tiles.length]} receiveShadow>
        <meshStandardMaterial roughness={0.9} />
      </instancedMesh>
      <mesh position={[PLAZA.center[0], 0.04, PLAZA.center[1]]} receiveShadow>
        <cylinderGeometry args={[PLAZA.r, PLAZA.r, 0.08, 48]} />
        <meshStandardMaterial color="#f7e0d0" roughness={0.9} />
      </mesh>
      <mesh position={[PLAZA.center[0], 0.09, PLAZA.center[1]]} rotation-x={-Math.PI / 2}>
        <torusGeometry args={[PLAZA.r * 0.7, 0.07, 8, 48]} />
        <meshStandardMaterial color="#f0c9b5" roughness={0.9} />
      </mesh>
      <mesh position={[PLAZA.center[0], 0.1, PLAZA.center[1]]} receiveShadow>
        <cylinderGeometry args={[0.9, 0.9, 0.12, 32]} />
        <meshStandardMaterial color="#f4d4c4" roughness={0.9} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 3: 풀·나무·꽃**

`apps/web/src/world/campus/Grass.tsx`:
```tsx
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, ConeGeometry, Object3D, type InstancedMesh } from 'three';
import { CAMPUS } from '@4this/shared';
import { pathSegments, scatterGrass } from './layout';

const LIGHT = new Color('#b5e3a8');
const DARK = new Color('#8fcf88');

/** 잔디 결: 작은 풀잎을 흩뿌린다 (InstancedMesh 1개, 그림자 없음) */
export function Grass({ tries = 7000 }: { tries?: number }) {
  const blades = useMemo(() => scatterGrass(CAMPUS, pathSegments(CAMPUS), tries), [tries]);
  const geometry = useMemo(() => new ConeGeometry(0.05, 0.28, 3).translate(0, 0.14, 0), []);
  const ref = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const d = new Object3D();
    const c = new Color();
    blades.forEach((b, i) => {
      d.position.set(b.x, 0, b.z);
      d.rotation.set(b.tiltX, b.rotY, b.tiltZ);
      d.scale.setScalar(b.scale);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
      mesh.setColorAt(i, c.copy(LIGHT).lerp(DARK, b.shade));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [blades]);

  return (
    <instancedMesh ref={ref} args={[geometry, undefined, blades.length]}>
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}
```

`apps/web/src/world/campus/Trees.tsx`:
```tsx
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, CylinderGeometry, IcosahedronGeometry, Object3D, type InstancedMesh } from 'three';
import { rand01 } from '@4this/shared';
import { TREES, type TreeKind } from './layout';

/** 잎 덩어리 4개의 [x, y, z, 반지름] (나무 배율 1 기준) */
const BLOBS: readonly (readonly [number, number, number, number])[] = [
  [0, 1.9, 0, 1],
  [0.5, 1.6, 0.2, 0.7],
  [-0.45, 1.65, -0.25, 0.72],
  [0.1, 2.4, -0.1, 0.65],
];

const LEAF_COLORS: Record<TreeKind, readonly string[]> = {
  cherry: ['#f6c4d4', '#f9d3df', '#f3b8cb'],
  green: ['#a8dba0', '#b5e3ad', '#9fd49a'],
};

/** 로우폴리 나무 (벚꽃·연두). 줄기 1개 + 잎 1개 InstancedMesh */
export function Trees() {
  const trunkGeo = useMemo(() => new CylinderGeometry(0.16, 0.24, 1.4, 8).translate(0, 0.7, 0), []);
  const leafGeo = useMemo(() => new IcosahedronGeometry(1, 1), []);
  const trunks = useRef<InstancedMesh>(null);
  const leaves = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const t = trunks.current;
    const l = leaves.current;
    if (!t || !l) return;
    const d = new Object3D();
    const c = new Color();
    TREES.forEach((tree, i) => {
      const s = tree.scale;
      const turn = rand01('tree', i) * Math.PI * 2;
      d.position.set(tree.pos[0], 0, tree.pos[1]);
      d.rotation.set(0, turn, 0);
      d.scale.setScalar(s);
      d.updateMatrix();
      t.setMatrixAt(i, d.matrix);
      BLOBS.forEach(([x, y, z, r], k) => {
        const cos = Math.cos(turn);
        const sin = Math.sin(turn);
        d.position.set(
          tree.pos[0] + (x * cos + z * sin) * s,
          y * s,
          tree.pos[1] + (z * cos - x * sin) * s,
        );
        d.rotation.set(0, turn + k, 0);
        d.scale.setScalar(r * s);
        d.updateMatrix();
        l.setMatrixAt(i * BLOBS.length + k, d.matrix);
        const colors = LEAF_COLORS[tree.kind];
        l.setColorAt(i * BLOBS.length + k, c.set(colors[(i + k) % colors.length]!));
      });
    });
    t.instanceMatrix.needsUpdate = true;
    l.instanceMatrix.needsUpdate = true;
    if (l.instanceColor) l.instanceColor.needsUpdate = true;
    t.computeBoundingSphere();
    l.computeBoundingSphere();
  }, []);

  return (
    <group>
      <instancedMesh
        ref={trunks}
        args={[trunkGeo, undefined, TREES.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#c9a17c" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={leaves}
        args={[leafGeo, undefined, TREES.length * BLOBS.length]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial flatShading roughness={0.85} />
      </instancedMesh>
    </group>
  );
}
```

`apps/web/src/world/campus/Flowers.tsx`:
```tsx
import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, CylinderGeometry, Object3D, SphereGeometry, type InstancedMesh } from 'three';
import type { Vec2 } from '@4this/shared';
import { FLOWER_BEDS, scatterInDisc } from './layout';

const PETALS = ['#ffb3c7', '#fff1a8', '#c9bdf2', '#ffd4b3', '#ffffff'];

/** 꽃밭: 줄기 1개 + 꽃송이 1개 InstancedMesh */
export function Flowers() {
  const spots = useMemo<Vec2[]>(
    () =>
      FLOWER_BEDS.flatMap((bed, i) => scatterInDisc(bed.center, bed.r, bed.count, `flower-${i}`)),
    [],
  );
  const stemGeo = useMemo(() => new CylinderGeometry(0.02, 0.02, 0.3, 4).translate(0, 0.15, 0), []);
  const headGeo = useMemo(() => new SphereGeometry(0.11, 8, 6), []);
  const stems = useRef<InstancedMesh>(null);
  const heads = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const s = stems.current;
    const h = heads.current;
    if (!s || !h) return;
    const d = new Object3D();
    const c = new Color();
    spots.forEach(([x, z], i) => {
      d.position.set(x, 0, z);
      d.updateMatrix();
      s.setMatrixAt(i, d.matrix);
      d.position.set(x, 0.32, z);
      d.updateMatrix();
      h.setMatrixAt(i, d.matrix);
      h.setColorAt(i, c.set(PETALS[i % PETALS.length]!));
    });
    s.instanceMatrix.needsUpdate = true;
    h.instanceMatrix.needsUpdate = true;
    if (h.instanceColor) h.instanceColor.needsUpdate = true;
    s.computeBoundingSphere();
    h.computeBoundingSphere();
  }, [spots]);

  return (
    <group>
      <instancedMesh ref={stems} args={[stemGeo, undefined, spots.length]}>
        <meshStandardMaterial color="#8fc98a" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={heads} args={[headGeo, undefined, spots.length]} castShadow>
        <meshStandardMaterial roughness={0.8} />
      </instancedMesh>
    </group>
  );
}
```

- [ ] **Step 4: 연못 (원 충돌체와 같은 자리)**

`apps/web/src/world/campus/Pond.tsx`:
```tsx
import { useLayoutEffect, useMemo, useRef } from 'react';
import { CylinderGeometry, DodecahedronGeometry, Object3D, type InstancedMesh } from 'three';
import { CAMPUS, rand01 } from '@4this/shared';
import { pondCircle } from './layout';

const STONES = 26;
const PADS: readonly (readonly [number, number, number])[] = [
  [0.35, 0.2, 0.42],
  [-0.4, 0.35, 0.34],
  [0.1, -0.45, 0.3],
  [-0.2, -0.1, 0.26],
  [0.55, -0.25, 0.28],
];

/** 연못: 물 + 돌 테두리 + 연잎. 원 충돌체(CAMPUS.colliders)와 같은 자리·크기 */
export function Pond() {
  const { center, r } = pondCircle(CAMPUS);
  const water = r - 0.4;
  const stoneGeo = useMemo(() => new DodecahedronGeometry(0.34, 0), []);
  const padGeo = useMemo(
    () => new CylinderGeometry(1, 1, 0.03, 16, 1, false, 0, Math.PI * 1.75),
    [],
  );
  const stones = useRef<InstancedMesh>(null);
  const pads = useRef<InstancedMesh>(null);

  useLayoutEffect(() => {
    const s = stones.current;
    const p = pads.current;
    if (!s || !p) return;
    const d = new Object3D();
    for (let i = 0; i < STONES; i++) {
      const a = (i / STONES) * Math.PI * 2;
      const rr = r - 0.22 + (rand01('stone', i) - 0.5) * 0.12;
      d.position.set(Math.cos(a) * rr, 0.06, Math.sin(a) * rr);
      d.rotation.set(0, rand01('stone-r', i) * 3, 0);
      d.scale.set(1, 0.6, 1).multiplyScalar(0.85 + rand01('stone-s', i) * 0.3);
      d.updateMatrix();
      s.setMatrixAt(i, d.matrix);
    }
    PADS.forEach(([x, z, size], i) => {
      d.position.set(x * water, 0.07, z * water);
      d.rotation.set(0, i * 1.3, 0);
      d.scale.set(size, 1, size);
      d.updateMatrix();
      p.setMatrixAt(i, d.matrix);
    });
    s.instanceMatrix.needsUpdate = true;
    p.instanceMatrix.needsUpdate = true;
    s.computeBoundingSphere();
    p.computeBoundingSphere();
  }, [r, water]);

  return (
    <group position={[center[0], 0, center[1]]}>
      <mesh position-y={0.03} receiveShadow>
        <cylinderGeometry args={[water + 0.1, water + 0.1, 0.06, 48]} />
        <meshStandardMaterial color="#bfe3f5" roughness={0.25} />
      </mesh>
      <instancedMesh ref={stones} args={[stoneGeo, undefined, STONES]} castShadow receiveShadow>
        <meshStandardMaterial color="#ded8e6" flatShading roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={pads} args={[padGeo, undefined, PADS.length]} receiveShadow>
        <meshStandardMaterial color="#9fd49a" roughness={0.8} />
      </instancedMesh>
      <mesh position={[PADS[0]![0] * water, 0.14, PADS[0]![1] * water]} castShadow>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color="#ffc4d6" roughness={0.7} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 5: 타입·린트 확인**

Run: `npm run typecheck -w @4this/web && npm run lint`
Expected: 에러 0

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/world/campus/Ground.tsx apps/web/src/world/campus/Paths.tsx apps/web/src/world/campus/Grass.tsx apps/web/src/world/campus/Trees.tsx apps/web/src/world/campus/Flowers.tsx apps/web/src/world/campus/Pond.tsx
git commit -m "feat: 디오라마 판·보도블록·광장·풀·나무·꽃·연못"
```

---

### Task 5: 정문·게시판·KayKit 소품·Campus 조립·미리보기 페이지

**Files:**
- Create: `apps/web/src/world/campus/signTexture.ts`, `apps/web/src/world/campus/Gate.tsx`, `apps/web/src/world/campus/NoticeBoard.tsx`, `apps/web/src/world/campus/OutdoorProps.tsx`, `apps/web/src/world/campus/Lights.tsx`, `apps/web/src/world/campus/BuildingBoxes.tsx`
- Modify (교체): `apps/web/src/world/campus/Campus.tsx`, `apps/web/src/dev/campus/CampusPreview.tsx`

**Interfaces:**
- Consumes: Task 1~4 전부, `CampusProps` (`apps/web/src/world/contracts.ts`)
- Produces:
  - `labelTexture(text, opts?: { bg?; fg?; width?; height?; fontSize? }): CanvasTexture`
  - `<Gate />`, `<NoticeBoard />`(CAMPUS.boardPos, 앞면이 남서쪽, 클릭 처리 없음), `<OutdoorProps />`(벤치 = `CAMPUS.benchSpots` 자리·방향 그대로, 가로등 = `lampSpots`), `<Lights />`(임시), `<BuildingBoxes ids? focusedBuilding onBuildingClick? />`
  - `export function Campus(props: CampusProps)` — **cw#1과 같은 경로·이름·props**
  - `?dev=campus` 쿼리: `cam=x,y,z`, `target=x,y,z` (스크린샷용 카메라). 패널의 `data-testid="campus-log"`에 건물 클릭 결과가 찍힌다

- [ ] **Step 1: 글자판·정문·게시판**

`apps/web/src/world/campus/signTexture.ts`:
```ts
import { CanvasTexture, SRGBColorSpace } from 'three';

export interface LabelOptions {
  bg?: string;
  fg?: string;
  /** 캔버스 픽셀 크기 */
  width?: number;
  height?: number;
  fontSize?: number;
}

/**
 * 둥근 배경 + 가운데 글자가 그려진 CanvasTexture (간판·건물 이름표).
 * 한글 폰트 파일 없이 브라우저 기본 글꼴로 그린다.
 */
export function labelTexture(text: string, opts: LabelOptions = {}): CanvasTexture {
  const { bg = '#ffffff', fg = '#7a5b8c', width = 512, height = 128, fontSize = 64 } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const pad = 8;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(pad, pad, width - pad * 2, height - pad * 2, (height - pad * 2) / 2);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.font = `bold ${fontSize}px "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2 + 2);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
```

`apps/web/src/world/campus/Gate.tsx`:
```tsx
import { useEffect, useMemo } from 'react';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { CAMPUS } from '@4this/shared';
import { GATE_Z, MAIN_ROAD_WIDTH } from './layout';
import { labelTexture } from './signTexture';

const PILLAR_X = MAIN_ROAD_WIDTH / 2 + 0.7;

/** 정문 아치 + "4thIS 캠퍼스" 간판. 앞(+z, 바깥)과 뒤(-z, 캠퍼스 안) 양쪽에 간판을 붙인다 */
export function Gate() {
  const x = CAMPUS.graph.nodes[CAMPUS.gateNode]![0];
  const pillarGeo = useMemo(() => new RoundedBoxGeometry(0.8, 3.6, 0.8, 3, 0.14), []);
  const beamGeo = useMemo(() => new RoundedBoxGeometry(PILLAR_X * 2 + 1, 0.7, 0.6, 3, 0.18), []);
  const sign = useMemo(
    () => labelTexture('4thIS 캠퍼스', { bg: '#ffffff', fg: '#7a5b8c', width: 640, height: 128 }),
    [],
  );
  useEffect(() => () => sign.dispose(), [sign]);

  return (
    <group position={[x, 0, GATE_Z]}>
      {[-PILLAR_X, PILLAR_X].map((px) => (
        <group key={px} position-x={px}>
          <mesh geometry={pillarGeo} position-y={1.8} castShadow receiveShadow>
            <meshStandardMaterial color="#fde2ea" roughness={0.85} />
          </mesh>
          <mesh position-y={3.85} castShadow>
            <sphereGeometry args={[0.46, 16, 12]} />
            <meshStandardMaterial color="#ffb3c7" roughness={0.8} />
          </mesh>
        </group>
      ))}
      <mesh geometry={beamGeo} position-y={3.1} castShadow receiveShadow>
        <meshStandardMaterial color="#c9bdf2" roughness={0.85} />
      </mesh>
      {[1, -1].map((side) => (
        <mesh key={side} position={[0, 3.1, side * 0.31]} rotation-y={side > 0 ? 0 : Math.PI}>
          <planeGeometry args={[3.6, 0.72]} />
          <meshBasicMaterial map={sign} transparent toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
```

`apps/web/src/world/campus/NoticeBoard.tsx`:
```tsx
import { useEffect, useMemo } from 'react';
import { CAMPUS } from '@4this/shared';
import { labelTexture } from './signTexture';

const NOTES: readonly (readonly [x: number, y: number, color: string, tilt: number])[] = [
  [-0.55, 1.75, '#fff1a8', 0.08],
  [0.05, 1.8, '#ffd6e2', -0.06],
  [0.6, 1.72, '#cfe6fb', 0.05],
  [-0.3, 1.32, '#cdeedd', -0.04],
  [0.35, 1.3, '#e2dcf3', 0.07],
];

/**
 * 정문 옆 외부 일정 게시판 (CAMPUS.boardPos). 앞면이 남쪽(정문 쪽)을 보고 큰길 쪽으로 조금 돌아 있다.
 * 모델만 그린다. 클릭은 cw가 같은 자리(boardPos)에 두는 투명 클릭 영역(BoardHotspot)이 받는다.
 */
export function NoticeBoard() {
  const [x, z] = CAMPUS.boardPos;
  const header = useMemo(
    () => labelTexture('📋 게시판', { bg: '#ffb3c7', fg: '#ffffff', width: 384, height: 112 }),
    [],
  );
  useEffect(() => () => header.dispose(), [header]);

  return (
    <group position={[x, 0, z]} rotation-y={-0.35}>
      {[-0.95, 0.95].map((px) => (
        <mesh key={px} position={[px, 1.1, -0.02]} castShadow>
          <boxGeometry args={[0.14, 2.2, 0.14]} />
          <meshStandardMaterial color="#c9a17c" roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.9, 1.15, 0.1]} />
        <meshStandardMaterial color="#e8c9a6" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.55, 0.051]}>
        <planeGeometry args={[1.7, 0.98]} />
        <meshStandardMaterial color="#fbf3e4" roughness={0.95} />
      </mesh>
      {NOTES.map(([nx, ny, color, tilt]) => (
        <mesh key={`${nx},${ny}`} position={[nx, ny, 0.056]} rotation-z={tilt}>
          <planeGeometry args={[0.42, 0.32]} />
          <meshStandardMaterial color={color} roughness={0.9} />
        </mesh>
      ))}
      <mesh position={[0, 2.38, 0.02]}>
        <planeGeometry args={[1.2, 0.35]} />
        <meshBasicMaterial map={header} transparent toneMapped={false} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 2: KayKit 소품·임시 조명·건물 자리 상자**

KayKit 가로등은 팔이 모델의 -x 쪽이라 `lampSpots`가 계산한 `rotY`로 팔이 길을 향한다. 그림자는 해 하나(`directionalLight`)만 만든다.

`apps/web/src/world/campus/OutdoorProps.tsx`:
```tsx
import { useMemo } from 'react';
import { CAMPUS, rand01 } from '@4this/shared';
import { BUSHES, lampSpots, pathSegments, TRASH_CANS } from './layout';
import { Model, type ModelItem } from './models';

/** KayKit 바깥 소품: 벤치(benchSpots 자리 그대로), 가로등(길 따라), 덤불, 쓰레기통 */
export function OutdoorProps() {
  const benches = useMemo<ModelItem[]>(
    () => CAMPUS.benchSpots.map((s) => ({ pos: [s.pos[0], 0, s.pos[1]], rotY: s.facing })),
    [],
  );
  const lamps = useMemo<ModelItem[]>(
    () =>
      lampSpots(pathSegments(CAMPUS), CAMPUS).map((l) => ({
        pos: [l.pos[0], 0, l.pos[1]],
        rotY: l.rotY,
      })),
    [],
  );
  const bushes = useMemo<ModelItem[]>(
    () =>
      BUSHES.map((p, i) => ({
        pos: [p[0], 0, p[1]],
        rotY: rand01('bush', i) * Math.PI * 2,
        scale: 0.85 + rand01('bush-s', i) * 0.3,
      })),
    [],
  );
  const trash = useMemo<ModelItem[]>(
    () => TRASH_CANS.map((p, i) => ({ pos: [p[0], 0, p[1]], rotY: i * 1.1 })),
    [],
  );
  return (
    <group>
      <Model name="bench" items={benches} />
      <Model name="streetlight" items={lamps} />
      <Model name="bush" items={bushes} />
      <Model name="trash" items={trash} />
    </group>
  );
}
```

`apps/web/src/world/campus/Lights.tsx`:
```tsx
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { Color, Fog } from 'three';

/**
 * 임시 조명 (hm#1): 반구광 + 해 하나(그림자). hm#4에서 시각에 따른 하늘로 바꾼다.
 */
export function Lights() {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.background = new Color('#fbeff6');
    scene.fog = new Fog('#fbeff6', 80, 160);
  }, [scene]);

  return (
    <>
      <hemisphereLight args={['#fff6fb', '#c9e8c4', 1.3]} />
      <directionalLight
        position={[24, 36, 14]}
        intensity={2.1}
        color="#fff3e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-34}
        shadow-camera-right={34}
        shadow-camera-top={34}
        shadow-camera-bottom={-34}
        shadow-camera-near={1}
        shadow-camera-far={110}
        shadow-bias={-0.0005}
        shadow-normalBias={0.02}
      />
    </>
  );
}
```

`apps/web/src/world/campus/BuildingBoxes.tsx`:
```tsx
import type { ThreeEvent } from '@react-three/fiber';
import { BUILDING_IDS, CAMPUS, FLOOR_HEIGHT, type BuildingId } from '@4this/shared';

/** 건물 자리 임시 상자 (hm#1). hm#2·hm#3에서 실제 건물로 바꾼다 */
export function BuildingBoxes({
  ids = BUILDING_IDS,
  focusedBuilding,
  onBuildingClick,
}: {
  ids?: readonly BuildingId[];
  focusedBuilding: BuildingId | null;
  onBuildingClick?: (id: BuildingId) => void;
}) {
  return (
    <group>
      {ids.map((id) => {
        const b = CAMPUS.buildings[id];
        const w = b.max[0] - b.min[0];
        const d = b.max[1] - b.min[1];
        const h = b.floors * FLOOR_HEIGHT;
        const click = (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          onBuildingClick?.(id);
        };
        return (
          <mesh
            key={id}
            position={[(b.min[0] + b.max[0]) / 2, h / 2, (b.min[1] + b.max[1]) / 2]}
            onClick={click}
          >
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial
              color={focusedBuilding === id ? '#ffb3c7' : '#f9c9d4'}
              transparent
              opacity={0.35}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
```

- [ ] **Step 3: Campus 교체**

`apps/web/src/world/campus/Campus.tsx`:
```tsx
import type { CampusProps } from '../contracts';
import { BuildingBoxes } from './BuildingBoxes';
import { Flowers } from './Flowers';
import { Gate } from './Gate';
import { Grass } from './Grass';
import { Ground } from './Ground';
import { Lights } from './Lights';
import { NoticeBoard } from './NoticeBoard';
import { OutdoorProps } from './OutdoorProps';
import { Paths } from './Paths';
import { Pond } from './Pond';
import { Trees } from './Trees';

/** 4thIS 캠퍼스 전체 (지형·길·자연물·정문·소품·건물·조명) */
export function Campus({ focusedBuilding, onBuildingClick }: CampusProps) {
  return (
    <group>
      <Lights />
      <Ground />
      <Paths />
      <Grass />
      <Trees />
      <Flowers />
      <Pond />
      <Gate />
      <NoticeBoard />
      <OutdoorProps />
      <BuildingBoxes focusedBuilding={focusedBuilding} onBuildingClick={onBuildingClick} />
    </group>
  );
}
```

- [ ] **Step 4: 미리보기 페이지**

`apps/web/src/dev/campus/CampusPreview.tsx`:
```tsx
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState } from 'react';
import type { BuildingId } from '@4this/shared';
import { Campus } from '../../world/campus/Campus';

/** '1,2,3' → [1, 2, 3] (잘못되면 기본값) */
function vec3(param: string | null, fallback: [number, number, number]): [number, number, number] {
  const v = param?.split(',').map(Number);
  return v && v.length === 3 && v.every(Number.isFinite) ? [v[0]!, v[1]!, v[2]!] : fallback;
}

const params = new URLSearchParams(window.location.search);
const CAMERA = vec3(params.get('cam'), [38, 34, 40]);
const TARGET = vec3(params.get('target'), [0, 0, 0]);

const panel: React.CSSProperties = {
  position: 'fixed',
  left: 16,
  top: 16,
  padding: '10px 14px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.85)',
  color: '#5b4d6b',
  font: '13px/1.6 sans-serif',
};

/**
 * 캠퍼스 미리보기 개발 페이지 (?dev=campus).
 * - cam=x,y,z / target=x,y,z: 카메라 위치·바라보는 점 (스크린샷용)
 */
export function CampusPreview() {
  const [focused, setFocused] = useState<BuildingId | null>(null);
  const [log, setLog] = useState('건물을 눌러 보세요');

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows camera={{ position: CAMERA, fov: 32 }}>
        <Campus
          now={Date.now()}
          occupiedFloors={new Set()}
          focusedBuilding={focused}
          hiddenAboveFloor={null}
          onBuildingClick={(id) => {
            setFocused(id);
            setLog(`건물 클릭: ${id}`);
          }}
        />
        <OrbitControls makeDefault target={TARGET} maxPolarAngle={Math.PI * 0.45} />
      </Canvas>
      <div style={panel} data-testid="campus-log">
        {log}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 타입·린트·테스트**

Run: `npm run typecheck && npm run lint && npm test`
Expected: 에러 0, 테스트 모두 통과

- [ ] **Step 6: 브라우저로 확인**

Run: `npm run dev -w @4this/web` 후 http://localhost:5173/?dev=campus
Expected:
- 둥근 판 가장자리에 잔디·흙 띠·흙 단면이 보인다. 판 전체에 풀잎이 고르게 있고 길·광장·연못·건물 자리에는 없다(줄지어 몰린 풀이 없어야 한다).
- 정문(남쪽) → 광장 큰길(넓음), 광장에서 각 건물 문까지 보도블록 길, 광장은 원형 타일과 링.
- 벚꽃(분홍)·연두 나무, 꽃밭 9곳, 연못(물·돌 테두리·연잎·분홍 꽃)이 서쪽 공원에 있고 벤치 3개가 연못을 본다.
- 정문 아치 양쪽에 "4thIS 캠퍼스" 간판, 정문 동쪽에 "📋 게시판". 가로등 팔이 길 쪽으로 나와 있다. KayKit 소품은 원색이 아니라 연한 파스텔이다.
- 건물 자리 반투명 분홍 상자를 누르면 패널에 `건물 클릭: eng`. 게시판은 모델만 있고 클릭은 cw#4의 BoardHotspot이 받는다. 콘솔에 에러가 없다(three의 `THREE.Clock` 사용 중단 안내 경고는 R3F 내부라 무시).

- [ ] **Step 7: 로딩 실패 대체 확인**

`assets.ts`의 `kaykit` 함수에서 `url` 끝의 `${file}.gltf`를 잠깐 `${file}X.gltf`로 바꾸고 새로고침 → 벤치·가로등·덤불·쓰레기통 자리에 연보라 상자가 보이고 콘솔에 `[campus] 모델을 불러오지 못해 상자로 대신합니다` 경고가 뜬다. 확인 뒤 **원래대로 되돌린다**(`git diff`가 비어 있어야 한다).

- [ ] **Step 8: Playwright 스크린샷 (PR에 첨부, 커밋하지 않음)**

dev 서버를 켠 채로:

```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus" campus-overview.png
```
```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus&cam=6,8,34&target=0,1,20" campus-gate.png
```
```bash
npx playwright@1.64.1 install chromium   # 처음 한 번
npx playwright@1.64.1 screenshot --viewport-size "1280,800" --wait-for-timeout 7000 "http://localhost:5173/?dev=campus&cam=-6,9,10&target=-15,0,0" campus-pond.png
```

Expected: `campus-overview.png` 전체 판, `campus-gate.png` 정문 간판 글자 "4thIS 캠퍼스"와 게시판 앞면, `campus-pond.png` 연못·벤치·꽃밭. 헤드리스는 소프트웨어 WebGL이라 느리다(정상).

- [ ] **Step 9: 커밋**

```bash
git add apps/web/src/world/campus apps/web/src/dev/campus
git commit -m "feat: 정문·게시판·바깥 소품과 캠퍼스 조립, ?dev=campus 미리보기"
```

---

### Task 6: 전체 검사와 PR

- [ ] **Step 1: 전체 검사**

Run: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
Expected: 모두 통과. shared 24개, web 28개(cw#1 5개 + pastel 5 + assets 2 + layout 16; 먼저 머지된 다른 PR이 있으면 더 많다). 빌드는 `✓ built`(500 kB 청크 경고는 무시).

- [ ] **Step 2: push와 PR**

```bash
git push -u origin hm
gh pr create --base main --head hm --title "[hm#1] 캠퍼스 바깥" --body-file .github/pull_request_template.md
```

PR 본문에 Task 5의 스크린샷 3장을 붙이고 다음을 적는다:
- `CAMPUS.gateSpawn`을 `[0, 26]` → `[0, 24.5]`로 옮김(판 밖이라 공중에 뜸). cw#2 확인 부탁.
- 게시판은 `CAMPUS.boardPos`에 모델만 둠(클릭은 cw#4 BoardHotspot).
- 벤치 앉는 면 0.45 m(th의 `SEAT_HEIGHT`).
리뷰어: cw(계약·placement 좌표), th(벤치 높이). 머지는 **Create a merge commit**.

- [ ] **Step 3: 머지 후 알림**

단톡방에 "hm#1 머지됨 — 캠퍼스 바깥이 들어갔어요. 정문 등장 지점 [0, 24.5], 게시판 모델은 boardPos [3.5, 21]" 를 알린다. cw(cw#3)는 `git fetch origin && git merge origin/main`.

---

## Self-Review

- 스펙 §5.1: 50×50 판·정문→광장 큰길·광장에서 건물로 갈라지는 길(그래프 간선 + 문까지 짧은 길) → Task 2·4. 연못 충돌체와 같은 자리(`pondCircle` 테스트) → Task 2·4.
- 스펙 §5.4: KayKit 소품(벤치·가로등·덤불·쓰레기통) 파스텔화(채도 35%↓ + 크림 50%) → Task 1·3·5. 나무·꽃밭·연못·정문·보도블록·풀잎은 코드 + InstancedMesh → Task 4·5. 에셋 레포 복사·CREDITS → Task 1. Kenney는 hm#2부터 쓴다.
- 스펙 §10: 에셋 로딩 실패 → 단순 상자(ErrorBoundary) → Task 3, Step 7에서 확인.
- 게시판 모델(boardPos, 클릭은 cw의 BoardHotspot), 벤치는 benchSpots 자리 그대로, 가로등은 길 따라, 건물 자리 반투명 상자, 임시 조명 → Task 5.
- 플레이스홀더 없음. 모든 코드 블록은 임시 프로젝트에서 typecheck·lint·format:check·test·build를 통과한 파일 그대로다.
- 이름·타입: `Campus`/`CampusProps`/`BuildingId`/`CAMPUS`/`Seat`는 cw#1 계약 그대로. 이 PR이 만드는 `ModelItem`·`Model`·`layout.ts` 함수 이름은 hm#2~#4가 그대로 쓴다.
