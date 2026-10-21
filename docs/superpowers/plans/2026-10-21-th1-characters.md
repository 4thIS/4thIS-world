# [th#1] 캐릭터 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**담당:** 김태희 · 브랜치 `th` · 웨이브 1 · 선행 cw#1

**Goal:** cw#1의 임시 캡슐 `Character`를 같은 이름·경로·props로, 둥근 몸·큰 머리·하이라이트 눈·볼터치·동물별 귀/주둥이/꼬리/수염·악세서리 3부위·포즈 8종·눈 깜빡임·꼬리 흔들기·이름표 LOD·이모지 말풍선·하이라이트 링·투명도를 갖춘 R3F 캐릭터로 바꾸고, `?dev=characters` 갤러리로 한눈에 확인한다.

**Architecture:** 브레인스토밍 프로토타입(`docs/prototype/preview-3d.html`의 `makeCharacter`)의 조립 방식을 R3F 컴포넌트로 옮긴다. 움직임은 순수 함수 `poseFrame(pose, t, phase)`가 숫자로 계산하고(vitest), 컴포넌트는 `useFrame`에서 그 숫자를 ref에 넣기만 한다. 지오메트리·재질은 모듈 캐시로 모든 캐릭터가 공유한다(투명도는 0.1 단위 11단계로 묶어 재질 수를 제한). 이름표·말풍선은 한글 폰트 없이 되도록 drei `Html`을 쓴다.

**Tech Stack:** React 19.3 · three 0.186 · @react-three/fiber 9 · @react-three/drei 10 (`Html`) · vitest 5

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
- `Character`는 `apps/web/src/world/contracts.ts`의 `CharacterProps`를 그대로 받는다: `{ look, pose, name?, status?, emote?, highlight?, opacity?, onClick?, ref? }`. React 19의 `ref` prop을 바깥 `<group>`에 그대로 단다.
- Group 원점 = 발밑. **위치·방향(`position`, `rotation.y`)은 건드리지 않는다**(sim이 ref로 매 프레임 움직인다). 캐릭터 안쪽 그룹만 움직인다.
- 캐릭터 키 약 1.07 m(`CHARACTER_SCALE = 0.62`), 앉는 면 높이 `SEAT_HEIGHT = 0.45` m. hm의 의자·벤치 앉는 면도 이 높이에 맞춘다.
- `emote.at`은 `performance.now()` 기준 ms이고 3초 뒤 사라진다(`EMOTE_DURATION_MS = 3000`).
- 이름표 거리 기준: 28 m 미만 `이름 · 상태`, 55 m 미만 이름만, 그 이상 숨김.
- 30마리 기준으로 가볍게: 지오메트리·재질 캐시 공유, 매 프레임 React 렌더를 일으키지 않는다(이름표 모드가 바뀔 때만 setState).

## File Structure

```
apps/web/src/world/characters/
├─ Character.tsx        (교체) 조립·useFrame으로 포즈 적용·클릭·투명도
├─ poses.ts             포즈 8종 순수 함수 poseFrame, withStretch(사자 기지개), blinkScale, tailSwing, 치수 상수
├─ poses.test.ts
├─ overhead.ts          이름표 LOD(labelMode·labelText)·말풍선 애니메이션(emoteFrame) 순수 함수
├─ overhead.test.ts
├─ colors.ts            생김새 → 부위별 색
├─ materials.ts         재질 캐시 getMaterial·opacityStep, 투명도 컨텍스트 useMat
├─ geometries.ts        지오메트리 캐시 geo.*
├─ cache.test.ts        캐시·색 테스트
├─ labels.ts            동물·색·악세서리·포즈 한국어 이름 (th#2 꾸미기 칩도 쓴다)
├─ parts/               동물별 부품: types.ts · common.tsx · dog/cat/bear/duck/lion.tsx · index.ts
├─ accessories/         head.tsx · eyes.tsx · neck.tsx
├─ HeldProp.tsx         숟가락·컵·책
├─ NameTag.tsx          drei Html 이름표 (거리 LOD)
├─ EmoteBubble.tsx      drei Html 이모지 말풍선
├─ HighlightRing.tsx    내 캐릭터 발밑 링
└─ useHtmlPortal.ts     Html이 붙을 DOM 고정
apps/web/src/dev/characters/CharacterGallery.tsx   (교체) ?dev=characters
```

---

### Task 1: 포즈 애니메이션 순수 함수

**Files:**

- Create: `apps/web/src/world/characters/poses.ts`
- Test: `apps/web/src/world/characters/poses.test.ts`

**Interfaces:**

- Consumes: `PoseKind`, `POSE_KINDS` (`@4this/shared`)
- Produces:
  - `CHARACTER_SCALE = 0.62`, `SEAT_HEIGHT = 0.45`, `SIT_LIFT`(앉은 몸 높이, 몸 단위), `SITTING_POSES: ReadonlySet<PoseKind>`
  - `type HeldProp = 'spoon' | 'book' | 'cup'`, `ArmFrame { swing; spread }`, `FootFrame { y; z }`, `PoseFrame { bodyY; bodyRoll; bodyPitch; headYaw; headPitch; headRoll; arms: [ArmFrame, ArmFrame]; feet: [FootFrame, FootFrame]; prop: HeldProp | null }`
  - `poseFrame(pose: PoseKind, t: number, phase: number): PoseFrame` — t는 초
  - `withStretch(frame, t, phase): PoseFrame` — 20초마다 2초 기지개 (사자 교수님)
  - `blinkScale(t, phase): number` (0.1 또는 1), `tailSwing(pose, t, phase): number` (±0.35)

- [ ] **Step 1: 브랜치 준비**

```bash
git fetch origin && git checkout th && git merge origin/main
npm install
```

- [ ] **Step 2: 실패하는 테스트 작성**

`apps/web/src/world/characters/poses.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { POSE_KINDS } from '@4this/shared';
import {
  blinkScale,
  CHARACTER_SCALE,
  poseFrame,
  SEAT_HEIGHT,
  SIT_LIFT,
  SITTING_POSES,
  tailSwing,
  withStretch,
} from './poses';

describe('poseFrame', () => {
  it('모든 포즈가 유한한 값을 낸다', () => {
    for (const pose of POSE_KINDS) {
      for (const t of [0, 0.37, 5.2, 123.4]) {
        const f = poseFrame(pose, t, 1.3);
        const values = [
          f.bodyY,
          f.bodyRoll,
          f.bodyPitch,
          f.headYaw,
          f.headPitch,
          f.headRoll,
          ...f.arms.flatMap((a) => [a.swing, a.spread]),
          ...f.feet.flatMap((p) => [p.y, p.z]),
        ];
        expect(values.every(Number.isFinite)).toBe(true);
      }
    }
  });

  it('앉은 포즈는 몸통 아래가 의자 높이 근처에 온다', () => {
    expect((SIT_LIFT + 0.15) * CHARACTER_SCALE).toBeCloseTo(SEAT_HEIGHT - 0.04 * CHARACTER_SCALE);
    for (const pose of SITTING_POSES) {
      expect(poseFrame(pose, 2, 0).bodyY).toBeCloseTo(SIT_LIFT, 1);
    }
    expect(poseFrame('stand', 2, 0).bodyY).toBeLessThan(0.05);
  });

  it('걷기는 통통 튀고 두 발·두 팔이 번갈아 나간다', () => {
    const heights = [0, 0.1, 0.2, 0.3].map((t) => poseFrame('walk', t, 0).bodyY);
    expect(Math.max(...heights)).toBeGreaterThan(0.05);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(0);
    const f = poseFrame('walk', 0.2, 0);
    expect(Math.sign(f.feet[0].z - 0.08)).toBe(-Math.sign(f.feet[1].z - 0.08));
    expect(Math.sign(f.arms[0].swing)).toBe(-Math.sign(f.arms[1].swing));
  });

  it('포즈마다 맞는 소품을 든다', () => {
    expect(poseFrame('sitEat', 1, 0).prop).toBe('spoon');
    expect(poseFrame('sitRead', 1, 0).prop).toBe('book');
    expect(poseFrame('sitSip', 1, 0).prop).toBe('cup');
    expect(poseFrame('sitType', 1, 0).prop).toBeNull();
    expect(poseFrame('walk', 1, 0).prop).toBeNull();
  });

  it('타이핑은 팔을 앞으로 내밀고 가끔 고개를 든다', () => {
    expect(poseFrame('sitType', 3, 0).arms[0].swing).toBeLessThan(-0.9);
    const pitches = Array.from(
      { length: 80 },
      (_, i) => poseFrame('sitType', i * 0.1, 0).headPitch,
    );
    expect(Math.min(...pitches)).toBeLessThan(0);
    expect(Math.max(...pitches)).toBeCloseTo(0.25);
  });

  it('같은 입력이면 같은 결과', () => {
    expect(poseFrame('sitSip', 7.7, 2)).toEqual(poseFrame('sitSip', 7.7, 2));
  });
});

describe('withStretch', () => {
  it('20초 주기 중 2초 동안만 팔을 위로 든다', () => {
    const f = poseFrame('sitType', 1, 0);
    expect(withStretch(f, 1, 0).arms[0].swing).toBeLessThan(-2.5);
    expect(withStretch(f, 10, 0)).toBe(f);
  });
});

describe('blinkScale · tailSwing', () => {
  it('대부분 떠 있고 잠깐 감는다', () => {
    const samples = Array.from({ length: 300 }, (_, i) => blinkScale(i * 0.02, 0.5));
    const closed = samples.filter((s) => s < 1).length;
    expect(closed).toBeGreaterThan(0);
    expect(closed).toBeLessThan(samples.length * 0.1);
  });

  it('꼬리는 ±0.35 안에서 흔든다', () => {
    for (let i = 0; i < 50; i++) {
      expect(Math.abs(tailSwing('walk', i * 0.13, 1))).toBeLessThanOrEqual(0.35);
    }
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -w @4this/web -- poses`
Expected: FAIL — `Failed to resolve import "./poses"`

- [ ] **Step 4: 구현**

프로토타입의 걷기(통통 튀기 `|sin(t·7)|·0.12`, 몸 기울기, 발 번갈아, 팔 흔들기)와 앉기·두리번을 그대로 옮기고, 스펙 §6.2의 나머지 포즈를 더한다. 몸 단위는 스케일 전 값이다(머리 중심 y = 1.25).

`apps/web/src/world/characters/poses.ts`:

```ts
import type { PoseKind } from '@4this/shared';

/**
 * 캐릭터는 "몸 단위"(스케일 전)로 조립한 뒤 CHARACTER_SCALE을 곱한다.
 * 키는 약 1.73 단위 → 1.07 m.
 */
export const CHARACTER_SCALE = 0.62;

/** 의자·벤치 앉는 면 높이(m). 가구(hm)도 이 높이에 맞춘다 */
export const SEAT_HEIGHT = 0.45;

/** 몸통 아래 끝(몸 단위). 앉을 때 이 점이 SEAT_HEIGHT에 오도록 몸을 올린다 */
const TORSO_BOTTOM = 0.15;

/** 앉은 포즈의 몸 높이(몸 단위). 의자에 살짝 파묻히도록 0.04 낮춘다 */
export const SIT_LIFT = SEAT_HEIGHT / CHARACTER_SCALE - TORSO_BOTTOM - 0.04;

/** 손에 드는 소품 */
export type HeldProp = 'spoon' | 'book' | 'cup';

export interface ArmFrame {
  /** rotation.x. 음수면 앞으로 든다 */
  swing: number;
  /** 몸에서 벌어지는 정도. 왼팔은 -spread, 오른팔은 +spread가 rotation.z에 들어간다 */
  spread: number;
}

export interface FootFrame {
  y: number;
  z: number;
}

/** 한 프레임의 몸 상태. 길이는 몸 단위, 각도는 라디안 */
export interface PoseFrame {
  bodyY: number;
  bodyRoll: number;
  bodyPitch: number;
  headYaw: number;
  headPitch: number;
  headRoll: number;
  /** [왼팔, 오른팔] */
  arms: [ArmFrame, ArmFrame];
  /** [왼발, 오른발] */
  feet: [FootFrame, FootFrame];
  prop: HeldProp | null;
}

export const SITTING_POSES: ReadonlySet<PoseKind> = new Set<PoseKind>([
  'sitType',
  'sitEat',
  'sitRead',
  'sitSip',
  'sitRest',
]);

const REST_SPREAD = 0.5;

const arm = (swing: number, spread = REST_SPREAD): ArmFrame => ({ swing, spread });

/** period 초마다 length 초 동안 0 → 1 → 0으로 부드럽게 오르내린다 */
function pulse(t: number, period: number, length: number): number {
  const local = (((t % period) + period) % period) / length;
  return local < 1 ? Math.sin(local * Math.PI) : 0;
}

const standing = (): PoseFrame => ({
  bodyY: 0,
  bodyRoll: 0,
  bodyPitch: 0,
  headYaw: 0,
  headPitch: 0,
  headRoll: 0,
  arms: [arm(0), arm(0)],
  feet: [
    { y: 0.08, z: 0.08 },
    { y: 0.08, z: 0.08 },
  ],
  prop: null,
});

const seated = (): PoseFrame => ({
  ...standing(),
  bodyY: SIT_LIFT,
  feet: [
    { y: SIT_LIFT * 0.55, z: 0.36 },
    { y: SIT_LIFT * 0.55, z: 0.36 },
  ],
});

/**
 * 포즈·시각(초)·캐릭터별 위상으로 몸 상태를 만든다. 설계 문서 §6.2 동작표를 따른다.
 * 순수 함수라 vitest로 확인한다.
 */
export function poseFrame(pose: PoseKind, t: number, phase: number): PoseFrame {
  const p = t + phase;
  switch (pose) {
    case 'walk': {
      const tt = t * 7 + phase;
      const f = standing();
      f.bodyY = Math.abs(Math.sin(tt)) * 0.12;
      f.bodyRoll = Math.sin(tt) * 0.06;
      f.feet = [
        { z: 0.08 + Math.sin(tt) * 0.16, y: 0.08 + Math.max(0, Math.sin(tt)) * 0.08 },
        {
          z: 0.08 + Math.sin(tt + Math.PI) * 0.16,
          y: 0.08 + Math.max(0, Math.sin(tt + Math.PI)) * 0.08,
        },
      ];
      // 팔은 반대쪽 발과 같이 움직인다
      f.arms = [arm(-Math.sin(tt) * 0.6), arm(-Math.sin(tt + Math.PI) * 0.6)];
      return f;
    }
    case 'idle': {
      const f = standing();
      f.bodyY = Math.sin(p * 2) * 0.02;
      f.headYaw = Math.sin(p * 0.6) * 0.35;
      return f;
    }
    case 'stand': {
      const f = standing();
      f.bodyY = Math.sin(p * 2) * 0.015;
      f.bodyRoll = Math.sin(p * 1.2) * 0.04;
      f.headRoll = Math.sin(p * 1.2 + 0.6) * 0.03;
      return f;
    }
    case 'sitType': {
      const f = seated();
      const lookUp = pulse(p, 8, 1.4);
      f.bodyPitch = 0.08;
      f.headPitch = 0.25 - lookUp * 0.4;
      f.arms = [
        arm(-1.1 + Math.sin(p * 14) * 0.08, 0.25),
        arm(-1.1 + Math.sin(p * 14 + Math.PI) * 0.08, 0.25),
      ];
      return f;
    }
    case 'sitEat': {
      const f = seated();
      const scoop = (Math.sin(p * 3) + 1) / 2;
      f.headPitch = 0.15 - scoop * 0.1;
      f.arms = [arm(-0.6, 0.3), arm(-0.8 - scoop * 0.8, 0.3)];
      f.prop = 'spoon';
      return f;
    }
    case 'sitRead': {
      const f = seated();
      const turn = pulse(p, 6, 0.8);
      f.headPitch = 0.3;
      f.headYaw = Math.sin(p * 0.5) * 0.08;
      f.arms = [arm(-1.2, 0.2), arm(-1.2 + turn * 0.3, 0.2 + turn * 0.6)];
      f.prop = 'book';
      return f;
    }
    case 'sitSip': {
      const f = seated();
      const sip = pulse(p, 5, 1.5);
      f.headPitch = 0.05 - sip * 0.15;
      f.arms = [arm(-0.5, 0.3), arm(-0.9 - sip * 0.8, 0.3 - sip * 0.15)];
      f.prop = 'cup';
      return f;
    }
    case 'sitRest': {
      const f = seated();
      f.bodyY = SIT_LIFT + Math.sin(p * 1.5) * 0.015;
      f.bodyPitch = -0.08;
      f.headRoll = Math.sin(p * 0.7) * 0.08;
      f.arms = [arm(-0.3, 0.7), arm(-0.3, 0.7)];
      return f;
    }
  }
}

/** 사자 교수님이 가끔 기지개를 켠다 (설계 문서 §6.4). 20초마다 2초 동안 두 팔을 위로 뻗는다 */
export function withStretch(frame: PoseFrame, t: number, phase: number): PoseFrame {
  const s = pulse(t + phase, 20, 2);
  if (s === 0) return frame;
  const lerp = (a: number, b: number) => a + (b - a) * s;
  return {
    ...frame,
    headPitch: lerp(frame.headPitch, -0.3),
    arms: [
      arm(lerp(frame.arms[0].swing, -2.8), lerp(frame.arms[0].spread, 0.3)),
      arm(lerp(frame.arms[1].swing, -2.8), lerp(frame.arms[1].spread, 0.3)),
    ],
  };
}

/** 눈 세로 크기: 몇 초마다 0.12초 동안 감는다. 캐릭터마다 주기가 조금 다르다 */
export function blinkScale(t: number, phase: number): number {
  const period = 3 + (phase % 2);
  return (t + phase) % period < 0.12 ? 0.1 : 1;
}

/** 꼬리 좌우 흔들기 (rotation.y). 걸을 때 더 빠르다 */
export function tailSwing(pose: PoseKind, t: number, phase: number): number {
  const speed = pose === 'walk' ? 12 : 6;
  return Math.sin(t * speed + phase) * 0.35;
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -w @4this/web -- poses`
Expected: PASS — 9개

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/world/characters/poses.ts apps/web/src/world/characters/poses.test.ts
git commit -m "feat: 캐릭터 포즈 8종 애니메이션 순수 함수"
```

---

### Task 2: 이름표 LOD·이모지 말풍선 로직

**Files:**

- Create: `apps/web/src/world/characters/overhead.ts`
- Test: `apps/web/src/world/characters/overhead.test.ts`

**Interfaces:**

- Produces:
  - `type LabelMode = 'full' | 'name' | 'hidden'`, `LABEL_FULL_DIST = 28`, `LABEL_NAME_DIST = 55`
  - `labelMode(distance: number): LabelMode`
  - `labelText(name: string | undefined, status: string | undefined, mode: LabelMode): string | null`
  - `EMOTE_DURATION_MS = 3000`, `EmoteFrame { scale; opacity; rise }`, `emoteFrame(elapsedMs: number): EmoteFrame | null`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/world/characters/overhead.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  EMOTE_DURATION_MS,
  emoteFrame,
  LABEL_FULL_DIST,
  LABEL_NAME_DIST,
  labelMode,
  labelText,
} from './overhead';

describe('labelMode', () => {
  it('가까우면 전체, 중간이면 이름만, 멀면 숨김', () => {
    expect(labelMode(5)).toBe('full');
    expect(labelMode(LABEL_FULL_DIST - 0.01)).toBe('full');
    expect(labelMode(LABEL_FULL_DIST)).toBe('name');
    expect(labelMode(LABEL_NAME_DIST - 0.01)).toBe('name');
    expect(labelMode(LABEL_NAME_DIST)).toBe('hidden');
  });
});

describe('labelText', () => {
  it('모드에 따라 문구를 줄인다', () => {
    expect(labelText('철수', '2학년 강의', 'full')).toBe('철수 · 2학년 강의');
    expect(labelText('철수', '2학년 강의', 'name')).toBe('철수');
    expect(labelText('철수', '2학년 강의', 'hidden')).toBeNull();
    expect(labelText('철수', undefined, 'full')).toBe('철수');
    expect(labelText(undefined, '공강', 'full')).toBeNull();
  });
});

describe('emoteFrame', () => {
  it('튀어나왔다가 1배로 돌아온다', () => {
    expect(emoteFrame(0)?.scale).toBe(0);
    expect(emoteFrame(200)?.scale).toBeCloseTo(1.2);
    expect(emoteFrame(1000)?.scale).toBe(1);
    expect(emoteFrame(1000)?.rise).toBe(12);
  });

  it('마지막 0.4초에 흐려지고 3초 뒤 사라진다', () => {
    expect(emoteFrame(2000)?.opacity).toBe(1);
    expect(emoteFrame(2800)?.opacity).toBeCloseTo(0.5);
    expect(emoteFrame(EMOTE_DURATION_MS)).toBeNull();
    expect(emoteFrame(-50)?.scale).toBe(0);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/web -- overhead`
Expected: FAIL — `Failed to resolve import "./overhead"`

- [ ] **Step 3: 구현**

`apps/web/src/world/characters/overhead.ts`:

```ts
/** 머리 위 표시(이름표·이모지 말풍선)의 순수 로직. 설계 문서 §6.3 */

export type LabelMode = 'full' | 'name' | 'hidden';

/** 카메라와 이 거리(m)보다 가까우면 `이름 · 상태` 전체 */
export const LABEL_FULL_DIST = 28;
/** 이 거리보다 가까우면 이름만, 더 멀면 숨김 */
export const LABEL_NAME_DIST = 55;

export function labelMode(distance: number): LabelMode {
  if (distance < LABEL_FULL_DIST) return 'full';
  if (distance < LABEL_NAME_DIST) return 'name';
  return 'hidden';
}

/** 이름표 문구. 보여 줄 것이 없으면 null */
export function labelText(
  name: string | undefined,
  status: string | undefined,
  mode: LabelMode,
): string | null {
  if (!name || mode === 'hidden') return null;
  if (mode === 'full' && status) return `${name} · ${status}`;
  return name;
}

/** 이모지 말풍선이 떠 있는 시간(ms) */
export const EMOTE_DURATION_MS = 3000;
const POP_MS = 350;
const FADE_MS = 400;

export interface EmoteFrame {
  /** CSS scale */
  scale: number;
  /** 0~1 */
  opacity: number;
  /** 위로 떠오른 정도(px) */
  rise: number;
}

/**
 * 받은 뒤 지난 시간(ms) → 말풍선 모양. 튀어나와(0.35초, 1.2배까지 커졌다 1배) 떠 있다가
 * 마지막 0.4초에 사라진다. 3초가 지나면 null
 */
export function emoteFrame(elapsedMs: number): EmoteFrame | null {
  const e = Math.max(0, elapsedMs);
  if (e >= EMOTE_DURATION_MS) return null;
  let scale = 1;
  if (e < 200) scale = (e / 200) * 1.2;
  else if (e < POP_MS) scale = 1.2 - ((e - 200) / (POP_MS - 200)) * 0.2;
  const opacity = Math.min(1, (EMOTE_DURATION_MS - e) / FADE_MS);
  const rise = Math.min(1, e / 300) * 12;
  return { scale, opacity, rise };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -w @4this/web -- overhead`
Expected: PASS — 4개

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/world/characters/overhead.ts apps/web/src/world/characters/overhead.test.ts
git commit -m "feat: 이름표 거리 LOD와 이모지 말풍선 애니메이션 로직"
```

---

### Task 3: 색·재질·지오메트리 캐시

**Files:**

- Create: `apps/web/src/world/characters/colors.ts`, `apps/web/src/world/characters/materials.ts`, `apps/web/src/world/characters/geometries.ts`
- Test: `apps/web/src/world/characters/cache.test.ts`

**Interfaces:**

- Consumes: `resolveColor`, `DEFAULT_LOOK` (`@4this/shared`), `CharacterLook`, `PROFESSOR_LOOK` (`world/contracts.ts`)
- Produces:
  - `CharacterColors { fur; dark; muzzle; belly; ink; nose; cheek; innerEar; beak; mane }` (모두 `'#rrggbb'`), `characterColors(look: CharacterLook): CharacterColors`
  - `type MatKind = 'matte' | 'glossy' | 'glow' | 'blush'`, `opacityStep(opacity: number): number` (0~10), `getMaterial(color: string, step: number, kind?: MatKind): MeshStandardMaterial` — 같은 키면 같은 객체, step 10만 불투명
  - `OpacityStepContext` (React 컨텍스트, 기본 10), `useMat(color: string, kind?: MatKind)` — 부품 컴포넌트가 지금 캐릭터의 투명도에 맞는 재질을 얻는다
  - `cachedGeometry(key, make)`, `geo.sphere/dome/capsule/cone/cylinder/halfDisc/torus/circle/ring/ico/roundedBox/catTail`

- [ ] **Step 1: 실패하는 테스트 작성**

`apps/web/src/world/characters/cache.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK } from '@4this/shared';
import { PROFESSOR_LOOK } from '../contracts';
import { characterColors } from './colors';
import { geo } from './geometries';
import { getMaterial, opacityStep } from './materials';

describe('geo 캐시', () => {
  it('같은 모양은 같은 객체를 돌려준다', () => {
    expect(geo.sphere(0.5)).toBe(geo.sphere(0.5));
    expect(geo.sphere(0.5)).not.toBe(geo.sphere(0.4));
    expect(geo.catTail()).toBe(geo.catTail());
  });
});

describe('getMaterial', () => {
  it('색·종류·투명도 단계가 같으면 공유한다', () => {
    expect(getMaterial('#ffffff', 10)).toBe(getMaterial('#ffffff', 10));
    expect(getMaterial('#ffffff', 10)).not.toBe(getMaterial('#ffffff', 10, 'glossy'));
  });

  it('불투명은 transparent=false, 반투명은 transparent=true', () => {
    expect(getMaterial('#123456', 10)).toMatchObject({ transparent: false, opacity: 1 });
    expect(getMaterial('#123456', 5)).toMatchObject({ transparent: true, opacity: 0.5 });
    expect(getMaterial('#123456', 10, 'blush')).toMatchObject({ transparent: true, opacity: 0.75 });
  });

  it('opacityStep은 0~10으로 자른다', () => {
    expect(opacityStep(1)).toBe(10);
    expect(opacityStep(0.34)).toBe(3);
    expect(opacityStep(-1)).toBe(0);
    expect(opacityStep(2)).toBe(10);
  });
});

describe('characterColors', () => {
  it('기본색과 더 진한 색을 만든다', () => {
    const c = characterColors(DEFAULT_LOOK);
    expect(c.fur).toBe('#f6dcc0');
    expect(c.dark).not.toBe(c.fur);
    expect(parseInt(c.dark.slice(1, 3), 16)).toBeLessThan(0xf6);
  });

  it('고양이는 분홍 코, 사자는 교수님 기본색', () => {
    expect(characterColors({ ...DEFAULT_LOOK, animal: 'cat' }).nose).toBe('#ff9fb6');
    expect(characterColors(PROFESSOR_LOOK).fur).toBe('#f5cf8e');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/web -- cache`
Expected: FAIL — `Failed to resolve import "./colors"`

- [ ] **Step 3: 색 규칙 구현** (프로토타입: 진한 부분 = 털색 × 0.82, 주둥이 = 털색과 흰색 반반, 고양이는 분홍 코)

`apps/web/src/world/characters/colors.ts`:

```ts
import { Color } from 'three';
import { resolveColor } from '@4this/shared';
import type { CharacterLook } from '../contracts';

/** 캐릭터 한 마리에 쓰는 색. 모두 '#rrggbb' */
export interface CharacterColors {
  /** 털 (몸·머리) */
  fur: string;
  /** 귀·발·꼬리처럼 조금 진한 부분 */
  dark: string;
  /** 주둥이 */
  muzzle: string;
  belly: string;
  /** 눈·코 */
  ink: string;
  nose: string;
  cheek: string;
  /** 귀 안쪽 */
  innerEar: string;
  /** 오리 부리·발 */
  beak: string;
  /** 사자 갈기 */
  mane: string;
}

const hex = (c: Color) => `#${c.getHexString()}`;

/** 생김새 → 부위별 색 (프로토타입 makeCharacter의 색 규칙) */
export function characterColors(look: CharacterLook): CharacterColors {
  const fur = resolveColor(look.animal, look.color);
  return {
    fur,
    dark: hex(new Color(fur).multiplyScalar(0.82)),
    muzzle: look.animal === 'cat' ? '#fffaf4' : hex(new Color(fur).lerp(new Color('#ffffff'), 0.5)),
    belly: '#fffaf4',
    ink: '#4a3a45',
    nose: look.animal === 'cat' ? '#ff9fb6' : '#4a3a45',
    cheek: '#ffb3c7',
    innerEar: look.animal === 'cat' ? '#ffc4d3' : '#f7d9c4',
    beak: '#ffb37a',
    mane: '#e8a35f',
  };
}
```

- [ ] **Step 4: 재질 캐시 구현**

반투명 재질은 `transparent: true` + `depthWrite: false`로 만든다. 출입 페이드 중에만 잠깐 쓰이므로 투명도를 11단계로 묶어도 눈에 띄지 않는다.

`apps/web/src/world/characters/materials.ts`:

```ts
import { createContext, useContext } from 'react';
import { MeshStandardMaterial } from 'three';

/**
 * 재질 캐시. 같은 색·종류·투명도 단계면 30마리가 재질 하나를 같이 쓴다.
 * 투명도는 0.1 단위 11단계로 묶는다(출입 페이드 0.3초 동안만 잠깐 쓰인다).
 */
export type MatKind = 'matte' | 'glossy' | 'glow' | 'blush';

const cache = new Map<string, MeshStandardMaterial>();

/** 0~1 → 0~10 */
export function opacityStep(opacity: number): number {
  return Math.round(Math.min(1, Math.max(0, opacity)) * 10);
}

export function getMaterial(color: string, step: number, kind: MatKind = 'matte') {
  const key = `${kind}|${color}|${step}`;
  let m = cache.get(key);
  if (!m) {
    const base = kind === 'blush' ? 0.75 : 1;
    const opacity = (step / 10) * base;
    m = new MeshStandardMaterial({
      color,
      roughness: kind === 'glossy' ? 0.35 : 0.8,
      emissive: kind === 'glow' ? '#ffffff' : '#000000',
      emissiveIntensity: kind === 'glow' ? 0.6 : 0,
      transparent: opacity < 1,
      opacity,
      // 반투명일 때 뒤쪽 면이 비쳐 지저분해지지 않게 깊이는 쓰지 않는다
      depthWrite: opacity >= 1,
    });
    cache.set(key, m);
  }
  return m;
}

/** Character가 자기 투명도 단계를 부품들에 내려 준다 */
export const OpacityStepContext = createContext(10);

/** 부품 컴포넌트용: 지금 캐릭터의 투명도 단계에 맞는 재질 */
export function useMat(color: string, kind: MatKind = 'matte') {
  return getMaterial(color, useContext(OpacityStepContext), kind);
}
```

- [ ] **Step 5: 지오메트리 캐시 구현**

`RoundedBoxGeometry`는 three의 addons(`three/addons/geometries/RoundedBoxGeometry.js`)에 있다. 새 패키지는 필요 없다.

`apps/web/src/world/characters/geometries.ts`:

```ts
import {
  CapsuleGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
  type BufferGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * 지오메트리 캐시. 모든 캐릭터가 같은 모양을 공유하므로 처음 한 번만 만든다.
 * 컴포넌트는 `<mesh geometry={geo.sphere(0.5)} />`처럼 쓰고, Character 뿌리에
 * `dispose={null}`을 걸어 언마운트 때 공유 지오메트리가 지워지지 않게 한다.
 */
const cache = new Map<string, BufferGeometry>();

export function cachedGeometry<T extends BufferGeometry>(key: string, make: () => T): T {
  let g = cache.get(key);
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g as T;
}

export const geo = {
  sphere: (r: number, w = 18, h = 14) =>
    cachedGeometry(`sphere:${r}:${w}:${h}`, () => new SphereGeometry(r, w, h)),
  /** 위쪽만 남긴 반구 모자 (thetaLength = 위에서부터 덮는 각) */
  dome: (r: number, thetaLength: number) =>
    cachedGeometry(
      `dome:${r}:${thetaLength}`,
      () => new SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, thetaLength),
    ),
  capsule: (r: number, len: number) =>
    cachedGeometry(`capsule:${r}:${len}`, () => new CapsuleGeometry(r, len, 4, 10)),
  cone: (r: number, h: number, seg = 12) =>
    cachedGeometry(`cone:${r}:${h}:${seg}`, () => new ConeGeometry(r, h, seg)),
  cylinder: (rTop: number, rBottom: number, h: number, seg = 24) =>
    cachedGeometry(
      `cyl:${rTop}:${rBottom}:${h}:${seg}`,
      () => new CylinderGeometry(rTop, rBottom, h, seg),
    ),
  /** 앞쪽(+z) 반원판. 모자 챙 */
  halfDisc: (r: number, h: number) =>
    cachedGeometry(
      `halfDisc:${r}:${h}`,
      () => new CylinderGeometry(r, r, h, 24, 1, false, -Math.PI / 2, Math.PI),
    ),
  torus: (r: number, tube: number, arc = Math.PI * 2) =>
    cachedGeometry(`torus:${r}:${tube}:${arc}`, () => new TorusGeometry(r, tube, 8, 28, arc)),
  circle: (r: number) => cachedGeometry(`circle:${r}`, () => new CircleGeometry(r, 18)),
  ring: (inner: number, outer: number) =>
    cachedGeometry(`ring:${inner}:${outer}`, () => new RingGeometry(inner, outer, 40)),
  ico: (r: number) => cachedGeometry(`ico:${r}`, () => new IcosahedronGeometry(r, 1)),
  roundedBox: (w: number, h: number, d: number, radius: number) =>
    cachedGeometry(
      `rbox:${w}:${h}:${d}:${radius}`,
      () => new RoundedBoxGeometry(w, h, d, 3, radius),
    ),
  /** 고양이 꼬리: 엉덩이에서 위로 말려 올라가는 곡선 (꼬리 피벗 기준) */
  catTail: () =>
    cachedGeometry(
      'catTail',
      () =>
        new TubeGeometry(
          new CatmullRomCurve3([
            new Vector3(0, -0.1, 0.03),
            new Vector3(0, -0.05, -0.27),
            new Vector3(0, 0.35, -0.32),
            new Vector3(0.1, 0.5, -0.17),
          ]),
          20,
          0.06,
          8,
        ),
    ),
};
```

- [ ] **Step 6: 통과 확인**

Run: `npm test -w @4this/web -- cache && npm run typecheck -w @4this/web`
Expected: PASS — 6개, 타입 에러 0

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/world/characters/colors.ts apps/web/src/world/characters/materials.ts apps/web/src/world/characters/geometries.ts apps/web/src/world/characters/cache.test.ts
git commit -m "feat: 캐릭터 색 규칙과 재질·지오메트리 캐시"
```

---

### Task 4: 동물 부품·악세서리·소품·한국어 이름

**Files:**

- Create: `apps/web/src/world/characters/parts/types.ts`, `parts/common.tsx`, `parts/dog.tsx`, `parts/cat.tsx`, `parts/bear.tsx`, `parts/duck.tsx`, `parts/lion.tsx`, `parts/index.ts`
- Create: `apps/web/src/world/characters/accessories/head.tsx`, `accessories/eyes.tsx`, `accessories/neck.tsx`
- Create: `apps/web/src/world/characters/HeldProp.tsx`, `apps/web/src/world/characters/labels.ts`

**Interfaces:**

- Consumes: Task 3의 `geo`, `useMat`, `CharacterColors`; Task 1의 `HeldProp`
- Produces:
  - `PartProps { colors: CharacterColors }`, `AnimalParts { Face; Tail; Arm; footColor(colors): string }`, `ANIMAL_PARTS: Record<Animal | 'lion', AnimalParts>`
    - `Face`는 머리 중심 기준, `Tail`은 꼬리 피벗(몸 기준 `[0, 0.55, -0.38]`) 기준, `Arm`은 어깨 피벗 기준(아래로 늘어짐)
  - `HeadAccessory({ kind })` — `none | strawHat | beanie | ribbon | cap`, 머리 중심 기준
  - `EyesAccessory({ kind })` — `none | glasses | sunglasses`, 머리 중심 기준
  - `NeckAccessory({ kind })` — `none | scarf | bowtie`, 몸 기준(목 y ≈ 0.86)
  - `HandProp({ prop })` (오른손: 숟가락·컵), `BookProp()` (몸 앞)
  - `ANIMAL_LABELS`, `ANIMAL_EMOJI` (`Record<Animal | 'lion', string>`), `COLOR_LABELS`, `HEAD_LABELS`, `EYES_LABELS`, `NECK_LABELS`, `POSE_LABELS`

3D 메시는 단위 테스트 대신 Task 5의 타입 검사와 Task 6의 갤러리 스크린샷으로 확인한다.

- [ ] **Step 1: 부품 계약과 공통 부품**

`apps/web/src/world/characters/parts/types.ts`:

```ts
import type { JSX } from 'react';
import type { CharacterColors } from '../colors';

export interface PartProps {
  colors: CharacterColors;
}

/** 동물 한 종의 부품. 좌표는 몸 단위 */
export interface AnimalParts {
  /** 귀·주둥이·코·부리·수염·갈기. 머리 중심 기준 */
  Face: (props: PartProps) => JSX.Element;
  /** 꼬리 피벗(엉덩이 뒤) 기준. Character가 이 피벗을 좌우로 흔든다 */
  Tail: (props: PartProps) => JSX.Element;
  /** 어깨 피벗 기준, 아래로 늘어진 팔 하나 */
  Arm: (props: PartProps) => JSX.Element;
  footColor: (colors: CharacterColors) => string;
}
```

`apps/web/src/world/characters/parts/common.tsx`:

```tsx
import { geo } from '../geometries';
import { useMat } from '../materials';
import type { PartProps } from './types';

/** 털 팔: 어깨에서 아래로 늘어진 캡슐 */
export function FurArm({ colors }: PartProps) {
  return (
    <mesh
      position={[0, -0.16, 0]}
      geometry={geo.capsule(0.09, 0.2)}
      material={useMat(colors.fur)}
      castShadow
    />
  );
}

/** 오리 날개: 납작한 타원 */
export function WingArm({ colors }: PartProps) {
  return (
    <mesh
      position={[0.02, -0.14, -0.04]}
      scale={[0.35, 0.8, 1]}
      geometry={geo.sphere(0.2, 14, 10)}
      material={useMat(colors.dark)}
      castShadow
    />
  );
}

/** 주둥이 + 코 (강아지·고양이·곰·사자) */
export function Muzzle({ colors }: PartProps) {
  return (
    <>
      <mesh
        position={[0, -0.12, 0.42]}
        scale={[1.25, 0.8, 0.7]}
        geometry={geo.sphere(0.17, 16, 12)}
        material={useMat(colors.muzzle)}
      />
      <mesh
        position={[0, -0.07, 0.54]}
        scale={[1.3, 0.9, 1]}
        geometry={geo.sphere(0.055, 12, 8)}
        material={useMat(colors.nose, 'glossy')}
      />
    </>
  );
}
```

- [ ] **Step 2: 동물 5종** (강아지: 늘어진 귀·짧은 꼬리 / 고양이: 뾰족 귀·수염·말린 꼬리 / 곰: 동그란 귀·공 꼬리 / 오리: 부리·정수리 깃털·날개·주황 발 / 사자: 고리 모양 갈기·꼬리 끝 술)

`apps/web/src/world/characters/parts/dog.tsx`:

```tsx
import { geo } from '../geometries';
import { useMat } from '../materials';
import { FurArm, Muzzle } from './common';
import type { AnimalParts, PartProps } from './types';

function Face({ colors }: PartProps) {
  const dark = useMat(colors.dark);
  return (
    <>
      <Muzzle colors={colors} />
      {/* 늘어진 귀 */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.47, -0.02, -0.02]}
          rotation-z={s * 0.35}
          scale={[0.55, 1.15, 0.45]}
          geometry={geo.sphere(0.2, 16, 12)}
          material={dark}
          castShadow
        />
      ))}
    </>
  );
}

function Tail({ colors }: PartProps) {
  return (
    <mesh
      position={[0, 0.15, -0.04]}
      rotation-x={-0.7}
      geometry={geo.capsule(0.07, 0.22)}
      material={useMat(colors.dark)}
      castShadow
    />
  );
}

export const dog: AnimalParts = { Face, Tail, Arm: FurArm, footColor: (c) => c.dark };
```

`apps/web/src/world/characters/parts/cat.tsx`:

```tsx
import { geo } from '../geometries';
import { useMat } from '../materials';
import { FurArm, Muzzle } from './common';
import type { AnimalParts, PartProps } from './types';

function Face({ colors }: PartProps) {
  const fur = useMat(colors.fur);
  const inner = useMat(colors.innerEar);
  const ink = useMat(colors.ink);
  return (
    <>
      <Muzzle colors={colors} />
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* 뾰족 귀 + 안쪽 분홍 */}
          <mesh
            position={[s * 0.28, 0.45, 0]}
            rotation-z={-s * 0.3}
            geometry={geo.cone(0.16, 0.3, 4)}
            material={fur}
            castShadow
          />
          <mesh
            position={[s * 0.28, 0.43, 0.07]}
            rotation-z={-s * 0.3}
            geometry={geo.cone(0.08, 0.16, 4)}
            material={inner}
          />
          {/* 수염 두 가닥 */}
          {[0, 1].map((k) => (
            <mesh
              key={k}
              position={[s * 0.3, -0.12 + k * 0.05, 0.47]}
              rotation-z={Math.PI / 2 + s * (k ? 0.15 : -0.05)}
              geometry={geo.cylinder(0.006, 0.006, 0.26, 4)}
              material={ink}
            />
          ))}
        </group>
      ))}
    </>
  );
}

function Tail({ colors }: PartProps) {
  return <mesh geometry={geo.catTail()} material={useMat(colors.fur)} castShadow />;
}

export const cat: AnimalParts = { Face, Tail, Arm: FurArm, footColor: (c) => c.dark };
```

`apps/web/src/world/characters/parts/bear.tsx`:

```tsx
import { geo } from '../geometries';
import { useMat } from '../materials';
import { FurArm, Muzzle } from './common';
import type { AnimalParts, PartProps } from './types';

function Face({ colors }: PartProps) {
  const dark = useMat(colors.dark);
  const inner = useMat(colors.innerEar);
  return (
    <>
      <Muzzle colors={colors} />
      {/* 동그란 귀 */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh
            position={[s * 0.36, 0.4, -0.02]}
            scale={[1, 1, 0.6]}
            geometry={geo.sphere(0.15, 16, 12)}
            material={dark}
            castShadow
          />
          <mesh
            position={[s * 0.36, 0.4, 0.05]}
            scale={[1, 1, 0.4]}
            geometry={geo.sphere(0.08, 12, 8)}
            material={inner}
          />
        </group>
      ))}
    </>
  );
}

function Tail({ colors }: PartProps) {
  return (
    <mesh
      position={[0, -0.1, -0.02]}
      geometry={geo.sphere(0.1, 12, 8)}
      material={useMat(colors.fur)}
      castShadow
    />
  );
}

export const bear: AnimalParts = { Face, Tail, Arm: FurArm, footColor: (c) => c.dark };
```

`apps/web/src/world/characters/parts/duck.tsx`:

```tsx
import { geo } from '../geometries';
import { useMat } from '../materials';
import { WingArm } from './common';
import type { AnimalParts, PartProps } from './types';

function Face({ colors }: PartProps) {
  return (
    <>
      {/* 납작한 부리 */}
      <mesh
        position={[0, -0.1, 0.48]}
        scale={[1.3, 0.45, 0.9]}
        geometry={geo.sphere(0.17, 16, 10)}
        material={useMat(colors.beak, 'glossy')}
      />
      {/* 정수리 깃털 */}
      <mesh
        position={[0, 0.52, 0]}
        rotation-y={Math.PI / 2}
        geometry={geo.torus(0.08, 0.025, Math.PI * 1.4)}
        material={useMat(colors.fur)}
      />
    </>
  );
}

function Tail({ colors }: PartProps) {
  return (
    <mesh
      position={[0, 0, -0.04]}
      rotation-x={-2.2}
      geometry={geo.cone(0.14, 0.28, 10)}
      material={useMat(colors.fur)}
      castShadow
    />
  );
}

export const duck: AnimalParts = { Face, Tail, Arm: WingArm, footColor: (c) => c.beak };
```

`apps/web/src/world/characters/parts/lion.tsx`:

```tsx
import { geo } from '../geometries';
import { useMat } from '../materials';
import { FurArm, Muzzle } from './common';
import type { AnimalParts, PartProps } from './types';

/** 갈기: 얼굴 둘레에 고리 모양으로 놓은 구 14개 + 뒤통수를 덮는 큰 구 */
const MANE_COUNT = 14;
const MANE = Array.from({ length: MANE_COUNT }, (_, i) => {
  const a = (i / MANE_COUNT) * Math.PI * 2;
  return [Math.cos(a) * 0.5, Math.sin(a) * 0.48 + 0.02, -0.1] as const;
});

function Face({ colors }: PartProps) {
  const mane = useMat(colors.mane);
  const fur = useMat(colors.fur);
  return (
    <>
      <Muzzle colors={colors} />
      {MANE.map((p, i) => (
        <mesh key={i} position={p} geometry={geo.sphere(0.17, 12, 10)} material={mane} castShadow />
      ))}
      <mesh
        position={[0, 0.02, -0.22]}
        scale={[1, 1, 0.6]}
        geometry={geo.sphere(0.5, 18, 14)}
        material={mane}
      />
      {/* 갈기 위로 살짝 보이는 둥근 귀 */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.34, 0.44, 0.02]}
          scale={[1, 1, 0.6]}
          geometry={geo.sphere(0.12, 12, 10)}
          material={fur}
        />
      ))}
    </>
  );
}

function Tail({ colors }: PartProps) {
  return (
    <>
      <mesh
        position={[0, 0.12, -0.12]}
        rotation-x={-0.9}
        geometry={geo.capsule(0.04, 0.32)}
        material={useMat(colors.fur)}
        castShadow
      />
      <mesh
        position={[0, 0.27, -0.27]}
        geometry={geo.sphere(0.08, 12, 8)}
        material={useMat(colors.mane)}
      />
    </>
  );
}

export const lion: AnimalParts = { Face, Tail, Arm: FurArm, footColor: (c) => c.dark };
```

`apps/web/src/world/characters/parts/index.ts`:

```ts
import type { Animal } from '@4this/shared';
import { bear } from './bear';
import { cat } from './cat';
import { dog } from './dog';
import { duck } from './duck';
import { lion } from './lion';
import type { AnimalParts } from './types';

export type { AnimalParts, PartProps } from './types';

/** 동물 → 부품. 동물을 더할 때는 파일 하나와 이 표 한 줄만 더한다 */
export const ANIMAL_PARTS: Record<Animal | 'lion', AnimalParts> = { dog, cat, bear, duck, lion };
```

- [ ] **Step 3: 악세서리 3부위** (사자 교수님의 안경·나비넥타이는 `PROFESSOR_LOOK`이 `eyes: 'glasses'`, `neck: 'bowtie'`라서 이 부품을 그대로 쓴다)

`apps/web/src/world/characters/accessories/head.tsx`:

```tsx
import type { HEADS } from '@4this/shared';
import { geo } from '../geometries';
import { useMat } from '../materials';

type HeadKind = (typeof HEADS)[number];

/** 머리 악세서리. 머리 중심 기준(몸 단위) */
export function HeadAccessory({ kind }: { kind: HeadKind }) {
  switch (kind) {
    case 'none':
      return null;
    case 'strawHat':
      return <StrawHat />;
    case 'beanie':
      return <Beanie />;
    case 'ribbon':
      return <Ribbon />;
    case 'cap':
      return <Cap />;
  }
}

function StrawHat() {
  const straw = useMat('#ffe3a3');
  return (
    <group position-y={0.38}>
      <mesh geometry={geo.cylinder(0.62, 0.62, 0.04, 32)} material={straw} castShadow />
      <mesh position-y={0.14} geometry={geo.cylinder(0.32, 0.36, 0.26, 32)} material={straw} />
      <mesh
        position-y={0.05}
        geometry={geo.cylinder(0.365, 0.365, 0.07, 32)}
        material={useMat('#ff9fb6')}
      />
    </group>
  );
}

function Beanie() {
  return (
    <>
      <mesh
        position-y={0.06}
        geometry={geo.dome(0.52, Math.PI * 0.42)}
        material={useMat('#b9d9f7')}
        castShadow
      />
      <mesh
        position-y={0.26}
        rotation-x={Math.PI / 2}
        geometry={geo.torus(0.43, 0.06)}
        material={useMat('#9cc7ef')}
      />
      <mesh position-y={0.6} geometry={geo.ico(0.11)} material={useMat('#ffffff')} />
    </>
  );
}

function Ribbon() {
  const pink = useMat('#ff9fb6');
  return (
    <group position={[0.25, 0.42, 0.1]}>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position-x={s * 0.12}
          rotation-z={s * (Math.PI / 2)}
          geometry={geo.cone(0.12, 0.24, 12)}
          material={pink}
        />
      ))}
      <mesh position-z={0.02} geometry={geo.sphere(0.06, 10, 8)} material={pink} />
    </group>
  );
}

function Cap() {
  const lavender = useMat('#c9bdf2');
  return (
    <>
      <mesh
        position-y={0.08}
        geometry={geo.dome(0.52, Math.PI * 0.38)}
        material={lavender}
        castShadow
      />
      {/* 앞으로 나온 챙 */}
      <mesh
        position={[0, 0.3, 0.34]}
        rotation-x={0.15}
        geometry={geo.halfDisc(0.34, 0.03)}
        material={useMat('#b3a4ea')}
      />
      <mesh position-y={0.6} geometry={geo.sphere(0.05, 10, 8)} material={lavender} />
    </>
  );
}
```

`apps/web/src/world/characters/accessories/eyes.tsx`:

```tsx
import type { EYES } from '@4this/shared';
import { geo } from '../geometries';
import { useMat } from '../materials';

type EyesKind = (typeof EYES)[number];

/** 눈 악세서리. 머리 중심 기준(몸 단위), 눈은 x = ±0.18, y = 0.04 */
export function EyesAccessory({ kind }: { kind: EyesKind }) {
  const frame = useMat(kind === 'glasses' ? '#9b86c9' : '#4f4766', 'glossy');
  const lens = useMat('#4f4766', 'glossy');
  if (kind === 'none') return null;
  return (
    <>
      {[-0.18, 0.18].map((x) =>
        kind === 'glasses' ? (
          <mesh
            key={x}
            position={[x, 0.04, 0.5]}
            geometry={geo.torus(0.12, 0.018)}
            material={frame}
          />
        ) : (
          <mesh
            key={x}
            position={[x, 0.05, 0.5]}
            geometry={geo.roundedBox(0.27, 0.18, 0.04, 0.06)}
            material={lens}
          />
        ),
      )}
      <mesh
        position={[0, 0.06, 0.52]}
        rotation-z={Math.PI / 2}
        geometry={geo.cylinder(0.015, 0.015, 0.12, 6)}
        material={frame}
      />
    </>
  );
}
```

`apps/web/src/world/characters/accessories/neck.tsx`:

```tsx
import type { NECKS } from '@4this/shared';
import { geo } from '../geometries';
import { useMat } from '../materials';

type NeckKind = (typeof NECKS)[number];

/** 목 악세서리. 몸(body 그룹) 기준(몸 단위). 목은 y ≈ 0.86 */
export function NeckAccessory({ kind }: { kind: NeckKind }) {
  switch (kind) {
    case 'none':
      return null;
    case 'scarf':
      return <Scarf />;
    case 'bowtie':
      return <Bowtie />;
  }
}

function Scarf() {
  const mint = useMat('#a8dcc4');
  return (
    <group position-y={0.86}>
      <mesh rotation-x={Math.PI / 2} geometry={geo.torus(0.3, 0.08)} material={mint} castShadow />
      {/* 앞으로 늘어진 끝자락 */}
      <mesh
        position={[0.14, -0.16, 0.3]}
        rotation-z={0.15}
        geometry={geo.roundedBox(0.13, 0.28, 0.05, 0.025)}
        material={useMat('#8fd0b2')}
      />
    </group>
  );
}

function Bowtie() {
  const pink = useMat('#ff9fb6');
  return (
    <group position={[0, 0.86, 0.36]}>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position-x={s * 0.08}
          rotation-z={s * (Math.PI / 2)}
          geometry={geo.cone(0.07, 0.15, 10)}
          material={pink}
        />
      ))}
      <mesh geometry={geo.sphere(0.04, 10, 8)} material={useMat('#ff7f9e')} />
    </group>
  );
}
```

- [ ] **Step 4: 손에 드는 소품과 한국어 이름**

`apps/web/src/world/characters/HeldProp.tsx`:

```tsx
import { geo } from './geometries';
import { useMat } from './materials';
import type { HeldProp } from './poses';

/** 오른손(어깨 피벗 기준 손끝 y = -0.3)에 드는 숟가락·컵 */
export function HandProp({ prop }: { prop: HeldProp | null }) {
  const metal = useMat('#dcd6e6', 'glossy');
  const cup = useMat('#ffffff');
  const coffee = useMat('#b98a6a');
  if (prop === 'spoon') {
    return (
      <group position={[0, -0.32, 0.06]} rotation-x={-1.2}>
        <mesh geometry={geo.cylinder(0.012, 0.012, 0.22, 6)} material={metal} />
        <mesh
          position-y={0.12}
          scale={[1, 0.4, 1.3]}
          geometry={geo.sphere(0.035, 10, 8)}
          material={metal}
        />
      </group>
    );
  }
  if (prop === 'cup') {
    return (
      <group position={[0, -0.33, 0.08]}>
        <mesh geometry={geo.cylinder(0.07, 0.06, 0.14, 16)} material={cup} />
        <mesh
          position-y={0.065}
          geometry={geo.cylinder(0.062, 0.062, 0.01, 16)}
          material={coffee}
        />
      </group>
    );
  }
  return null;
}

/** 두 손으로 앞에 펼쳐 든 책. 몸(body 그룹) 기준 */
export function BookProp() {
  const paper = useMat('#fffaf0');
  return (
    <group position={[0, 0.62, 0.48]} rotation-x={-0.5}>
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position-x={s * 0.1}
          rotation-y={s * -0.25}
          geometry={geo.roundedBox(0.2, 0.26, 0.03, 0.01)}
          material={paper}
        />
      ))}
      <mesh
        position-z={-0.02}
        geometry={geo.roundedBox(0.42, 0.28, 0.02, 0.01)}
        material={useMat('#c9bdf2')}
      />
    </group>
  );
}
```

`apps/web/src/world/characters/labels.ts`:

```ts
import type { Animal, ColorKey, EYES, HEADS, NECKS, PoseKind } from '@4this/shared';

/** 화면에 보이는 한국어 이름. 꾸미기 칩(th#2)과 갤러리가 같이 쓴다 */
export const ANIMAL_LABELS: Record<Animal | 'lion', string> = {
  dog: '강아지',
  cat: '고양이',
  bear: '곰',
  duck: '오리',
  lion: '사자',
};

export const ANIMAL_EMOJI: Record<Animal | 'lion', string> = {
  dog: '🐶',
  cat: '🐱',
  bear: '🐻',
  duck: '🦆',
  lion: '🦁',
};

export const COLOR_LABELS: Record<ColorKey, string> = {
  default: '기본',
  pink: '분홍',
  mint: '민트',
  sky: '하늘',
  lavender: '라벤더',
  lemon: '레몬',
  peach: '복숭아',
  cream: '크림',
  gray: '회색',
};

export const HEAD_LABELS: Record<(typeof HEADS)[number], string> = {
  none: '없음',
  strawHat: '밀짚모자',
  beanie: '비니',
  ribbon: '리본',
  cap: '모자',
};

export const EYES_LABELS: Record<(typeof EYES)[number], string> = {
  none: '없음',
  glasses: '안경',
  sunglasses: '선글라스',
};

export const NECK_LABELS: Record<(typeof NECKS)[number], string> = {
  none: '없음',
  scarf: '목도리',
  bowtie: '나비넥타이',
};

export const POSE_LABELS: Record<PoseKind, string> = {
  idle: '서성임',
  walk: '걷기',
  stand: '서 있기',
  sitType: '타이핑',
  sitEat: '식사',
  sitRead: '독서',
  sitSip: '커피',
  sitRest: '쉬기',
};
```

- [ ] **Step 5: 타입·린트 확인**

Run: `npm run typecheck -w @4this/web && npx eslint apps/web/src/world/characters`
Expected: 에러 0

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/world/characters/parts apps/web/src/world/characters/accessories apps/web/src/world/characters/HeldProp.tsx apps/web/src/world/characters/labels.ts
git commit -m "feat: 동물 5종 부품·악세서리 3부위·소품·한국어 이름"
```

---

### Task 5: Character 조립과 머리 위 표시

**Files:**

- Modify (전체 교체): `apps/web/src/world/characters/Character.tsx`
- Create: `apps/web/src/world/characters/NameTag.tsx`, `EmoteBubble.tsx`, `HighlightRing.tsx`, `useHtmlPortal.ts`

**Interfaces:**

- Consumes: Task 1~4 전부, `CharacterProps`·`ActiveEmote` (`world/contracts.ts`), `rand01` (`@4this/shared`)
- Produces: `export function Character(props: CharacterProps)` — cw#1과 같은 이름·경로·props. cw의 sim은 `<Character ref={groupRef} look pose name status emote highlight opacity onClick />`로 쓰고 `groupRef.current.position`/`rotation.y`만 바꾼다.

구조 (몸 단위, 바깥 group만 m 단위):

```
group(ref, 발밑, dispose=null)          ← sim이 위치·방향을 넣는다
├─ HighlightRing (visible=highlight)
├─ group scale=CHARACTER_SCALE
│  ├─ body(ref)  몸통·배·목 악세서리·책·팔 피벗 2개·꼬리 피벗·head(ref)
│  │             head: 머리·eyes(ref, 깜빡임)·볼터치·Face·머리/눈 악세서리
│  └─ 발 2개(ref)  몸 밖에 둬서 통통 튈 때도 땅에 붙는다
├─ NameTag (y = 2.1 × scale)
└─ EmoteBubble (y = 2.6 × scale, emote가 있을 때)
```

drei `Html`은 두 가지를 지켜야 캐릭터 수만큼 `Attempted to synchronously unmount a root while React was already rendering` 경고가 나지 않는다: (1) `zIndexRange` 같은 배열 prop은 모듈 상수로 둔다, (2) `portal`을 고정 ref로 넘긴다(`useHtmlPortal`). 또 이름표·링은 붙였다 떼지 않고 `display`/`visible`만 바꾼다.

- [ ] **Step 1: Html 포털·이름표·말풍선·링 작성**

`apps/web/src/world/characters/useHtmlPortal.ts`:

```ts
import { useThree } from '@react-three/fiber';
import { useMemo, type RefObject } from 'react';

/**
 * drei <Html>이 붙을 DOM(캔버스의 부모)을 고정해서 넘긴다.
 * 넘기지 않으면 Html이 events.connected가 생기는 첫 리렌더 때 DOM 루트를 한 번 지웠다 다시 만들며
 * "Attempted to synchronously unmount a root" 경고를 캐릭터 수만큼 낸다.
 */
export function useHtmlPortal(): RefObject<HTMLElement> {
  const gl = useThree((s) => s.gl);
  return useMemo(() => ({ current: gl.domElement.parentNode as HTMLElement }), [gl]);
}
```

`apps/web/src/world/characters/NameTag.tsx`:

```tsx
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef, useState } from 'react';
import { Vector3, type Group } from 'three';
import { labelMode, labelText, type LabelMode } from './overhead';
import { useHtmlPortal } from './useHtmlPortal';

const tmp = new Vector3();
/** Html에 넘기는 배열은 모듈 상수로 둔다. 렌더마다 새 배열이면 Html이 DOM 루트를 다시 만든다 */
const Z_RANGE: [number, number] = [20, 0];

const tagStyle = {
  padding: '3px 9px',
  borderRadius: 999,
  background: 'rgba(255, 255, 255, 0.9)',
  color: '#7a5b8c',
  fontSize: 12,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  boxShadow: '0 2px 8px rgba(201, 165, 192, 0.35)',
  fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
  userSelect: 'none',
} as const;

interface NameTagProps {
  name?: string;
  status?: string;
  /** 발밑 기준 높이(m) */
  height: number;
  opacity: number;
}

/** 이름표. 카메라 거리에 따라 `이름 · 상태` → 이름 → 숨김 (설계 문서 §6.3) */
export function NameTag({ name, status, height, opacity }: NameTagProps) {
  const anchor = useRef<Group>(null);
  const portal = useHtmlPortal();
  const modeRef = useRef<LabelMode>('name');
  const [mode, setMode] = useState<LabelMode>('name');

  useFrame(({ camera }) => {
    if (!anchor.current) return;
    const next = labelMode(camera.position.distanceTo(anchor.current.getWorldPosition(tmp)));
    if (next !== modeRef.current) {
      modeRef.current = next;
      setMode(next);
    }
  });

  const text = labelText(name, status, mode);
  // Html은 계속 붙여 두고 내용만 숨긴다 (Html을 떼었다 붙이면 DOM 루트를 매번 다시 만든다)
  return (
    <group ref={anchor} position-y={height}>
      <Html center portal={portal} zIndexRange={Z_RANGE} pointerEvents="none">
        <div style={{ ...tagStyle, opacity, display: text && opacity > 0.05 ? 'block' : 'none' }}>
          {text}
        </div>
      </Html>
    </group>
  );
}
```

`apps/web/src/world/characters/EmoteBubble.tsx`:

```tsx
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { ActiveEmote } from '../contracts';
import { emoteFrame } from './overhead';
import { useHtmlPortal } from './useHtmlPortal';

/** 이름표(20)보다 위. 렌더마다 새 배열이면 Html이 DOM 루트를 다시 만들어서 모듈 상수로 둔다 */
const Z_RANGE: [number, number] = [30, 21];

const bubbleStyle = {
  display: 'grid',
  placeItems: 'center',
  width: 40,
  height: 40,
  borderRadius: '50%',
  background: '#ffffff',
  boxShadow: '0 4px 12px rgba(201, 165, 192, 0.45)',
  fontSize: 22,
  transform: 'scale(0)',
  userSelect: 'none',
} as const;

/**
 * 이모지 말풍선. emote.at(performance.now() ms)부터 3초 동안 튀어나왔다 사라진다.
 * 매 프레임 DOM 스타일만 바꿔서 React 렌더를 일으키지 않는다.
 */
export function EmoteBubble({ emote, height }: { emote: ActiveEmote; height: number }) {
  const el = useRef<HTMLDivElement>(null);
  const portal = useHtmlPortal();

  useFrame(() => {
    const div = el.current;
    if (!div) return;
    const f = emoteFrame(performance.now() - emote.at);
    if (!f) {
      div.style.display = 'none';
      return;
    }
    div.style.display = 'grid';
    div.style.opacity = String(f.opacity);
    div.style.transform = `translateY(${-f.rise}px) scale(${f.scale})`;
  });

  return (
    <group position-y={height}>
      <Html center portal={portal} zIndexRange={Z_RANGE} pointerEvents="none">
        <div ref={el} style={bubbleStyle}>
          {emote.emoji}
        </div>
      </Html>
    </group>
  );
}
```

`apps/web/src/world/characters/HighlightRing.tsx`:

```tsx
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { Mesh } from 'three';
import { geo } from './geometries';
import { useMat } from './materials';

/**
 * 내 캐릭터 발밑의 분홍 링. 천천히 숨 쉬듯 커졌다 작아진다 (단위 m).
 * 켜고 끌 때 붙였다 떼지 않고 visible만 바꾼다(형제인 이름표 Html이 다시 만들어지지 않게).
 */
export function HighlightRing({ visible }: { visible: boolean }) {
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    if (visible) ring.current?.scale.setScalar(1 + Math.sin(clock.elapsedTime * 3) * 0.06);
  });
  return (
    <mesh
      ref={ring}
      visible={visible}
      position-y={0.02}
      rotation-x={-Math.PI / 2}
      geometry={geo.ring(0.38, 0.5)}
      material={useMat('#ffb3c7', 'blush')}
    />
  );
}
```

- [ ] **Step 2: Character 교체**

`apps/web/src/world/characters/Character.tsx` — 파일 전체:

```tsx
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import type { Group } from 'three';
import { rand01 } from '@4this/shared';
import type { CharacterProps } from '../contracts';
import { EyesAccessory } from './accessories/eyes';
import { HeadAccessory } from './accessories/head';
import { NeckAccessory } from './accessories/neck';
import { characterColors } from './colors';
import { EmoteBubble } from './EmoteBubble';
import { geo } from './geometries';
import { BookProp, HandProp } from './HeldProp';
import { HighlightRing } from './HighlightRing';
import { OpacityStepContext, opacityStep, useMat } from './materials';
import { NameTag } from './NameTag';
import { ANIMAL_PARTS } from './parts';
import { blinkScale, CHARACTER_SCALE, poseFrame, tailSwing, withStretch } from './poses';

/** 발밑 기준 이름표·말풍선 높이(m) */
const TAG_HEIGHT = 2.1 * CHARACTER_SCALE;
const EMOTE_HEIGHT = 2.6 * CHARACTER_SCALE;

/**
 * 동물 캐릭터 (설계 문서 §6). 뼈대 없이 구·캡슐을 조립한다.
 * - Group 원점 = 발밑. 위치·방향은 sim(cw)이 ref로 받은 Group을 매 프레임 직접 움직인다.
 * - 지오메트리·재질은 캐시를 공유한다. 그래서 뿌리에 dispose={null}을 건다.
 */
export function Character({
  look,
  pose,
  name,
  status,
  emote = null,
  highlight = false,
  opacity = 1,
  onClick,
  ref,
}: CharacterProps) {
  const colors = useMemo(() => characterColors(look), [look.animal, look.color]);
  const parts = ANIMAL_PARTS[look.animal];
  const step = opacityStep(opacity);
  const phase = useMemo(() => rand01(name ?? '', look.animal) * 10, [name, look.animal]);
  const prop = useMemo(() => poseFrame(pose, 0, 0).prop, [pose]);

  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const eyes = useRef<Group>(null);
  const tail = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const footL = useRef<Group>(null);
  const footR = useRef<Group>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    let f = poseFrame(pose, t, phase);
    if (look.animal === 'lion' && pose === 'sitType') f = withStretch(f, t, phase);
    if (body.current) {
      body.current.position.y = f.bodyY;
      body.current.rotation.set(f.bodyPitch, 0, f.bodyRoll);
    }
    head.current?.rotation.set(f.headPitch, f.headYaw, f.headRoll);
    eyes.current?.scale.set(1, blinkScale(t, phase), 1);
    if (tail.current) tail.current.rotation.y = tailSwing(pose, t, phase);
    armL.current?.rotation.set(f.arms[0].swing, 0, -f.arms[0].spread);
    armR.current?.rotation.set(f.arms[1].swing, 0, f.arms[1].spread);
    footL.current?.position.set(-0.18, f.feet[0].y, f.feet[0].z);
    footR.current?.position.set(0.18, f.feet[1].y, f.feet[1].z);
  });

  const fur = useMat(colors.fur);
  const ink = useMat(colors.ink, 'glossy');
  const glint = useMat('#ffffff', 'glow');
  const cheek = useMat(colors.cheek, 'blush');
  const belly = useMat(colors.belly);
  const foot = useMat(parts.footColor(colors));
  const { Face, Tail, Arm } = parts;

  return (
    <group
      ref={ref}
      dispose={null}
      visible={step > 0}
      onClick={(e) => {
        if (!onClick) return;
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={() => {
        if (onClick) document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      <OpacityStepContext value={step}>
        <HighlightRing visible={highlight} />
        <group scale={CHARACTER_SCALE}>
          <group ref={body}>
            {/* 둥근 몸통 + 배 */}
            <mesh
              position-y={0.55}
              scale={[1, 0.95, 0.9]}
              geometry={geo.sphere(0.42, 24, 18)}
              material={fur}
              castShadow
            />
            <mesh
              position={[0, 0.5, 0.26]}
              scale={[1, 1, 0.5]}
              geometry={geo.sphere(0.3, 20, 14)}
              material={belly}
            />
            <NeckAccessory kind={look.neck} />
            {prop === 'book' && <BookProp />}

            {/* 팔: 어깨 피벗 */}
            <group ref={armL} position={[-0.36, 0.78, 0.06]}>
              <Arm colors={colors} />
            </group>
            <group ref={armR} position={[0.36, 0.78, 0.06]}>
              <Arm colors={colors} />
              <HandProp prop={prop} />
            </group>

            {/* 꼬리 피벗: 엉덩이 뒤 */}
            <group ref={tail} position={[0, 0.55, -0.38]}>
              <Tail colors={colors} />
            </group>

            {/* 큰 머리 */}
            <group ref={head} position-y={1.25}>
              <mesh
                scale={[1.05, 0.95, 0.95]}
                geometry={geo.sphere(0.5, 28, 22)}
                material={fur}
                castShadow
              />
              <group ref={eyes}>
                {[-0.18, 0.18].map((x) => (
                  <group key={x}>
                    <mesh
                      position={[x, 0.04, 0.45]}
                      scale={[1, 1, 0.6]}
                      geometry={geo.sphere(0.07, 14, 10)}
                      material={ink}
                    />
                    {/* 눈 하이라이트 */}
                    <mesh
                      position={[x + 0.025, 0.07, 0.5]}
                      geometry={geo.sphere(0.022, 8, 6)}
                      material={glint}
                    />
                  </group>
                ))}
              </group>
              {/* 볼터치 */}
              {[-0.18, 0.18].map((x) => (
                <mesh
                  key={x}
                  position={[x * 1.55, -0.1, 0.43]}
                  rotation-y={x > 0 ? 0.5 : -0.5}
                  geometry={geo.circle(0.07)}
                  material={cheek}
                />
              ))}
              <Face colors={colors} />
              <HeadAccessory kind={look.head} />
              <EyesAccessory kind={look.eyes} />
            </group>
          </group>

          {/* 발은 몸 밖에 둬서 통통 튈 때도 땅에 붙어 있다 */}
          <group ref={footL} position={[-0.18, 0.08, 0.08]}>
            <mesh scale={[1, 0.55, 1.35]} geometry={geo.sphere(0.13, 14, 10)} material={foot} />
          </group>
          <group ref={footR} position={[0.18, 0.08, 0.08]}>
            <mesh scale={[1, 0.55, 1.35]} geometry={geo.sphere(0.13, 14, 10)} material={foot} />
          </group>
        </group>
      </OpacityStepContext>

      <NameTag name={name} status={status} height={TAG_HEIGHT} opacity={opacity} />
      {emote && <EmoteBubble key={emote.at} emote={emote} height={EMOTE_HEIGHT} />}
    </group>
  );
}
```

- [ ] **Step 3: 타입·테스트·빌드 확인**

Run: `npm run typecheck -w @4this/web && npm test -w @4this/web && npm run build`
Expected: 타입 에러 0, 테스트 24개 통과(cw#1 5개 + 이 PR 19개), `✓ built`

- [ ] **Step 4: 메인 화면 스모크 확인**

Run: `npm run dev -w @4this/web` 후 http://localhost:5173 접속
Expected: 캠퍼스 가운데에 캡슐 대신 작은 강아지가 서서 두리번거리고, 가까이 확대하면 머리 위에 `샘플` 이름표가 보인다. 콘솔에 `unmount a root` 경고가 없다(서버가 없으면 `/api/auth/session` 502 에러만 보인다).

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/world/characters
git commit -m "feat: 동물 캐릭터 조립·이름표 LOD·이모지 말풍선·하이라이트 링"
```

---

### Task 6: 캐릭터 갤러리 (`?dev=characters`)

**Files:**

- Modify (전체 교체): `apps/web/src/dev/characters/CharacterGallery.tsx`

**Interfaces:**

- Consumes: `Character`, `PROFESSOR_LOOK`, `ActiveEmote`, `labels.ts`, `SEAT_HEIGHT`, `SITTING_POSES`
- Produces: `export function CharacterGallery()` — `App.tsx`가 `?dev=characters`일 때 그린다(cw#1에서 연결됨)

갤러리: 5줄(강아지·고양이·곰·오리·사자 교수님) × 8칸(포즈) + 악세서리 조합 8개 줄. 앉는 포즈 아래에는 윗면이 `SEAT_HEIGHT`인 상자를 놓아 앉은 높이를 확인한다. 왼쪽 패널에서 색·머리·눈·목, 이모지 8종, 하이라이트 링, 반투명 0.4를 바꾼다. 캐릭터를 누르면 ❤️ 말풍선(onClick 확인).

- [ ] **Step 1: 갤러리 작성**

`apps/web/src/dev/characters/CharacterGallery.tsx` — 파일 전체:

```tsx
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useState, type CSSProperties } from 'react';
import {
  ANIMALS,
  COLOR_KEYS,
  EMOJIS,
  EYES,
  HEADS,
  NECKS,
  POSE_KINDS,
  type Look,
} from '@4this/shared';
import { PROFESSOR_LOOK, type ActiveEmote, type CharacterLook } from '../../world/contracts';
import { Character } from '../../world/characters/Character';
import {
  ANIMAL_LABELS,
  COLOR_LABELS,
  EYES_LABELS,
  HEAD_LABELS,
  NECK_LABELS,
  POSE_LABELS,
} from '../../world/characters/labels';
import { SEAT_HEIGHT, SITTING_POSES } from '../../world/characters/poses';

const GAP = 1.7;
const ROWS: CharacterLook['animal'][] = [...ANIMALS, 'lion'];

/** 악세서리 조합 줄 */
const COMBOS: Look[] = [
  { animal: 'dog', color: 'default', head: 'strawHat', eyes: 'glasses', neck: 'scarf' },
  { animal: 'cat', color: 'pink', head: 'beanie', eyes: 'sunglasses', neck: 'bowtie' },
  { animal: 'bear', color: 'mint', head: 'ribbon', eyes: 'none', neck: 'scarf' },
  { animal: 'duck', color: 'sky', head: 'cap', eyes: 'glasses', neck: 'bowtie' },
  { animal: 'cat', color: 'lemon', head: 'cap', eyes: 'none', neck: 'scarf' },
  { animal: 'bear', color: 'lavender', head: 'strawHat', eyes: 'sunglasses', neck: 'none' },
  { animal: 'dog', color: 'gray', head: 'beanie', eyes: 'none', neck: 'bowtie' },
  { animal: 'duck', color: 'peach', head: 'ribbon', eyes: 'sunglasses', neck: 'scarf' },
];

type Accessories = Pick<Look, 'color' | 'head' | 'eyes' | 'neck'>;

const panel: CSSProperties = {
  position: 'fixed',
  left: 16,
  top: 16,
  width: 300,
  maxHeight: 'calc(100% - 32px)',
  overflow: 'auto',
  padding: '14px 16px',
  borderRadius: 20,
  background: 'rgba(255, 255, 255, 0.88)',
  boxShadow: '0 10px 30px rgba(201, 165, 192, 0.25)',
  fontSize: 12,
  zIndex: 100,
};

const chip = (on: boolean): CSSProperties => ({
  border: 'none',
  margin: '0 4px 4px 0',
  padding: '4px 9px',
  borderRadius: 999,
  background: on ? '#c9bdf2' : '#f4ecfa',
  color: on ? '#fff' : '#5b4d6b',
  fontFamily: 'inherit',
  fontSize: 12,
  cursor: 'pointer',
});

function ChipRow<K extends string>(props: {
  title: string;
  keys: readonly K[];
  labels: Record<K, string>;
  value: K;
  onChange: (k: K) => void;
}) {
  return (
    <div style={{ marginBottom: 8 }}>
      <b style={{ display: 'block', marginBottom: 4 }}>{props.title}</b>
      {props.keys.map((k) => (
        <button key={k} style={chip(props.value === k)} onClick={() => props.onChange(k)}>
          {props.labels[k]}
        </button>
      ))}
    </div>
  );
}

/** 의자 대신 쓰는 상자: 윗면이 SEAT_HEIGHT */
function Stool({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, SEAT_HEIGHT / 2, z - 0.05]} receiveShadow castShadow>
      <boxGeometry args={[0.55, SEAT_HEIGHT, 0.5]} />
      <meshStandardMaterial color="#f9d7e2" />
    </mesh>
  );
}

/**
 * 캐릭터 갤러리 (?dev=characters). 동물 5종 × 포즈 8개 격자 + 악세서리 조합 줄.
 * 왼쪽 패널에서 색·악세서리·이모지·하이라이트·투명도를 바꿔 본다.
 */
export function CharacterGallery() {
  const [acc, setAcc] = useState<Accessories>({
    color: 'default',
    head: 'none',
    eyes: 'none',
    neck: 'none',
  });
  const [emote, setEmote] = useState<ActiveEmote | null>(null);
  const [highlight, setHighlight] = useState(false);
  const [faded, setFaded] = useState(false);
  const opacity = faded ? 0.4 : 1;
  const x0 = (-(POSE_KINDS.length - 1) * GAP) / 2;

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas shadows camera={{ position: [0, 9, 16], fov: 40 }}>
        <color attach="background" args={['#fbeff6']} />
        <hemisphereLight args={['#fff6fb', '#c9e8c4', 1.3]} />
        <directionalLight position={[8, 14, 6]} intensity={2} castShadow />
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <planeGeometry args={[40, 30]} />
          <meshStandardMaterial color="#cdeec4" />
        </mesh>

        {ROWS.map((animal, row) =>
          POSE_KINDS.map((pose, col) => {
            const x = x0 + col * GAP;
            const z = -5 + row * GAP;
            const look: CharacterLook = animal === 'lion' ? PROFESSOR_LOOK : { animal, ...acc };
            return (
              <group key={`${animal}-${pose}`}>
                {SITTING_POSES.has(pose) && <Stool x={x} z={z} />}
                <Character
                  ref={(g) => {
                    g?.position.set(x, 0, z);
                  }}
                  look={look}
                  pose={pose}
                  name={ANIMAL_LABELS[animal]}
                  status={POSE_LABELS[pose]}
                  emote={emote}
                  highlight={highlight}
                  opacity={opacity}
                  onClick={() => setEmote({ emoji: '❤️', at: performance.now() })}
                />
              </group>
            );
          }),
        )}

        {COMBOS.map((look, i) => (
          <Character
            key={`combo-${i}`}
            ref={(g) => {
              g?.position.set(x0 + i * GAP, 0, -5 + ROWS.length * GAP + 0.6);
            }}
            look={look}
            pose="idle"
            name={`조합 ${i + 1}`}
            status={`${HEAD_LABELS[look.head]} · ${EYES_LABELS[look.eyes]} · ${NECK_LABELS[look.neck]}`}
            emote={emote}
            highlight={highlight}
            opacity={opacity}
          />
        ))}
        <OrbitControls makeDefault target={[0, 0.5, 0]} />
      </Canvas>

      <div style={panel}>
        <b style={{ fontSize: 14 }}>🐾 캐릭터 갤러리</b>
        <p style={{ margin: '4px 0 10px', opacity: 0.75 }}>
          줄: 강아지·고양이·곰·오리·사자 / 칸: 포즈 8종. 캐릭터를 누르면 ❤️
        </p>
        <ChipRow
          title="색"
          keys={COLOR_KEYS}
          labels={COLOR_LABELS}
          value={acc.color}
          onChange={(color) => setAcc({ ...acc, color })}
        />
        <ChipRow
          title="머리"
          keys={HEADS}
          labels={HEAD_LABELS}
          value={acc.head}
          onChange={(head) => setAcc({ ...acc, head })}
        />
        <ChipRow
          title="눈"
          keys={EYES}
          labels={EYES_LABELS}
          value={acc.eyes}
          onChange={(eyes) => setAcc({ ...acc, eyes })}
        />
        <ChipRow
          title="목"
          keys={NECKS}
          labels={NECK_LABELS}
          value={acc.neck}
          onChange={(neck) => setAcc({ ...acc, neck })}
        />
        <b style={{ display: 'block', marginBottom: 4 }}>이모지</b>
        {EMOJIS.map((emoji) => (
          <button
            key={emoji}
            style={chip(emote?.emoji === emoji)}
            onClick={() => setEmote({ emoji, at: performance.now() })}
          >
            {emoji}
          </button>
        ))}
        <div style={{ marginTop: 8 }}>
          <button style={chip(highlight)} onClick={() => setHighlight(!highlight)}>
            하이라이트 링
          </button>
          <button style={chip(faded)} onClick={() => setFaded(!faded)}>
            반투명 0.4
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입·린트 확인**

Run: `npm run typecheck -w @4this/web && npm run lint`
Expected: 에러 0

- [ ] **Step 3: 브라우저로 확인**

Run: `npm run dev -w @4this/web` 후 http://localhost:5173/?dev=characters
Expected:

- 5×8 격자. 걷기 칸은 통통 튀며 팔·발을 번갈아 흔들고, 앉는 칸은 분홍 상자 위에 앉아 발을 앞으로 내민다(타이핑: 팔 앞으로·가끔 고개 듦 / 식사: 숟가락 / 독서: 책 / 커피: 컵 / 쉬기: 팔 벌리고 기댐).
- 몇 초마다 눈을 깜빡이고 꼬리를 흔든다. 사자 줄은 갈기·안경·나비넥타이, 타이핑 칸은 20초마다 기지개.
- 패널에서 밀짚모자·안경·목도리·민트를 누르면 네 동물 줄이 모두 바뀐다. 이모지를 누르면 모든 머리 위에 말풍선이 튀어나왔다가 3초 뒤 사라진다. 하이라이트 링·반투명이 켜지고 꺼진다.
- 휠로 가까이 가면 `강아지 · 걷기`처럼 전체 이름표, 멀어지면 이름만, 아주 멀면 숨김.
- 콘솔에 React 경고가 없다.

- [ ] **Step 4: Playwright 스크린샷 (PR에 첨부)**

```bash
npx playwright@1.64.1 install chromium
npx playwright@1.64.1 screenshot --viewport-size "1400,900" --wait-for-timeout 4000 "http://localhost:5173/?dev=characters" gallery.png
```

Expected: `gallery.png`에 왼쪽 패널과 40마리 격자 + 조합 8마리가 보인다. 헤드리스 브라우저는 소프트웨어 WebGL이라 1~2 fps로 느리다(정상). 이 파일은 커밋하지 않고 PR 본문에 붙인다.

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/dev/characters/CharacterGallery.tsx
git commit -m "feat: 캐릭터 갤러리 개발 페이지 (?dev=characters)"
```

---

### Task 7: 전체 검사와 PR

- [ ] **Step 1: 전체 검사**

Run: `npm run format && npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
Expected: 모두 통과. `@4this/web` 테스트 24개(cw#1의 5개 포함, 먼저 머지된 다른 PR의 테스트가 있으면 그만큼 더 많다). 빌드는 `✓ built` (500 kB 청크 경고는 무시).

- [ ] **Step 2: push와 PR**

```bash
git push -u origin th
gh pr create --base main --head th --title "[th#1] 캐릭터" --body-file .github/pull_request_template.md
```

PR 본문에 갤러리 스크린샷을 붙이고, cw(sim에서 `Character` 사용)와 hm(앉는 면 높이 `SEAT_HEIGHT = 0.45` m)을 리뷰어로 지정한다. 머지는 **Create a merge commit**.

- [ ] **Step 3: 머지 후 알림**

머지되면 단톡방에 "th#1 머지됨 — `Character`가 동물 캐릭터로 바뀌었어요. 의자 앉는 면 0.45 m, 캐릭터 키 약 1.07 m" 를 알린다. cw(cw#3)는 `git fetch origin && git merge origin/main`.

---

## Self-Review

- 스펙 §6.1: 동물 4종 + 사자(갈기), 색 9종(`resolveColor`), 악세서리 3부위 동시 조합 → Task 3·4. §6.2: 포즈 8종·눈 깜빡임·꼬리 → Task 1·5. §6.3: 이름표 3단계·이모지 8종 3초·발밑 링 → Task 2·5. §6.4: 사자 `PROFESSOR_LOOK`(안경+나비넥타이)·기지개 → Task 1(`withStretch`)·4·5. 사자 말풍선 클릭은 `onClick`으로 cw가 연결한다.
- 플레이스홀더 없음. 모든 코드 블록은 검증한 파일 그대로다.
- 이름·타입: `Character`/`CharacterProps`/`ActiveEmote`/`PROFESSOR_LOOK`은 cw#1 계약 그대로. 위치·방향은 ref로만 받는다.
