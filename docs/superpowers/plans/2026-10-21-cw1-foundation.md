# [cw#1] 뼈대와 계약 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**담당:** 박찬우 · 브랜치 `cw` · 웨이브 0 (다른 모든 PR이 이 PR을 기다린다. 가장 먼저 머지한다)

**Goal:** 모노레포 뼈대와 도구(TS·ESLint·Prettier·vitest·CI)를 깔고, 4명이 동시에 일할 수 있도록 공용 계약(shared 스키마·소켓 이벤트·캠퍼스 타입과 초기 데이터·placement 시그니처·웹 컴포넌트 props·REST 클라이언트)을 고정한다.

**Architecture:** npm workspaces로 `packages/shared`(순수 TS 계약·로직), `apps/server`(Fastify), `apps/web`(React + R3F)을 나눈다. 다른 사람이 채울 자리(`Character`, `Campus`, placement 함수, 서버 라우트)는 **계약을 지키는 최소 구현**으로 미리 만들어 둔다. 그래서 각자 자기 폴더만 바꾸면 된다.

**Tech Stack:** Node 24 · TypeScript ~5.9.3 · zod ^4.6.7 · vitest ^5.0.5 · React ~19.3.1 · Vite ^8.3.4 · three ^0.186.1 · @react-three/fiber ^9.8.2 · @react-three/drei ^10.7.9 · zustand ^5.0.15 · Fastify ^5.12.7 · tsx ^4.23.15 · ESLint ^10 · typescript-eslint ^8.72 · Prettier ^3.9

**설계 문서:** `docs/superpowers/specs/2026-10-21-4this-world-design.md` (이하 "스펙")

## Global Constraints

- Node `>=24`, 패키지 매니저 npm (workspaces). `package-lock.json`은 커밋한다.
- TypeScript는 `~5.9.3`으로 고정한다(typescript-eslint가 6.1 미만만 지원).
- 모든 패키지는 ESM(`"type": "module"`)이다. `packages/shared`는 빌드하지 않고 `exports: ./src/index.ts`로 바로 쓴다(웹은 Vite, 서버는 tsx가 TS를 읽는다).
- `packages/shared`에서는 DOM·Node API를 쓰지 않는다(`lib: ES2023`, `types: []`).
- 시각 계산은 전부 KST(UTC+9, 서머타임 없음)이고, `packages/shared/src/time.ts`만 쓴다.
- 좌표계: 단위 m, +x 동쪽, +z 남쪽(정문), 캠퍼스 x·z ∈ [-25, 25], `facing` = `rotation.y`, 0이면 +z를 바라본다. 층 높이 3.2 m.
- 코드 스타일: Prettier(작은따옴표, 세미콜론, 100자, trailing comma all). 주석과 사용자 문구는 한국어로 쓴다.
- 커밋 메시지는 `feat:`/`fix:`/`chore:`/`test:`/`docs:` 접두어 + 한국어 설명.

## File Structure

```
(루트)
├─ package.json                 workspaces, 공용 스크립트, 공용 devDependencies
├─ tsconfig.base.json           모든 패키지가 extends
├─ eslint.config.js · .prettierrc.json · .prettierignore · .editorconfig · .nvmrc · .gitattributes
├─ .github/workflows/ci.yml · .github/CODEOWNERS · .github/pull_request_template.md
├─ packages/shared/
│   ├─ package.json · tsconfig.json
│   └─ src/
│       ├─ index.ts             배럴 export
│       ├─ hash.ts              결정적 난수 (FNV-1a)
│       ├─ time.ts              KST 변환
│       ├─ schema/pose.ts       포즈 종류
│       ├─ schema/look.ts       캐릭터 생김새
│       ├─ schema/schedule.ts   일정·종류→장소 매핑·겹침 검사
│       ├─ schema/member.ts     아이디·비밀번호·세션·멤버
│       ├─ schema/api.ts        REST 경로·요청/응답·에러
│       ├─ schema/socket.ts     Socket.IO 이벤트·제한값
│       ├─ campus/types.ts      캠퍼스 데이터 타입
│       ├─ campus/data.ts       초기 캠퍼스 데이터 (hm이 다듬는다)
│       ├─ campus/validate.ts   캠퍼스 데이터 검사
│       └─ placement/{types,index}.ts  placement 계약 (cw#2가 채운다)
├─ apps/server/
│   ├─ package.json · tsconfig.json
│   └─ src/{app.ts, main.ts}    최소 Fastify (wj#1이 키운다)
└─ apps/web/
    ├─ package.json · tsconfig.json · vite.config.ts · index.html · public/assets/.gitkeep
    └─ src/
        ├─ main.tsx · App.tsx
        ├─ world/contracts.ts           Character·Campus props 계약
        ├─ world/WorldCanvas.tsx        Canvas 진입점 (cw#3이 키운다)
        ├─ world/characters/Character.tsx  임시 캐릭터 (th#1이 바꾼다)
        ├─ world/campus/Campus.tsx      임시 캠퍼스 (hm#1이 바꾼다)
        ├─ ui/contracts.ts              오버레이 컴포넌트 props 계약 (th#4가 구현)
        ├─ ui/UiRoot.tsx                화면 UI 뿌리 (th#2~#4가 채운다)
        ├─ ui/tokens.css                파스텔 디자인 토큰
        ├─ dev/characters/CharacterGallery.tsx  ?dev=characters (th#1이 채운다)
        ├─ dev/campus/CampusPreview.tsx         ?dev=campus (hm#1이 채운다)
        ├─ api/http.ts · api/endpoints.ts  REST 클라이언트
        ├─ store/session.ts             세션 스토어
        └─ store/overlay.ts             오버레이 데이터 훅 (cw#3·#4가 채운다)
```

---

### Task 1: 루트 모노레포와 도구

**Files:**
- Create: `package.json`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.editorconfig`, `.nvmrc`, `.gitattributes`

**Interfaces:**
- Produces: 루트 스크립트 `npm run dev | typecheck | lint | format | format:check | test | build`. 각 워크스페이스는 `typecheck`·`test` 스크립트를 가지면 자동으로 포함된다.

- [ ] **Step 1: 브랜치 준비**

```bash
git checkout main && git pull
git checkout -b cw
```

- [ ] **Step 2: 루트 `package.json` 작성**

```json
{
  "name": "4this-world",
  "private": true,
  "type": "module",
  "workspaces": [
    "packages/shared",
    "apps/server",
    "apps/web"
  ],
  "engines": {
    "node": ">=24"
  },
  "scripts": {
    "dev": "concurrently -n server,web -c magenta,cyan \"npm run dev -w @4this/server\" \"npm run dev -w @4this/web\"",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "npm run test --workspaces --if-present",
    "build": "npm run build -w @4this/web"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@types/node": "^24.0.0",
    "concurrently": "^10.0.6",
    "eslint": "^10.13.0",
    "globals": "^17.13.0",
    "prettier": "^3.9.10",
    "typescript": "~5.9.3",
    "typescript-eslint": "^8.72.0",
    "vitest": "^5.0.5"
  }
}
```

- [ ] **Step 3: `tsconfig.base.json` 작성**

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

- [ ] **Step 4: 린트·포맷 설정 작성**

`eslint.config.js`:
```js
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', 'docs/prototype/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
);
```

`.prettierrc.json`:
```json
{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "all" }
```

`.prettierignore`:
```
dist
coverage
node_modules
package-lock.json
docs
apps/web/public/assets
```

`.editorconfig`:
```ini
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

`.nvmrc`:
```
24
```

`.gitattributes` (Windows에서도 LF로 통일하고, 3D 에셋은 바이너리로 취급):
```
* text=auto eol=lf
*.glb binary
*.png binary
*.bin binary
```

- [ ] **Step 5: 설치하고 린트가 도는지 확인**

Run: `npm install && npm run lint`
Expected: 설치가 끝나고 `eslint .`가 에러 없이 끝난다(아직 소스가 없다).

- [ ] **Step 6: 커밋**

```bash
git add package.json package-lock.json tsconfig.base.json eslint.config.js .prettierrc.json .prettierignore .editorconfig .nvmrc .gitattributes
git commit -m "chore: 모노레포와 TS·ESLint·Prettier 설정"
```

---

### Task 2: shared 패키지와 결정적 난수·KST 시각

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/hash.ts`, `packages/shared/src/time.ts`
- Test: `packages/shared/src/hash.test.ts`, `packages/shared/src/time.test.ts`

**Interfaces:**
- Produces:
  - `hashString(s: string): number` — FNV-1a 32비트, 0 이상 2³²−1 이하
  - `rand01(...parts: (string | number)[]): number` — [0, 1) 결정적 난수
  - `KST_OFFSET_MS`, `DAY_MS`, `DAY_START_MIN = 360`, `DAY_END_MIN = 1440`, `SLOT_MIN = 30`, `WEEKDAY_LABELS`
  - `kstDate(t: number): string`, `kstWeekday(t: number): number` (월=0), `kstMinutes(t: number): number`, `kstMidnight(date: string): number`, `toMinutes(hhmm: string): number`, `fromMinutes(min: number): string`

- [ ] **Step 1: 패키지 파일 작성**

`packages/shared/package.json`:
```json
{
  "name": "@4this/shared",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "zod": "^4.6.7"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "lib": ["ES2023"], "types": [] },
  "include": ["src"]
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`packages/shared/src/hash.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { hashString, rand01 } from './hash';

describe('hashString', () => {
  it('FNV-1a 32비트 표준값과 같다', () => {
    expect(hashString('')).toBe(0x811c9dc5);
    expect(hashString('a')).toBe(0xe40c292c);
  });
});

describe('rand01', () => {
  it('같은 입력이면 같은 값, 범위는 [0, 1)', () => {
    const a = rand01('m1', '2026-10-21', 3);
    expect(rand01('m1', '2026-10-21', 3)).toBe(a);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(1);
    expect(rand01('m2', '2026-10-21', 3)).not.toBe(a);
  });
});
```

`packages/shared/src/time.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { fromMinutes, kstDate, kstMidnight, kstMinutes, kstWeekday, toMinutes } from './time';

describe('KST 변환', () => {
  it('UTC 05:10은 KST 수요일 14:10', () => {
    const t = Date.parse('2026-10-21T05:10:00Z');
    expect(kstDate(t)).toBe('2026-10-21');
    expect(kstWeekday(t)).toBe(2);
    expect(kstMinutes(t)).toBe(850);
  });

  it('UTC 15:30은 KST 다음 날 00:30 (자정 경계)', () => {
    const t = Date.parse('2026-10-21T15:30:00Z');
    expect(kstDate(t)).toBe('2026-10-22');
    expect(kstWeekday(t)).toBe(3);
    expect(kstMinutes(t)).toBe(30);
  });

  it('kstMidnight는 그 날짜의 KST 00:00', () => {
    expect(kstMidnight('2026-10-22')).toBe(Date.parse('2026-10-21T15:00:00Z'));
    expect(kstMinutes(kstMidnight('2026-10-22'))).toBe(0);
  });
});

describe('HH:MM', () => {
  it('왕복 변환', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes('24:00')).toBe(1440);
    expect(fromMinutes(850)).toBe('14:10');
    expect(fromMinutes(850.9)).toBe('14:10');
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm install && npm test -w @4this/shared`
Expected: FAIL — `Failed to resolve import "./hash"` / `"./time"`

- [ ] **Step 4: 구현**

`packages/shared/src/hash.ts`:
```ts
/** FNV-1a 32비트 해시. 같은 문자열이면 어느 브라우저·서버에서든 같은 값이 나온다. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 0 이상 1 미만의 결정적 난수. 인자를 '|'로 이어 해시한다. */
export function rand01(...parts: (string | number)[]): number {
  return hashString(parts.join('|')) / 0x100000000;
}
```

`packages/shared/src/time.ts`:
```ts
/** 모든 시각 계산은 한국 시각(UTC+9, 서머타임 없음) 기준이다. */
export const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

/** 시간표가 다루는 범위: 06:00 ~ 24:00, 30분 단위 */
export const DAY_START_MIN = 6 * 60;
export const DAY_END_MIN = 24 * 60;
export const SLOT_MIN = 30;

/** 월=0 … 일=6 */
export const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'] as const;

/** epoch ms → KST 날짜 'YYYY-MM-DD' */
export function kstDate(t: number): string {
  return new Date(t + KST_OFFSET_MS).toISOString().slice(0, 10);
}

/** epoch ms → KST 요일 (월=0 … 일=6) */
export function kstWeekday(t: number): number {
  return (new Date(t + KST_OFFSET_MS).getUTCDay() + 6) % 7;
}

/** epoch ms → KST 자정부터 지난 분 (소수 포함) */
export function kstMinutes(t: number): number {
  return ((((t + KST_OFFSET_MS) % DAY_MS) + DAY_MS) % DAY_MS) / 60_000;
}

/** KST 날짜 'YYYY-MM-DD'의 자정 → epoch ms */
export function kstMidnight(date: string): number {
  return Date.parse(`${date}T00:00:00Z`) - KST_OFFSET_MS;
}

/** 'HH:MM' → 분 */
export function toMinutes(hhmm: string): number {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** 분 → 'HH:MM' (소수점 아래 버림) */
export function fromMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -w @4this/shared`
Expected: PASS — hash 2개, time 4개

- [ ] **Step 6: 커밋**

```bash
git add packages/shared package-lock.json
git commit -m "feat: shared 패키지와 결정적 난수·KST 시각 유틸"
```

---

### Task 3: 캐릭터·일정·멤버 스키마

**Files:**
- Create: `packages/shared/src/schema/pose.ts`, `packages/shared/src/schema/look.ts`, `packages/shared/src/schema/schedule.ts`, `packages/shared/src/schema/member.ts`, `packages/shared/src/campus/types.ts`
- Test: `packages/shared/src/schema/look.test.ts`, `packages/shared/src/schema/schedule.test.ts`

`schedule.ts`가 `PlaceId` 타입을 쓰므로 캠퍼스 타입(`campus/types.ts`)도 이 Task에서 만든다.

**Interfaces:**
- Produces (모두 `@4this/shared`에서 import):
  - `POSE_KINDS`, `type PoseKind = 'idle' | 'walk' | 'stand' | 'sitType' | 'sitEat' | 'sitRead' | 'sitSip' | 'sitRest'`
  - `ANIMALS`, `type Animal`, `HEADS`, `EYES`, `NECKS`, `PALETTE`, `COLOR_KEYS`, `type ColorKey`, `ANIMAL_DEFAULT_COLOR` (`lion` 포함), `LookSchema`, `type Look = { animal; color; head; eyes; neck }`, `DEFAULT_LOOK`, `resolveColor(animal, color): string`, `randomLook(random?): Look`
  - `KINDS`, `type Kind`, `KIND_INFO: Record<Kind, { label; place: PlaceId | null; pose: PoseKind | null; color }>`, `ScheduleItemSchema`, `type ScheduleItem = { day: 0..6; start: 'HH:MM'; end: 'HH:MM'; kind: Kind; title?: string }`, `findOverlap(items): [number, number] | null`, `ScheduleListSchema`
  - `UsernameSchema`, `PasswordSchema`, `MEMBER_STATUSES`, `type MemberStatus`, `PublicMemberSchema`/`PublicMember`, `MeSchema`/`Me`, `SessionSchema`/`Session` (`{kind:'guest'} | {kind:'member', me} | {kind:'admin'}`), `AdminMemberSchema`/`AdminMember`
  - 캠퍼스 타입: `CAMPUS_HALF`, `FLOOR_HEIGHT`, `type Vec2`, `BUILDING_IDS`, `type BuildingId = 'eng' | 'main' | 'lab' | 'cafe'`, `PLACE_IDS`, `type PlaceId`, `type NodeId`, `Seat`, `Place`, `Building`, `Collider`, `Campus`

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/src/schema/look.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { LookSchema, randomLook, resolveColor } from './look';

describe('LookSchema', () => {
  it('정해진 값만 통과한다', () => {
    const ok = { animal: 'cat', color: 'mint', head: 'beanie', eyes: 'glasses', neck: 'scarf' };
    const lion = { animal: 'lion', color: 'default', head: 'none', eyes: 'none', neck: 'none' };
    expect(LookSchema.safeParse(ok).success).toBe(true);
    expect(LookSchema.safeParse(lion).success).toBe(false);
  });
});

describe('randomLook', () => {
  it('항상 유효한 조합을 만든다', () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 200; i++) {
      expect(LookSchema.safeParse(randomLook(random)).success).toBe(true);
    }
  });
});

describe('resolveColor', () => {
  it('default면 동물 기본색, 아니면 팔레트', () => {
    expect(resolveColor('dog', 'default')).toBe('#f6dcc0');
    expect(resolveColor('dog', 'mint')).toBe('#cdeedd');
  });
});
```

`packages/shared/src/schema/schedule.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { findOverlap, ScheduleItemSchema, ScheduleListSchema, type ScheduleItem } from './schedule';

const item = (day: number, start: string, end: string): ScheduleItem => ({
  day,
  start,
  end,
  kind: 'lecture1',
});

describe('ScheduleItemSchema', () => {
  it('30분 단위, 06:00~24:00만 허용한다', () => {
    expect(ScheduleItemSchema.safeParse(item(0, '09:00', '10:30')).success).toBe(true);
    expect(ScheduleItemSchema.safeParse(item(0, '22:00', '24:00')).success).toBe(true);
    expect(ScheduleItemSchema.safeParse(item(0, '05:30', '07:00')).success).toBe(false);
    expect(ScheduleItemSchema.safeParse(item(0, '09:15', '10:00')).success).toBe(false);
    expect(ScheduleItemSchema.safeParse(item(7, '09:00', '10:00')).success).toBe(false);
  });

  it('끝이 시작보다 늦어야 한다', () => {
    expect(ScheduleItemSchema.safeParse(item(0, '10:00', '10:00')).success).toBe(false);
    expect(ScheduleItemSchema.safeParse(item(0, '11:00', '10:00')).success).toBe(false);
  });
});

describe('findOverlap', () => {
  it('맞닿는 일정은 겹치지 않는다', () => {
    expect(findOverlap([item(0, '10:00', '12:00'), item(0, '12:00', '14:00')])).toBeNull();
  });

  it('같은 요일에 겹치면 [앞, 뒤] 인덱스', () => {
    expect(findOverlap([item(0, '11:00', '13:00'), item(0, '10:00', '12:00')])).toEqual([1, 0]);
  });

  it('다른 요일은 겹치지 않는다', () => {
    expect(findOverlap([item(0, '10:00', '12:00'), item(1, '10:00', '12:00')])).toBeNull();
  });
});

describe('ScheduleListSchema', () => {
  it('겹치면 실패한다', () => {
    const list = [item(2, '09:00', '11:00'), item(2, '10:00', '12:00')];
    expect(ScheduleListSchema.safeParse(list).success).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/shared`
Expected: FAIL — `Failed to resolve import "./look"` / `"./schedule"`

- [ ] **Step 3: 포즈·캠퍼스 타입 작성**

`packages/shared/src/schema/pose.ts`:
```ts
/** 캐릭터 포즈. placement가 고르고 Character 컴포넌트가 그린다. */
export const POSE_KINDS = [
  'idle',
  'walk',
  'stand',
  'sitType',
  'sitEat',
  'sitRead',
  'sitSip',
  'sitRest',
] as const;
export type PoseKind = (typeof POSE_KINDS)[number];
```

`packages/shared/src/campus/types.ts`:
```ts
/**
 * 캠퍼스 좌표계
 * - 단위 m, 원점은 캠퍼스 중앙, 바닥은 y = 0
 * - +x 동쪽, +z 남쪽(정문 방향), 캠퍼스는 x·z 모두 [-25, 25]
 * - facing은 Object3D.rotation.y (라디안). 0이면 +z(남쪽)를 바라본다
 * - n층 바닥 높이 = (n - 1) * FLOOR_HEIGHT
 */
export const CAMPUS_HALF = 25;
export const FLOOR_HEIGHT = 3.2;

export type Vec2 = readonly [x: number, z: number];

export const BUILDING_IDS = ['eng', 'main', 'lab', 'cafe'] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

export const PLACE_IDS = [
  'eng-1f',
  'eng-2f',
  'eng-3f',
  'lab-2f',
  'main-1f',
  'main-2f',
  'main-3f',
  'cafe',
] as const;
export type PlaceId = (typeof PLACE_IDS)[number];

export type NodeId = string;

export interface Seat {
  pos: Vec2;
  facing: number;
}

export interface Place {
  id: PlaceId;
  building: BuildingId;
  /** 1부터 */
  floor: number;
  /** 이 층 계단참 (문으로 들어와 페이드 후 나타나는 지점) */
  landing: Vec2;
  /** 좌석. 배열 순서 = 좌석 번호 */
  seats: Seat[];
  /** 좌석이 모자랄 때 쓰는 자리 (스탠딩, 테라스, 배식대 줄) */
  overflow: Seat[];
}

export interface Building {
  id: BuildingId;
  name: string;
  floors: number;
  /** 건물 바닥 사각형 (x, z 최소·최대) */
  min: Vec2;
  max: Vec2;
  /** 문 바로 바깥의 경로 그래프 노드. 건물 앞 대기도 여기서 한다 */
  doorNode: NodeId;
}

export type Collider =
  { kind: 'box'; min: Vec2; max: Vec2 } | { kind: 'circle'; center: Vec2; r: number };

export interface Campus {
  buildings: Record<BuildingId, Building>;
  places: Record<PlaceId, Place>;
  graph: {
    nodes: Record<NodeId, Vec2>;
    edges: ReadonlyArray<readonly [NodeId, NodeId]>;
  };
  /** 정문 안쪽 노드. 등·하교 경로의 끝 */
  gateNode: NodeId;
  /** 정문 바깥, 캐릭터가 나타나고 사라지는 지점 */
  gateSpawn: Vec2;
  /** 정문 옆 게시판 위치 */
  boardPos: Vec2;
  /** 공원 구역 입구 노드 */
  parkNode: NodeId;
  /** 공원 산책 지점 */
  parkSpots: Seat[];
  /** 공원 벤치·연못가 (앉는 곳) */
  benchSpots: Seat[];
  /** 연구동 2F 교수님 자리 */
  professorSeat: Seat;
  /** 직접 조종 시 통과할 수 없는 영역 */
  colliders: Collider[];
}
```

- [ ] **Step 4: 생김새·일정·멤버 스키마 작성**

`packages/shared/src/schema/look.ts`:
```ts
import { z } from 'zod';

export const ANIMALS = ['dog', 'cat', 'bear', 'duck'] as const;
export type Animal = (typeof ANIMALS)[number];

export const HEADS = ['none', 'strawHat', 'beanie', 'ribbon', 'cap'] as const;
export const EYES = ['none', 'glasses', 'sunglasses'] as const;
export const NECKS = ['none', 'scarf', 'bowtie'] as const;

export const PALETTE = {
  pink: '#ffd6e2',
  mint: '#cdeedd',
  sky: '#cfe6fb',
  lavender: '#e2dcf3',
  lemon: '#fff1a8',
  peach: '#ffd9c2',
  cream: '#fbf3e4',
  gray: '#e4e1e8',
} as const;

export const COLOR_KEYS = [
  'default',
  'pink',
  'mint',
  'sky',
  'lavender',
  'lemon',
  'peach',
  'cream',
  'gray',
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

/** 'lion'은 사자 교수님 NPC 전용이라 ANIMALS에 없다 */
export const ANIMAL_DEFAULT_COLOR: Record<Animal | 'lion', string> = {
  dog: '#f6dcc0',
  cat: '#e2dcf3',
  bear: '#e9c7a8',
  duck: '#fff1a8',
  lion: '#f5cf8e',
};

export const LookSchema = z.object({
  animal: z.enum(ANIMALS),
  color: z.enum(COLOR_KEYS),
  head: z.enum(HEADS),
  eyes: z.enum(EYES),
  neck: z.enum(NECKS),
});
export type Look = z.infer<typeof LookSchema>;

export const DEFAULT_LOOK: Look = {
  animal: 'dog',
  color: 'default',
  head: 'none',
  eyes: 'none',
  neck: 'none',
};

export function resolveColor(animal: Animal | 'lion', color: ColorKey): string {
  return color === 'default' ? ANIMAL_DEFAULT_COLOR[animal] : PALETTE[color];
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] as T;
}

export function randomLook(random: () => number = Math.random): Look {
  return {
    animal: pick(ANIMALS, random),
    color: pick(COLOR_KEYS, random),
    head: pick(HEADS, random),
    eyes: pick(EYES, random),
    neck: pick(NECKS, random),
  };
}
```

`packages/shared/src/schema/schedule.ts`:
```ts
import { z } from 'zod';
import type { PlaceId } from '../campus/types';
import { toMinutes } from '../time';
import type { PoseKind } from './pose';

export const KINDS = [
  'lecture1',
  'lecture2',
  'lecture3',
  'liberal',
  'research',
  'library',
  'external',
] as const;
export type Kind = (typeof KINDS)[number];

/** 일정 종류 하나 = 장소 하나. external은 캠퍼스 밖이라 장소가 없다 */
export const KIND_INFO: Record<
  Kind,
  { label: string; place: PlaceId | null; pose: PoseKind | null; color: string }
> = {
  lecture1: { label: '1학년 강의', place: 'eng-1f', pose: 'sitType', color: '#ffd6e2' },
  lecture2: { label: '2학년 강의', place: 'eng-2f', pose: 'sitType', color: '#ffe3c9' },
  lecture3: { label: '3학년 강의', place: 'eng-3f', pose: 'sitType', color: '#fff1a8' },
  liberal: { label: '교양 강의', place: 'main-2f', pose: 'sitType', color: '#cdeedd' },
  research: { label: '연구', place: 'lab-2f', pose: 'sitType', color: '#cfe6fb' },
  library: { label: '도서관', place: 'main-3f', pose: 'sitRead', color: '#e2dcf3' },
  external: { label: '외부 일정', place: null, pose: null, color: '#e4e1e8' },
};

/** 06:00 ~ 24:00, 30분 단위 */
const HHMM = z
  .string()
  .regex(/^(?:(?:0[6-9]|1\d|2[0-3]):(?:00|30)|24:00)$/, '06:00~24:00, 30분 단위로 입력하세요');

export const ScheduleItemSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    start: HHMM,
    end: HHMM,
    kind: z.enum(KINDS),
    title: z.string().trim().max(20).optional(),
  })
  .refine((i) => toMinutes(i.start) < toMinutes(i.end), {
    message: '끝 시각이 시작보다 늦어야 합니다',
    path: ['end'],
  });
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;

/**
 * 같은 요일에 겹치는 두 일정의 인덱스 [앞, 뒤]. 없으면 null.
 * 맞닿는 것(10~12, 12~14)은 겹침이 아니다.
 */
export function findOverlap(items: readonly ScheduleItem[]): [number, number] | null {
  const order = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.day - b.item.day || toMinutes(a.item.start) - toMinutes(b.item.start));
  for (let k = 1; k < order.length; k++) {
    const prev = order[k - 1]!;
    const cur = order[k]!;
    if (prev.item.day === cur.item.day && toMinutes(cur.item.start) < toMinutes(prev.item.end)) {
      return [prev.index, cur.index];
    }
  }
  return null;
}

export const ScheduleListSchema = z
  .array(ScheduleItemSchema)
  .max(60)
  .superRefine((items, ctx) => {
    const overlap = findOverlap(items);
    if (overlap) {
      ctx.addIssue({ code: 'custom', message: '겹치는 일정이 있습니다', path: [overlap[1]] });
    }
  });
```

`packages/shared/src/schema/member.ts`:
```ts
import { z } from 'zod';
import { LookSchema } from './look';
import { ScheduleItemSchema } from './schedule';

export const UsernameSchema = z
  .string()
  .trim()
  .min(2, '2자 이상')
  .max(12, '12자 이하')
  .regex(/^[가-힣a-zA-Z0-9_]+$/, '한글·영문·숫자·_ 만 쓸 수 있습니다');

export const PasswordSchema = z.string().min(6, '6자 이상').max(72, '72자 이하');

export const MEMBER_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

/** 월드에 보이는 멤버 (승인된 사람만) */
export const PublicMemberSchema = z.object({
  id: z.string(),
  username: z.string(),
  look: LookSchema,
  schedules: z.array(ScheduleItemSchema),
});
export type PublicMember = z.infer<typeof PublicMemberSchema>;

/** 로그인한 본인 */
export const MeSchema = z.object({
  id: z.string(),
  username: z.string(),
  status: z.enum(MEMBER_STATUSES),
  look: LookSchema,
});
export type Me = z.infer<typeof MeSchema>;

export const SessionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('guest') }),
  z.object({ kind: z.literal('member'), me: MeSchema }),
  z.object({ kind: z.literal('admin') }),
]);
export type Session = z.infer<typeof SessionSchema>;

/** 관리자 화면의 멤버 한 줄 */
export const AdminMemberSchema = MeSchema.extend({
  createdAt: z.number(),
  scheduleCount: z.number().int(),
});
export type AdminMember = z.infer<typeof AdminMemberSchema>;
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -w @4this/shared`
Expected: PASS — look 3개, schedule 6개 (앞 Task 포함 전체 통과)

- [ ] **Step 6: 커밋**

```bash
git add packages/shared/src
git commit -m "feat: 생김새·일정·멤버 스키마와 캠퍼스 타입"
```

---

### Task 4: REST·소켓 계약

**Files:**
- Create: `packages/shared/src/schema/api.ts`, `packages/shared/src/schema/socket.ts`
- Test: `packages/shared/src/schema/api.test.ts`

**Interfaces:**
- Produces:
  - `API` 경로 상수 (스펙 §8.2 + `session: '/api/auth/session'`) — 서버 라우트 등록과 웹 클라이언트가 이 값을 그대로 쓴다
  - `ERROR_CODES = ['invalid','unauthorized','forbidden','not_found','username_taken','overlap','rate_limited']`, `ApiErrorSchema` (`{ error, message, detail? }`), `OkSchema` (`{ ok: true }`)
  - 요청/응답: `WorldResponseSchema` (`{ serverTime, members: PublicMember[] }`), `SignupRequestSchema`, `LoginRequestSchema`, `AdminLoginRequestSchema`, `PatchMeRequestSchema`, `PutSchedulesRequestSchema` (`{ items }`, 겹침 거부), `SchedulesResponseSchema`, `AdminMembersResponseSchema` (`{ members: AdminMember[] }`), `AdminPatchMemberRequestSchema` (`{ username?, look?, newPassword? }`) + 각 `type`
  - 응답 규칙: `signup`·`login`·`adminLogin`·`session`은 `Session`, `me`·`patchMe`는 `Me`, `logout`·`deleteMe`·`adminDelete`는 `{ ok: true }`, `adminApprove`·`adminReject`·`adminPatch`는 `AdminMember`
  - 소켓: `EMOJIS`, `type Emoji`, `SOCKET_LIMITS = { movePerSec: 15, emotePerSec: 1, controlIdleMs: 60000, stateHz: 10 }`, `ControlMoveSchema`, `EmoteRequestSchema`, `Presence`, `ControlState`, `EmoteEvent`, `ServerToClientEvents`, `ClientToServerEvents`

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/src/schema/api.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { API, PutSchedulesRequestSchema, SignupRequestSchema } from './api';
import { SessionSchema } from './member';

describe('API 경로', () => {
  it('관리자 경로는 id를 인코딩한다', () => {
    expect(API.adminApprove('a/b')).toBe('/api/admin/members/a%2Fb/approve');
  });
});

describe('SignupRequestSchema', () => {
  it('아이디 2~12자, 비밀번호 6자 이상', () => {
    expect(SignupRequestSchema.safeParse({ username: '철수', password: '123456' }).success).toBe(
      true,
    );
    expect(SignupRequestSchema.safeParse({ username: '철', password: '123456' }).success).toBe(
      false,
    );
    expect(SignupRequestSchema.safeParse({ username: '철수', password: '12345' }).success).toBe(
      false,
    );
    expect(SignupRequestSchema.safeParse({ username: '철 수', password: '123456' }).success).toBe(
      false,
    );
  });
});

describe('PutSchedulesRequestSchema', () => {
  it('겹치는 시간표를 거부한다', () => {
    const items = [
      { day: 0, start: '09:00', end: '11:00', kind: 'lecture1' },
      { day: 0, start: '10:00', end: '12:00', kind: 'research' },
    ];
    expect(PutSchedulesRequestSchema.safeParse({ items }).success).toBe(false);
  });
});

describe('SessionSchema', () => {
  it('kind로 구분한다', () => {
    expect(SessionSchema.parse({ kind: 'guest' })).toEqual({ kind: 'guest' });
    expect(SessionSchema.safeParse({ kind: 'member' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/shared`
Expected: FAIL — `Failed to resolve import "./api"`

- [ ] **Step 3: 구현**

`packages/shared/src/schema/api.ts`:
```ts
import { z } from 'zod';
import { LookSchema } from './look';
import { AdminMemberSchema, PasswordSchema, PublicMemberSchema, UsernameSchema } from './member';
import { ScheduleItemSchema, ScheduleListSchema } from './schedule';

/** REST 경로. 서버 라우트와 웹 클라이언트가 같은 값을 쓴다 */
export const API = {
  health: '/api/health',
  world: '/api/world',
  session: '/api/auth/session',
  signup: '/api/auth/signup',
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  adminLogin: '/api/auth/admin',
  me: '/api/me',
  mySchedules: '/api/me/schedules',
  adminMembers: '/api/admin/members',
  adminMember: (id: string) => `/api/admin/members/${encodeURIComponent(id)}`,
  adminApprove: (id: string) => `/api/admin/members/${encodeURIComponent(id)}/approve`,
  adminReject: (id: string) => `/api/admin/members/${encodeURIComponent(id)}/reject`,
  adminBackup: '/api/admin/backup',
} as const;

export const ERROR_CODES = [
  'invalid',
  'unauthorized',
  'forbidden',
  'not_found',
  'username_taken',
  'overlap',
  'rate_limited',
] as const;
export type ApiErrorCode = (typeof ERROR_CODES)[number];

/** 모든 4xx·5xx 응답 본문 */
export const ApiErrorSchema = z.object({
  error: z.enum(ERROR_CODES),
  message: z.string(),
  detail: z.unknown().optional(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;

export const OkSchema = z.object({ ok: z.literal(true) });

export const WorldResponseSchema = z.object({
  serverTime: z.number(),
  members: z.array(PublicMemberSchema),
});
export type WorldResponse = z.infer<typeof WorldResponseSchema>;

export const SignupRequestSchema = z.object({ username: UsernameSchema, password: PasswordSchema });
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const LoginRequestSchema = z.object({ username: z.string().trim(), password: z.string() });
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AdminLoginRequestSchema = z.object({ password: z.string() });
export type AdminLoginRequest = z.infer<typeof AdminLoginRequestSchema>;

export const PatchMeRequestSchema = z.object({
  look: LookSchema.optional(),
  password: z.object({ current: z.string(), next: PasswordSchema }).optional(),
});
export type PatchMeRequest = z.infer<typeof PatchMeRequestSchema>;

export const PutSchedulesRequestSchema = z.object({ items: ScheduleListSchema });
export type PutSchedulesRequest = z.infer<typeof PutSchedulesRequestSchema>;

export const SchedulesResponseSchema = z.object({ items: z.array(ScheduleItemSchema) });
export type SchedulesResponse = z.infer<typeof SchedulesResponseSchema>;

export const AdminMembersResponseSchema = z.object({ members: z.array(AdminMemberSchema) });
export type AdminMembersResponse = z.infer<typeof AdminMembersResponseSchema>;

export const AdminPatchMemberRequestSchema = z.object({
  username: UsernameSchema.optional(),
  look: LookSchema.optional(),
  newPassword: PasswordSchema.optional(),
});
export type AdminPatchMemberRequest = z.infer<typeof AdminPatchMemberRequestSchema>;
```

`packages/shared/src/schema/socket.ts`:
```ts
import { z } from 'zod';

export const EMOJIS = ['👋', '❤️', '😂', '👍', '😮', '😴', '🎉', '☕'] as const;
export type Emoji = (typeof EMOJIS)[number];

export const SOCKET_LIMITS = {
  /** control:move 초당 최대 횟수 (넘치면 버린다) */
  movePerSec: 15,
  /** emote 멤버당 초당 최대 횟수 */
  emotePerSec: 1,
  /** 이 시간 동안 control:move가 없으면 조종이 풀린다 */
  controlIdleMs: 60_000,
  /** control:state 묶음 전송 빈도 */
  stateHz: 10,
} as const;

export const ControlMoveSchema = z.object({
  x: z.number(),
  z: z.number(),
  facing: z.number(),
  moving: z.boolean(),
});
export type ControlMove = z.infer<typeof ControlMoveSchema>;

export const EmoteRequestSchema = z.object({ emoji: z.enum(EMOJIS) });
export type EmoteRequest = z.infer<typeof EmoteRequestSchema>;

export interface Presence {
  /** 접속 중인 승인 멤버 (탭이 여러 개여도 한 번) */
  members: { id: string; controlling: boolean }[];
  /** 로그인하지 않았거나 승인 전인 접속 수 */
  spectators: number;
}

export type ControlState = ControlMove & { memberId: string };

export interface EmoteEvent {
  memberId: string;
  emoji: Emoji;
  /** 서버 시각 epoch ms */
  at: number;
}

export interface ServerToClientEvents {
  presence: (p: Presence) => void;
  'world:changed': () => void;
  'control:state': (states: ControlState[]) => void;
  'control:released': (p: { memberId: string }) => void;
  emote: (e: EmoteEvent) => void;
  time: (p: { serverTime: number }) => void;
}

export interface ClientToServerEvents {
  'control:start': () => void;
  'control:stop': () => void;
  'control:move': (m: ControlMove) => void;
  emote: (r: EmoteRequest) => void;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -w @4this/shared`
Expected: PASS — api 4개 추가

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/schema
git commit -m "feat: REST 경로·요청/응답·소켓 이벤트 계약"
```

---

### Task 5: 초기 캠퍼스 데이터와 검사기

**Files:**
- Create: `packages/shared/src/campus/data.ts`, `packages/shared/src/campus/validate.ts`
- Test: `packages/shared/src/campus/validate.test.ts`

**Interfaces:**
- Consumes: Task 3의 캠퍼스 타입
- Produces:
  - `CAMPUS: Campus` — 스펙 §5.1 배치. 건물 바닥: 본관 `[-8,-19]~[8,-11]`, 공학관 `[12,-9]~[20,5]`, 연구동 `[-20,-19]~[-10,-11]`, 카페 `[-20,7]~[-12,13]`. 노드: `gate, south, plaza, plaza-n, main-door, plaza-e, eng-door, plaza-w, park, nw, lab-door, sw, cafe-door`. 연못 원 충돌체 중심 `[-15,0]` 반지름 3.5
  - `MIN_SEATS: Record<PlaceId, number>`, `validateCampus(c: Campus): string[]` — 문제가 없으면 `[]`. hm은 좌표를 바꿀 때마다 이 테스트가 통과해야 한다

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/src/campus/validate.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { CAMPUS } from './data';
import type { Campus } from './types';
import { validateCampus } from './validate';

describe('validateCampus', () => {
  it('기본 캠퍼스 데이터는 문제가 없다', () => {
    expect(validateCampus(CAMPUS)).toEqual([]);
  });

  it('끊긴 노드와 모자란 좌석을 잡아낸다', () => {
    const broken: Campus = {
      ...CAMPUS,
      graph: { ...CAMPUS.graph, nodes: { ...CAMPUS.graph.nodes, island: [1, 1] } },
      places: { ...CAMPUS.places, cafe: { ...CAMPUS.places.cafe, seats: [] } },
    };
    const errors = validateCampus(broken);
    expect(errors).toContain('노드 island: 정문에서 닿지 않음');
    expect(errors).toContain('cafe: 좌석 0개 < 8');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/shared`
Expected: FAIL — `Failed to resolve import "./data"`

- [ ] **Step 3: 구현**

`packages/shared/src/campus/data.ts`:
```ts
import type { Campus, Place, PlaceId, Seat, Vec2 } from './types';

/**
 * 초기 캠퍼스 데이터. 배치는 설계 문서 §5.1을 따른다.
 * hm#1~#3에서 실제 모델·가구 위치에 맞춰 좌표를 다듬는다. 구조(키·필드)는 바꾸지 않는다.
 */

const N = 0; // 남쪽(+z)을 봄
const S = Math.PI; // 북쪽(-z)을 봄
const E = Math.PI / 2; // 동쪽(+x)을 봄
const W = -Math.PI / 2; // 서쪽(-x)을 봄

const seat = (x: number, z: number, facing: number): Seat => ({ pos: [x, z], facing });

/** 4인 테이블: 북쪽 두 자리는 남쪽을, 남쪽 두 자리는 북쪽을 본다 */
const table4 = (cx: number, cz: number): Seat[] => [
  seat(cx - 0.6, cz - 0.9, N),
  seat(cx + 0.6, cz - 0.9, N),
  seat(cx - 0.6, cz + 0.9, S),
  seat(cx + 0.6, cz + 0.9, S),
];

/** 2인 테이블: 마주 보고 앉는다 */
const table2 = (cx: number, cz: number): Seat[] => [seat(cx, cz - 0.7, N), seat(cx, cz + 0.7, S)];

/** 공학관 강의실 (층마다 같은 배치): 칠판은 북쪽 벽 */
const engClassroom = (id: PlaceId, floor: number): Place => ({
  id,
  building: 'eng',
  floor,
  landing: [19, 4],
  seats: [
    seat(14.5, -5, S),
    seat(17.5, -5, S),
    seat(14.5, -2, S),
    seat(17.5, -2, S),
    seat(14.5, 1, S),
    seat(17.5, 1, S),
  ],
  overflow: [seat(13.5, 3.5, S), seat(15, 3.5, S), seat(16.5, 3.5, S), seat(18, 3.5, S)],
});

const MAIN_LANDING: Vec2 = [6.5, -12];

export const CAMPUS: Campus = {
  buildings: {
    main: {
      id: 'main',
      name: '본관',
      floors: 3,
      min: [-8, -19],
      max: [8, -11],
      doorNode: 'main-door',
    },
    eng: {
      id: 'eng',
      name: '공학관',
      floors: 3,
      min: [12, -9],
      max: [20, 5],
      doorNode: 'eng-door',
    },
    lab: {
      id: 'lab',
      name: '연구동',
      floors: 2,
      min: [-20, -19],
      max: [-10, -11],
      doorNode: 'lab-door',
    },
    cafe: {
      id: 'cafe',
      name: '카페',
      floors: 1,
      min: [-20, 7],
      max: [-12, 13],
      doorNode: 'cafe-door',
    },
  },
  places: {
    'eng-1f': engClassroom('eng-1f', 1),
    'eng-2f': engClassroom('eng-2f', 2),
    'eng-3f': engClassroom('eng-3f', 3),
    'lab-2f': {
      id: 'lab-2f',
      building: 'lab',
      floor: 2,
      landing: [-19, -12],
      seats: [
        seat(-17, -16.4, N),
        seat(-15, -16.4, N),
        seat(-17, -13.6, S),
        seat(-15, -13.6, S),
        seat(-18.2, -15, E),
        seat(-13.8, -15, W),
      ],
      overflow: [seat(-18.5, -12.5, S), seat(-17, -12.2, S), seat(-15.5, -12.2, S)],
    },
    'main-1f': {
      id: 'main-1f',
      building: 'main',
      floor: 1,
      landing: MAIN_LANDING,
      seats: [-5.5, -2, 1.5, 5].flatMap((cx) => table4(cx, -15)),
      overflow: [-6, -4.8, -3.6, -2.4, -1.2, 0].map((x) => seat(x, -18, S)),
    },
    'main-2f': {
      id: 'main-2f',
      building: 'main',
      floor: 2,
      landing: MAIN_LANDING,
      seats: [-16, -14.5, -13].flatMap((z) => [-4.5, -1.5, 1.5, 4.5].map((x) => seat(x, z, S))),
      overflow: [-6, -3, 0, 3].map((x) => seat(x, -12, S)),
    },
    'main-3f': {
      id: 'main-3f',
      building: 'main',
      floor: 3,
      landing: MAIN_LANDING,
      seats: [-3.5, 3.5].flatMap((cx) => table4(cx, -15)),
      overflow: [seat(-7, -17.5, E), seat(-7, -13, E), seat(7, -17.5, W)],
    },
    cafe: {
      id: 'cafe',
      building: 'cafe',
      floor: 1,
      landing: [-13, 10],
      seats: [...table2(-18, 8.6), ...table2(-15, 8.6), ...table2(-18, 11.4), ...table2(-15, 11.4)],
      // 테라스(바깥) 4자리 + 스탠딩 2자리
      overflow: [
        seat(-10, 12, N),
        seat(-8.6, 12, N),
        seat(-10, 13.4, S),
        seat(-8.6, 13.4, S),
        seat(-11, 8, E),
        seat(-10, 8, E),
      ],
    },
  },
  graph: {
    nodes: {
      gate: [0, 22],
      south: [0, 14],
      plaza: [0, 3],
      'plaza-n': [0, -3],
      'main-door': [0, -9.5],
      'plaza-e': [5, 0],
      'eng-door': [10.5, -2],
      'plaza-w': [-5, 0],
      park: [-9, 0],
      nw: [-9, -7],
      'lab-door': [-15, -9.5],
      sw: [-5, 10],
      'cafe-door': [-10.5, 10],
    },
    edges: [
      ['gate', 'south'],
      ['south', 'plaza'],
      ['plaza', 'plaza-n'],
      ['plaza-n', 'main-door'],
      ['plaza', 'plaza-e'],
      ['plaza-e', 'eng-door'],
      ['plaza', 'plaza-w'],
      ['plaza-w', 'park'],
      ['plaza-w', 'nw'],
      ['nw', 'lab-door'],
      ['south', 'sw'],
      ['sw', 'cafe-door'],
      ['park', 'sw'],
    ],
  },
  gateNode: 'gate',
  gateSpawn: [0, 26],
  boardPos: [3.5, 21],
  parkNode: 'park',
  parkSpots: [
    seat(-10, -4, N),
    seat(-11, 4, N),
    seat(-19, -5, N),
    seat(-21, 1, N),
    seat(-19, 5, N),
    seat(-13, -5.5, N),
    seat(-13, 5.5, N),
    seat(-8, 1, N),
  ],
  benchSpots: [seat(-15, -4.6, N), seat(-15, 4.6, S), seat(-19.6, 0, E)],
  professorSeat: seat(-11.5, -16, W),
  colliders: [
    { kind: 'box', min: [-8, -19], max: [8, -11] },
    { kind: 'box', min: [12, -9], max: [20, 5] },
    { kind: 'box', min: [-20, -19], max: [-10, -11] },
    { kind: 'box', min: [-20, 7], max: [-12, 13] },
    { kind: 'circle', center: [-15, 0], r: 3.5 },
  ],
};
```

`packages/shared/src/campus/validate.ts`:
```ts
import { CAMPUS_HALF, PLACE_IDS, type Campus, type PlaceId, type Vec2 } from './types';

/** 설계 문서 §5.2의 최소 좌석 수 */
export const MIN_SEATS: Record<PlaceId, number> = {
  'eng-1f': 6,
  'eng-2f': 6,
  'eng-3f': 6,
  'lab-2f': 6,
  'main-1f': 16,
  'main-2f': 12,
  'main-3f': 8,
  cafe: 8,
};

const inside = (p: Vec2, min: Vec2, max: Vec2) =>
  p[0] >= min[0] && p[0] <= max[0] && p[1] >= min[1] && p[1] <= max[1];

/** 캠퍼스 데이터의 앞뒤가 맞는지 검사한다. 문제가 없으면 빈 배열 */
export function validateCampus(c: Campus): string[] {
  const errors: string[] = [];
  const nodes = c.graph.nodes;

  for (const [a, b] of c.graph.edges) {
    if (!nodes[a]) errors.push(`간선 ${a}-${b}: 노드 ${a} 없음`);
    if (!nodes[b]) errors.push(`간선 ${a}-${b}: 노드 ${b} 없음`);
  }
  for (const key of ['gateNode', 'parkNode'] as const) {
    if (!nodes[c[key]]) errors.push(`${key} ${c[key]} 없음`);
  }
  for (const b of Object.values(c.buildings)) {
    if (!nodes[b.doorNode]) errors.push(`${b.id}.doorNode ${b.doorNode} 없음`);
  }

  // 모든 노드가 gateNode에서 닿아야 한다
  const adj = new Map<string, string[]>();
  for (const [a, b] of c.graph.edges) {
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  const seen = new Set([c.gateNode]);
  const queue = [c.gateNode];
  while (queue.length) {
    for (const next of adj.get(queue.shift()!) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  for (const id of Object.keys(nodes)) {
    if (!seen.has(id)) errors.push(`노드 ${id}: 정문에서 닿지 않음`);
  }

  for (const id of PLACE_IDS) {
    const place = c.places[id];
    const building = c.buildings[place.building];
    if (place.id !== id) errors.push(`${id}: id 불일치 (${place.id})`);
    if (place.floor < 1 || place.floor > building.floors)
      errors.push(`${id}: ${place.floor}층 없음`);
    if (place.seats.length < MIN_SEATS[id]) {
      errors.push(`${id}: 좌석 ${place.seats.length}개 < ${MIN_SEATS[id]}`);
    }
    if (!inside(place.landing, building.min, building.max)) errors.push(`${id}: landing이 건물 밖`);
    place.seats.forEach((s, i) => {
      if (!inside(s.pos, building.min, building.max)) errors.push(`${id}: 좌석 ${i}가 건물 밖`);
    });
  }

  const all: [string, Vec2][] = [
    ...Object.entries(nodes),
    ...c.parkSpots.map((s, i): [string, Vec2] => [`parkSpots[${i}]`, s.pos]),
    ...c.benchSpots.map((s, i): [string, Vec2] => [`benchSpots[${i}]`, s.pos]),
  ];
  for (const [name, p] of all) {
    if (Math.abs(p[0]) > CAMPUS_HALF || Math.abs(p[1]) > CAMPUS_HALF)
      errors.push(`${name}: 캠퍼스 밖`);
  }
  return errors;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -w @4this/shared`
Expected: PASS — validate 2개 추가

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/campus
git commit -m "feat: 초기 캠퍼스 데이터와 검사기"
```

---

### Task 6: placement 계약과 사자 교수님

**Files:**
- Create: `packages/shared/src/placement/types.ts`, `packages/shared/src/placement/index.ts`, `packages/shared/src/index.ts`
- Test: `packages/shared/src/placement/index.test.ts`

**Interfaces:**
- Produces:
  - `type MemberForPlacement = PublicMember`, `ComputeDayInput { members; date; campus }`
  - `Pose { position: [x, y, z]; facing; pose: PoseKind; placeId: PlaceId | 'park' | 'gate' | 'door' | 'transit'; floor; status; opacity }`
  - `BoardEntry { memberId; username; title; until: 'HH:MM' }`
  - `Segment { from; to }` (cw#2가 판별 유니온으로 넓힌다. 다른 모듈은 내부를 읽지 않는다), `DayPlan { date; weekday; usernames: ReadonlyMap<string,string>; segments: ReadonlyMap<string, readonly Segment[]> }`
  - `computeDay(input): DayPlan` (지금은 빈 계획), `sampleAt(plan, memberId, t): Pose | null` (지금은 항상 null), `boardAt(plan, t): BoardEntry[]` (지금은 `[]`) — **cw#2가 같은 시그니처로 구현을 채운다**
  - `PROFESSOR_HOURS`, `professorAt(t, campus): Pose | null` — 평일 09:00~18:00 연구동 2F
  - `packages/shared/src/index.ts` 배럴: 위 모든 모듈을 다시 export

- [ ] **Step 1: 실패하는 테스트 작성**

`packages/shared/src/placement/index.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { CAMPUS } from '../campus/data';
import { boardAt, computeDay, professorAt, sampleAt } from './index';

const at = (iso: string) => Date.parse(iso);

describe('placement 계약', () => {
  it('computeDay는 날짜·요일·멤버 목록을 담는다', () => {
    const plan = computeDay({
      date: '2026-10-21',
      campus: CAMPUS,
      members: [
        {
          id: 'm1',
          username: '철수',
          look: { animal: 'dog', color: 'default', head: 'none', eyes: 'none', neck: 'none' },
          schedules: [],
        },
      ],
    });
    expect(plan.date).toBe('2026-10-21');
    expect(plan.weekday).toBe(2);
    expect(plan.usernames.get('m1')).toBe('철수');
    expect(sampleAt(plan, 'm1', at('2026-10-21T14:00:00+09:00'))).toBeNull();
    expect(boardAt(plan, at('2026-10-21T14:00:00+09:00'))).toEqual([]);
  });
});

describe('professorAt', () => {
  it('평일 09:00~18:00에만 연구동 2층에 있다', () => {
    const p = professorAt(at('2026-10-21T09:00:00+09:00'), CAMPUS);
    expect(p?.placeId).toBe('lab-2f');
    expect(p?.position[1]).toBeCloseTo(3.2);
    expect(professorAt(at('2026-10-21T08:59:00+09:00'), CAMPUS)).toBeNull();
    expect(professorAt(at('2026-10-21T18:00:00+09:00'), CAMPUS)).toBeNull();
    expect(professorAt(at('2026-10-24T12:00:00+09:00'), CAMPUS)).toBeNull(); // 토요일
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/shared`
Expected: FAIL — `Failed to resolve import "./index"`

- [ ] **Step 3: 구현**

`packages/shared/src/placement/types.ts`:
```ts
import type { Campus, PlaceId } from '../campus/types';
import type { PublicMember } from '../schema/member';
import type { PoseKind } from '../schema/pose';

/** placement 입력. 승인된 멤버만 넣는다 */
export type MemberForPlacement = PublicMember;

export interface ComputeDayInput {
  members: readonly MemberForPlacement[];
  /** KST 날짜 'YYYY-MM-DD' */
  date: string;
  campus: Campus;
}

/** 한 시각의 캐릭터 상태. 월드는 이것만 보고 그린다 */
export interface Pose {
  /** 월드 좌표 [x, y, z]. y는 층 바닥 높이 */
  position: [number, number, number];
  facing: number;
  pose: PoseKind;
  /** 지금 있는 곳. 'door'는 건물 앞 대기, 'transit'은 걷는 중 */
  placeId: PlaceId | 'park' | 'gate' | 'door' | 'transit';
  /** 1부터. 바깥은 1 */
  floor: number;
  /** 이름표 문구 (설계 문서 §7.1, §9) */
  status: string;
  /** 0~1. 건물 출입·정문 출입 페이드 */
  opacity: number;
}

/** 정문 게시판 한 줄 */
export interface BoardEntry {
  memberId: string;
  username: string;
  /** 일정 제목, 없으면 '외부 일정' */
  title: string;
  /** 끝나는 시각 'HH:MM' */
  until: string;
}

/**
 * 하루 계획의 한 구간. 시각은 KST 자정부터 지난 분.
 * cw#2가 필요한 필드를 더한 판별 유니온으로 넓힌다. 다른 모듈은 Segment 내부를 읽지 않는다.
 */
export interface Segment {
  from: number;
  to: number;
}

/** computeDay 결과. 날짜·시간표가 바뀔 때만 다시 만든다 */
export interface DayPlan {
  date: string;
  /** 0=월 … 6=일 */
  weekday: number;
  /** 아이디 → 표시 이름 */
  usernames: ReadonlyMap<string, string>;
  segments: ReadonlyMap<string, readonly Segment[]>;
}
```

`packages/shared/src/placement/index.ts`:
```ts
import { FLOOR_HEIGHT, type Campus } from '../campus/types';
import { kstMinutes, kstWeekday } from '../time';
import type { BoardEntry, ComputeDayInput, DayPlan, Pose } from './types';

export * from './types';

/**
 * 하루 계획을 만든다. (cw#1: 빈 계획을 돌려주는 계약용 구현, cw#2에서 §7 규칙으로 채운다)
 */
export function computeDay(input: ComputeDayInput): DayPlan {
  const weekday = kstWeekday(Date.parse(`${input.date}T12:00:00+09:00`));
  return {
    date: input.date,
    weekday,
    usernames: new Map(input.members.map((m) => [m.id, m.username])),
    segments: new Map(input.members.map((m) => [m.id, []])),
  };
}

/** 시각 t(epoch ms)에 멤버가 어디서 무엇을 하는지. 캠퍼스에 없으면 null (cw#2에서 구현) */
export function sampleAt(_plan: DayPlan, _memberId: string, _t: number): Pose | null {
  return null;
}

/** 시각 t에 외부 일정 중인 멤버 목록 (cw#2에서 구현) */
export function boardAt(_plan: DayPlan, _t: number): BoardEntry[] {
  return [];
}

export const PROFESSOR_HOURS = { start: 9 * 60, end: 18 * 60 } as const;

/** 사자 교수님: 평일 09:00~18:00 연구동 2F 책상 */
export function professorAt(t: number, campus: Campus): Pose | null {
  const min = kstMinutes(t);
  if (kstWeekday(t) > 4 || min < PROFESSOR_HOURS.start || min >= PROFESSOR_HOURS.end) return null;
  const { pos, facing } = campus.professorSeat;
  return {
    position: [pos[0], FLOOR_HEIGHT, pos[1]],
    facing,
    pose: 'sitType',
    placeId: 'lab-2f',
    floor: 2,
    status: '교수님',
    opacity: 1,
  };
}
```

`packages/shared/src/index.ts`:
```ts
export * from './hash';
export * from './time';
export * from './schema/pose';
export * from './schema/look';
export * from './schema/schedule';
export * from './schema/member';
export * from './schema/api';
export * from './schema/socket';
export * from './campus/types';
export * from './campus/data';
export * from './campus/validate';
export * from './placement/index';
```

- [ ] **Step 4: 통과와 타입 확인**

Run: `npm test -w @4this/shared && npm run typecheck -w @4this/shared`
Expected: PASS — shared 전체 23개, 타입 에러 0

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src
git commit -m "feat: placement 계약과 사자 교수님 시간"
```

---

### Task 7: 최소 서버

**Files:**
- Create: `apps/server/package.json`, `apps/server/tsconfig.json`, `apps/server/src/app.ts`, `apps/server/src/main.ts`
- Test: `apps/server/src/app.test.ts`

**Interfaces:**
- Consumes: `API.health`
- Produces: `buildApp(): FastifyInstance` — wj#1이 옵션(설정·DB)을 받도록 시그니처를 넓힌다. `main.ts`는 `PORT`(기본 8080)에서 듣는다

- [ ] **Step 1: 패키지 파일 작성**

`apps/server/package.json`:
```json
{
  "name": "@4this/server",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/main.ts",
    "start": "tsx src/main.ts",
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@4this/shared": "*",
    "fastify": "^5.12.7",
    "tsx": "^4.23.15"
  }
}
```

`apps/server/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "lib": ["ES2023"], "types": ["node"] },
  "include": ["src"]
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`apps/server/src/app.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { API } from '@4this/shared';
import { buildApp } from './app';

describe('buildApp', () => {
  it('health 응답', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: API.health });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm install && npm test -w @4this/server`
Expected: FAIL — `Failed to resolve import "./app"`

- [ ] **Step 4: 구현**

`apps/server/src/app.ts`:
```ts
import Fastify, { type FastifyInstance } from 'fastify';
import { API } from '@4this/shared';

/** 서버 앱을 만든다. 테스트는 listen 없이 app.inject()로 부른다 */
export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.get(API.health, async () => ({ ok: true }));
  return app;
}
```

`apps/server/src/main.ts`:
```ts
import { buildApp } from './app';

const port = Number(process.env.PORT ?? 8080);
const app = buildApp();
await app.listen({ port, host: '0.0.0.0' });
console.log(`4thIS-world server on :${port}`);
```

- [ ] **Step 5: 통과와 실행 확인**

Run: `npm test -w @4this/server && npm run typecheck -w @4this/server`
Expected: PASS 1개, 타입 에러 0

Run: `npm run start -w @4this/server` 후 다른 터미널에서 `curl http://localhost:8080/api/health`
Expected: `{"ok":true}` (확인 후 Ctrl+C)

- [ ] **Step 6: 커밋**

```bash
git add apps/server package-lock.json
git commit -m "feat: 최소 Fastify 서버와 health 라우트"
```

---

### Task 8: 웹 뼈대·컴포넌트 계약·REST 클라이언트

**Files:**
- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/public/assets/.gitkeep`, `apps/web/src/main.tsx`, `apps/web/src/App.tsx`, `apps/web/src/ui/tokens.css`, `apps/web/src/world/contracts.ts`, `apps/web/src/world/WorldCanvas.tsx`, `apps/web/src/world/characters/Character.tsx`, `apps/web/src/world/campus/Campus.tsx`, `apps/web/src/ui/contracts.ts`, `apps/web/src/ui/UiRoot.tsx`, `apps/web/src/store/overlay.ts`, `apps/web/src/dev/characters/CharacterGallery.tsx`, `apps/web/src/dev/campus/CampusPreview.tsx`, `apps/web/src/api/http.ts`, `apps/web/src/api/endpoints.ts`, `apps/web/src/store/session.ts`
- Test: `apps/web/src/api/http.test.ts`, `apps/web/src/store/session.test.ts`

**Interfaces:**
- Consumes: shared 전체
- Produces:
  - `world/contracts.ts`: `LionLook`, `PROFESSOR_LOOK`, `CharacterLook = Look | LionLook`, `ActiveEmote { emoji; at }`, `CharacterProps { look; pose; name?; status?; emote?; highlight?; opacity?; onClick?; ref?: Ref<Group> }`, `FloorKey = \`${BuildingId}:${number}\``, `CampusProps { now; occupiedFloors; focusedBuilding; hiddenAboveFloor; onBuildingClick? }`
  - `world/characters/Character.tsx`: `export function Character(props: CharacterProps)` — **th#1이 같은 이름·경로·props로 교체**. Group 원점이 발밑, 위치는 ref로 sim이 움직인다
  - `world/campus/Campus.tsx`: `export function Campus(props: CampusProps)` — **hm#1이 같은 이름·경로·props로 교체**. 조명·하늘도 Campus 안에 있다
  - `world/WorldCanvas.tsx`: `export function WorldCanvas()` — cw#3이 키운다
  - `ui/contracts.ts`: `PresenceEntry`, `PresencePanelProps`, `EmoteBarProps`, `ControlButtonProps`, `BoardPanelProps`, `ConnectionBadgeProps`, `BuildingPanelProps`, `TopBarProps`, `OverlayProps` — **th#4가 `apps/web/src/ui/overlay/<이름>.tsx`에 같은 이름의 컴포넌트로 구현** (예: `PresencePanel`)
  - `ui/UiRoot.tsx`: `export function UiRoot()` — App이 월드 위에 그린다. **th가 채운다**(모달·오버레이). 실시간 데이터는 `useOverlayProps()`로 받는다
  - `store/overlay.ts`: `export function useOverlayProps(): OverlayProps` — 지금은 빈 기본값. **cw#3·cw#4가 실제 데이터로 채운다**. th는 이 훅만 부르고 스토어 내부를 모른다
  - `dev/characters/CharacterGallery.tsx` (`?dev=characters`, th), `dev/campus/CampusPreview.tsx` (`?dev=campus`, hm): 단독 개발 페이지
  - `api/http.ts`: `class ApiError { status; code: ApiErrorCode; message; detail? }`, `request(method, url, schema, body?)`
  - `api/endpoints.ts`: `api.world/session/signup/login/logout/adminLogin/me/patchMe/deleteMe/mySchedules/putMySchedules/adminMembers/adminApprove/adminReject/adminPatch/adminDelete`, `api.backupUrl`
  - `store/session.ts`: `useSession` (zustand) — `{ session: Session; loading; refresh(): Promise<void>; setSession(s) }`
  - 개발 서버: `npm run dev -w @4this/web` → http://localhost:5173, `/api`·`/socket.io`는 8080으로 프록시

- [ ] **Step 1: 패키지·빌드 설정 작성**

`apps/web/package.json`:
```json
{
  "name": "@4this/web",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@4this/shared": "*",
    "@react-three/drei": "^10.7.9",
    "@react-three/fiber": "^9.8.2",
    "react": "~19.3.1",
    "react-dom": "~19.3.1",
    "three": "^0.186.1",
    "zod": "^4.6.7",
    "zustand": "^5.0.15"
  },
  "devDependencies": {
    "@testing-library/react": "^16.3.3",
    "@types/react": "~19.3.0",
    "@types/react-dom": "~19.3.0",
    "@types/three": "^0.186.0",
    "@vitejs/plugin-react": "^6.1.2",
    "jsdom": "^30.1.3",
    "vite": "^8.3.4"
  }
}
```

`apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["vite/client"]
  },
  "include": ["src", "vite.config.ts"]
}
```

`apps/web/vite.config.ts`:
```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080',
      '/socket.io': { target: 'http://localhost:8080', ws: true },
    },
  },
  test: { environment: 'jsdom' },
});
```

`apps/web/index.html`:
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>4thIS-world</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

빈 파일 `apps/web/public/assets/.gitkeep`을 만든다.

- [ ] **Step 2: 실패하는 테스트 작성**

`apps/web/src/api/http.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionSchema } from '@4this/shared';
import { ApiError, request } from './http';

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('request', () => {
  it('성공 응답을 스키마로 검증해 돌려준다', async () => {
    const fetchMock = respond(200, { kind: 'guest' });
    vi.stubGlobal('fetch', fetchMock);
    await expect(request('GET', '/api/auth/session', SessionSchema)).resolves.toEqual({
      kind: 'guest',
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', {
      method: 'GET',
      credentials: 'same-origin',
      headers: undefined,
      body: undefined,
    });
  });

  it('본문이 있으면 JSON으로 보낸다', async () => {
    const fetchMock = respond(200, { kind: 'guest' });
    vi.stubGlobal('fetch', fetchMock);
    await request('POST', '/x', SessionSchema, { a: 1 });
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      headers: { 'content-type': 'application/json' },
      body: '{"a":1}',
    });
  });

  it('에러 본문을 ApiError로 바꾼다', async () => {
    vi.stubGlobal('fetch', respond(409, { error: 'overlap', message: '겹침' }));
    const err = await request('PUT', '/x', SessionSchema, {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'overlap', message: '겹침' });
  });
});
```

`apps/web/src/store/session.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSession } from './session';

afterEach(() => vi.unstubAllGlobals());

describe('useSession', () => {
  it('refresh는 서버 세션을 담는다', async () => {
    const me = {
      id: 'm1',
      username: '철수',
      status: 'approved',
      look: { animal: 'dog', color: 'default', head: 'none', eyes: 'none', neck: 'none' },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ kind: 'member', me }))),
    );
    await useSession.getState().refresh();
    expect(useSession.getState()).toMatchObject({
      loading: false,
      session: { kind: 'member', me },
    });
  });

  it('실패하면 guest', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await useSession.getState().refresh();
    expect(useSession.getState().session).toEqual({ kind: 'guest' });
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm install && npm test -w @4this/web`
Expected: FAIL — `Failed to resolve import "./http"` / `"./session"`

- [ ] **Step 4: REST 클라이언트와 세션 스토어 구현**

`apps/web/src/api/http.ts`:
```ts
import type { z } from 'zod';
import { ApiErrorSchema, type ApiErrorCode } from '@4this/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** 같은 출처 쿠키 세션으로 요청하고, 응답을 shared 스키마로 검증한다 */
export async function request<S extends z.ZodType>(
  method: Method,
  url: string,
  schema: S,
  body?: unknown,
): Promise<z.infer<S>> {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const parsed = ApiErrorSchema.safeParse(data);
    if (parsed.success) {
      throw new ApiError(res.status, parsed.data.error, parsed.data.message, parsed.data.detail);
    }
    throw new ApiError(res.status, 'invalid', `HTTP ${res.status}`);
  }
  return schema.parse(data);
}
```

`apps/web/src/api/endpoints.ts`:
```ts
import {
  AdminMemberSchema,
  AdminMembersResponseSchema,
  API,
  MeSchema,
  OkSchema,
  SchedulesResponseSchema,
  SessionSchema,
  WorldResponseSchema,
  type AdminLoginRequest,
  type AdminPatchMemberRequest,
  type LoginRequest,
  type PatchMeRequest,
  type PutSchedulesRequest,
  type SignupRequest,
} from '@4this/shared';
import { request } from './http';

/** 서버 REST 전부. 화면 코드는 fetch 대신 이것만 쓴다 */
export const api = {
  world: () => request('GET', API.world, WorldResponseSchema),
  session: () => request('GET', API.session, SessionSchema),
  signup: (body: SignupRequest) => request('POST', API.signup, SessionSchema, body),
  login: (body: LoginRequest) => request('POST', API.login, SessionSchema, body),
  logout: () => request('POST', API.logout, OkSchema),
  adminLogin: (body: AdminLoginRequest) => request('POST', API.adminLogin, SessionSchema, body),
  me: () => request('GET', API.me, MeSchema),
  patchMe: (body: PatchMeRequest) => request('PATCH', API.me, MeSchema, body),
  deleteMe: () => request('DELETE', API.me, OkSchema),
  mySchedules: () => request('GET', API.mySchedules, SchedulesResponseSchema),
  putMySchedules: (body: PutSchedulesRequest) =>
    request('PUT', API.mySchedules, SchedulesResponseSchema, body),
  adminMembers: () => request('GET', API.adminMembers, AdminMembersResponseSchema),
  adminApprove: (id: string) => request('POST', API.adminApprove(id), AdminMemberSchema),
  adminReject: (id: string) => request('POST', API.adminReject(id), AdminMemberSchema),
  adminPatch: (id: string, body: AdminPatchMemberRequest) =>
    request('PATCH', API.adminMember(id), AdminMemberSchema, body),
  adminDelete: (id: string) => request('DELETE', API.adminMember(id), OkSchema),
  /** 백업은 파일 다운로드라 링크로 연다: <a href={api.backupUrl} download> */
  backupUrl: API.adminBackup,
};
```

`apps/web/src/store/session.ts`:
```ts
import { create } from 'zustand';
import type { Session } from '@4this/shared';
import { api } from '../api/endpoints';

interface SessionState {
  session: Session;
  loading: boolean;
  /** 서버에 물어 세션을 새로 고친다. 실패하면 guest */
  refresh: () => Promise<void>;
  /** 로그인·가입 응답을 그대로 넣는다 */
  setSession: (session: Session) => void;
}

export const useSession = create<SessionState>()((set) => ({
  session: { kind: 'guest' },
  loading: true,
  refresh: async () => {
    try {
      set({ session: await api.session(), loading: false });
    } catch {
      set({ session: { kind: 'guest' }, loading: false });
    }
  },
  setSession: (session) => set({ session }),
}));
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -w @4this/web`
Expected: PASS — http 3개, session 2개

- [ ] **Step 6: 컴포넌트 계약과 임시 구현 작성**

`apps/web/src/world/contracts.ts`:
```ts
import type { Ref } from 'react';
import type { Group } from 'three';
import type { BuildingId, Emoji, Look, PoseKind } from '@4this/shared';

/** 사자 교수님 전용 생김새 (학생은 고를 수 없다) */
export interface LionLook {
  animal: 'lion';
  color: 'default';
  head: 'none';
  eyes: 'glasses';
  neck: 'bowtie';
}
export const PROFESSOR_LOOK: LionLook = {
  animal: 'lion',
  color: 'default',
  head: 'none',
  eyes: 'glasses',
  neck: 'bowtie',
};
export type CharacterLook = Look | LionLook;

export interface ActiveEmote {
  emoji: Emoji;
  /** 받은 시각 performance.now() ms. 3초 뒤 사라진다 */
  at: number;
}

/**
 * th가 만드는 <Character>의 props. 위치·방향은 props가 아니라 ref로 받은 Group을
 * sim(cw)이 매 프레임 직접 움직인다. Character는 Group 원점(발밑)에 서 있게 그린다.
 */
export interface CharacterProps {
  look: CharacterLook;
  pose: PoseKind;
  name?: string;
  status?: string;
  emote?: ActiveEmote | null;
  /** 내 캐릭터 발밑 링 */
  highlight?: boolean;
  /** 0~1, 출입 페이드 */
  opacity?: number;
  onClick?: () => void;
  ref?: Ref<Group>;
}

/** 'eng:2'처럼 건물과 층 */
export type FloorKey = `${BuildingId}:${number}`;

/** hm이 만드는 <Campus>의 props */
export interface CampusProps {
  /** 지금 시각 epoch ms (하늘·조명·밤 창문) */
  now: number;
  /** 사람이 있는 층 (밤 창문 불빛) */
  occupiedFloors: ReadonlySet<FloorKey>;
  /** 클릭해서 다가간 건물 */
  focusedBuilding: BuildingId | null;
  /** 이 층보다 위층은 숨긴다. null이면 모두 보임 */
  hiddenAboveFloor: number | null;
  onBuildingClick?: (id: BuildingId) => void;
}
```

`apps/web/src/world/characters/Character.tsx`:
```tsx
import { resolveColor } from '@4this/shared';
import type { CharacterProps } from '../contracts';

/**
 * 임시 캐릭터 (cw#1). th#1에서 동물 조립 캐릭터로 바꾼다. props 계약은 contracts.ts를 따른다.
 */
export function Character({ look, opacity = 1, onClick, ref }: CharacterProps) {
  return (
    <group ref={ref} onClick={onClick}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <capsuleGeometry args={[0.35, 0.5, 4, 12]} />
        <meshStandardMaterial
          color={resolveColor(look.animal, look.color)}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}
```

`apps/web/src/world/campus/Campus.tsx`:
```tsx
import { BUILDING_IDS, CAMPUS, CAMPUS_HALF, FLOOR_HEIGHT } from '@4this/shared';
import type { CampusProps } from '../contracts';

/**
 * 임시 캠퍼스 (cw#1): 잔디 바닥 + 건물 자리 상자. hm#1~#4에서 실제 캠퍼스로 바꾼다.
 */
export function Campus({ onBuildingClick }: CampusProps) {
  return (
    <group>
      <ambientLight intensity={0.8} />
      <directionalLight position={[20, 30, 10]} intensity={1.5} castShadow />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[CAMPUS_HALF * 2, CAMPUS_HALF * 2]} />
        <meshStandardMaterial color="#cdeec4" />
      </mesh>
      {BUILDING_IDS.map((id) => {
        const b = CAMPUS.buildings[id];
        const w = b.max[0] - b.min[0];
        const d = b.max[1] - b.min[1];
        const h = b.floors * FLOOR_HEIGHT;
        return (
          <mesh
            key={id}
            position={[(b.min[0] + b.max[0]) / 2, h / 2, (b.min[1] + b.max[1]) / 2]}
            onClick={() => onBuildingClick?.(id)}
          >
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color="#f9c9d4" transparent opacity={0.35} />
          </mesh>
        );
      })}
    </group>
  );
}
```

`apps/web/src/world/WorldCanvas.tsx`:
```tsx
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { DEFAULT_LOOK } from '@4this/shared';
import { Campus } from './campus/Campus';
import { Character } from './characters/Character';

/**
 * 3D 월드 진입점 (cw#1 뼈대). cw#3에서 sim이 멤버들을 배치한다.
 */
export function WorldCanvas() {
  return (
    <Canvas shadows camera={{ position: [38, 34, 40], fov: 32 }}>
      <color attach="background" args={['#fbeff6']} />
      <Campus
        now={Date.now()}
        occupiedFloors={new Set()}
        focusedBuilding={null}
        hiddenAboveFloor={null}
      />
      <Character look={DEFAULT_LOOK} pose="idle" name="샘플" />
      <OrbitControls makeDefault maxPolarAngle={Math.PI * 0.42} />
    </Canvas>
  );
}
```

`apps/web/src/ui/contracts.ts`:
```ts
import type { BoardEntry, BuildingId, Emoji, Look } from '@4this/shared';

/**
 * th가 만드는 표시용 컴포넌트의 props. 스토어·소켓 연결은 cw가 한다.
 * 파일 위치: apps/web/src/ui/overlay/<컴포넌트명>.tsx, 이름 있는 export
 */

export interface PresenceEntry {
  id: string;
  username: string;
  look: Look;
  status: string;
  controlling: boolean;
  isMe: boolean;
}

/** PresencePanel: 접속자 목록. 모바일에서는 하단 시트 */
export interface PresencePanelProps {
  entries: PresenceEntry[];
  spectators: number;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (memberId: string) => void;
}

/** EmoteBar: 이모지 8개 버튼 */
export interface EmoteBarProps {
  disabled: boolean;
  onEmote: (emoji: Emoji) => void;
}

/** ControlButton: 조종하기 / 자동으로 */
export interface ControlButtonProps {
  controlling: boolean;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}

/** BoardPanel: 정문 게시판을 눌렀을 때 뜨는 외부 일정 목록 */
export interface BoardPanelProps {
  entries: BoardEntry[];
  onClose: () => void;
}

/** ConnectionBadge: 소켓 상태 */
export interface ConnectionBadgeProps {
  state: 'connected' | 'reconnecting';
}

/** BuildingPanel: 건물을 클릭했을 때 층 버튼 + 지금 있는 사람 */
export interface BuildingPanelProps {
  building: BuildingId;
  name: string;
  floors: number;
  hiddenAboveFloor: number | null;
  onFloor: (floor: number | null) => void;
  people: { id: string; username: string; status: string; floor: number }[];
  onClose: () => void;
}

/** TopBar: 로고·시각·로그인/메뉴 */
export interface TopBarProps {
  /** '수 14:10' */
  clock: string;
  /** '☀️' 같은 하늘 아이콘 */
  skyIcon: string;
}

/** UiRoot가 그리는 메인 오버레이 전체. cw의 useOverlayProps()가 만든다 */
export interface OverlayProps {
  topBar: TopBarProps;
  presence: PresencePanelProps;
  emoteBar: EmoteBarProps;
  control: ControlButtonProps;
  connection: ConnectionBadgeProps;
  /** 게시판을 열었을 때만 */
  board: BoardPanelProps | null;
  /** 건물을 클릭했을 때만 */
  building: BuildingPanelProps | null;
  /** 승인된 로그인 멤버면 true (조종·이모지 바 표시) */
  canControl: boolean;
}
```

`apps/web/src/store/overlay.ts`:
```ts
import type { OverlayProps } from '../ui/contracts';

const noop = () => {};

/**
 * 오버레이에 넣을 실시간 데이터와 핸들러. th의 UiRoot가 부른다.
 * cw#1: 빈 기본값. cw#3(시계·건물 패널)과 cw#4(접속자·조종·이모지·게시판)에서 채운다.
 */
export function useOverlayProps(): OverlayProps {
  return {
    topBar: { clock: '', skyIcon: '☀️' },
    presence: { entries: [], spectators: 0, collapsed: false, onToggle: noop, onSelect: noop },
    emoteBar: { disabled: true, onEmote: noop },
    control: { controlling: false, disabled: true, onStart: noop, onStop: noop },
    connection: { state: 'connected' },
    board: null,
    building: null,
    canControl: false,
  };
}
```

`apps/web/src/ui/UiRoot.tsx`:
```tsx
/**
 * 화면 UI의 뿌리 (cw#1 빈 구현). th#2~#4가 로그인·꾸미기·시간표·관리자·오버레이를 여기에 단다.
 * 실시간 데이터는 store/overlay.ts의 useOverlayProps()로 받는다.
 */
export function UiRoot() {
  return null;
}
```

`apps/web/src/dev/characters/CharacterGallery.tsx`:
```tsx
/** 캐릭터 갤러리 개발 페이지 (?dev=characters). th#1이 채운다 */
export function CharacterGallery() {
  return <p style={{ padding: 24 }}>캐릭터 갤러리 준비 중</p>;
}
```

`apps/web/src/dev/campus/CampusPreview.tsx`:
```tsx
/** 캠퍼스 미리보기 개발 페이지 (?dev=campus). hm#1이 채운다 */
export function CampusPreview() {
  return <p style={{ padding: 24 }}>캠퍼스 미리보기 준비 중</p>;
}
```

- [ ] **Step 7: 앱 진입점과 토큰 작성**

`apps/web/src/ui/tokens.css`:
```css
/* 4thIS-world 파스텔 토큰. th가 화면을 만들며 다듬는다 */
:root {
  --bg: #fbeff6;
  --ink: #5b4d6b;
  --ink-soft: #8c7f9c;
  --card: rgba(255, 255, 255, 0.85);
  --pink: #ffb3c7;
  --lavender: #c9bdf2;
  --mint: #bfe6b4;
  --sky: #cfe6fb;
  --lemon: #fff1a8;
  --danger: #ff8fa3;
  --radius-sm: 10px;
  --radius: 18px;
  --radius-lg: 24px;
  --shadow: 0 10px 30px rgba(201, 165, 192, 0.25);
  --font: 'Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
}

* {
  box-sizing: border-box;
}

html,
body,
#root,
.app {
  margin: 0;
  height: 100%;
  background: var(--bg);
  color: var(--ink);
  font-family: var(--font);
  overflow: hidden;
}
```

`apps/web/src/App.tsx`:
```tsx
import { useEffect } from 'react';
import { CampusPreview } from './dev/campus/CampusPreview';
import { CharacterGallery } from './dev/characters/CharacterGallery';
import { useSession } from './store/session';
import { UiRoot } from './ui/UiRoot';
import { WorldCanvas } from './world/WorldCanvas';
import './ui/tokens.css';

/** ?dev=characters, ?dev=campus 는 개발용 단독 페이지 */
const devPage = new URLSearchParams(window.location.search).get('dev');

export function App() {
  const refresh = useSession((s) => s.refresh);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (devPage === 'characters') return <CharacterGallery />;
  if (devPage === 'campus') return <CampusPreview />;

  return (
    <div className="app">
      <WorldCanvas />
      <UiRoot />
    </div>
  );
}
```

`apps/web/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 8: 타입·빌드·화면 확인**

Run: `npm run typecheck && npm run build`
Expected: 타입 에러 0, `✓ built` (500 kB 청크 경고는 무시해도 된다)

Run: `npm run dev` 후 http://localhost:5173 접속
Expected: 분홍빛 배경에 잔디 판, 반투명 분홍 상자 4개(건물 자리), 가운데 캡슐 하나. 드래그로 회전된다.

- [ ] **Step 9: 커밋**

```bash
git add apps/web package-lock.json
git commit -m "feat: 웹 뼈대·컴포넌트 계약·REST 클라이언트"
```

---

### Task 9: CI·코드 소유·PR 템플릿·README

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/CODEOWNERS`, `.github/pull_request_template.md`
- Modify: `README.md` (main에 이미 있는 소개 글 끝에 개발 안내를 덧붙인다)

**Interfaces:**
- Produces: PR마다 `typecheck → lint → format:check → test → build → (Dockerfile이 있으면) docker build`. CODEOWNERS로 폴더별 리뷰어 자동 지정

- [ ] **Step 1: CI 작성**

`.github/workflows/ci.yml`:
```yaml
name: ci

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run format:check
      - run: npm test
      - run: npm run build
      - name: docker build
        if: hashFiles('Dockerfile') != ''
        run: docker build -t 4this-world .
```

- [ ] **Step 2: 코드 소유 작성 (스펙 §12.2)**

GitHub 아이디는 `docs/superpowers/plans/2026-10-21-00-overview.md`의 "팀" 표를 따른다.

`.github/CODEOWNERS`:
```
# 스펙 §12.2 파일 소유. 아래쪽 줄이 우선한다.
# cw=박찬우 @ssenu · wj=이우진 @WJ_GITHUB_ID · hm=박효민 @phmin819 · th=김태희 @kiimth236

*                                   @ssenu

/apps/server/                       @WJ_GITHUB_ID
/Dockerfile                         @WJ_GITHUB_ID
/docker-compose.yml                 @WJ_GITHUB_ID
/.env.example                       @WJ_GITHUB_ID

/packages/shared/src/campus/        @phmin819
/apps/web/src/world/campus/         @phmin819
/apps/web/src/dev/campus/           @phmin819
/apps/web/public/assets/            @phmin819
/CREDITS.md                         @phmin819

/apps/web/src/world/characters/     @kiimth236
/apps/web/src/dev/characters/       @kiimth236
/apps/web/src/ui/                   @kiimth236

# 공용 계약은 항상 cw 승인
/packages/shared/src/schema/        @ssenu
/apps/web/src/world/contracts.ts    @ssenu
/apps/web/src/ui/contracts.ts       @ssenu
```

- [ ] **Step 3: PR 템플릿 작성**

`.github/pull_request_template.md`:
```markdown
## 무엇을 했나

<!-- 플랜의 PR 번호와 제목: 예) [cw#2] placement 엔진 -->

## 플랜 체크

- [ ] `docs/superpowers/plans/` 해당 플랜의 모든 Task 체크박스 완료
- [ ] `npm run typecheck && npm run lint && npm run format:check && npm test` 로컬 통과
- [ ] 내 소유가 아닌 파일을 고쳤다면 그 소유자를 리뷰어로 지정
- [ ] `packages/shared/src/schema`를 바꿨다면 4명 모두에게 알리고 cw 승인 받음

## 확인 방법

<!-- 리뷰어가 직접 돌려 볼 명령이나 화면 -->

## 스크린샷 (화면·3D 변경이면)
```

- [ ] **Step 4: README에 개발 안내 덧붙이기**

`README.md`의 소개 부분(맨 위부터 "더 보기"까지)은 그대로 두고, 파일 끝에 아래 내용을 덧붙인다:
````markdown
## 개발

Node 24 이상이 필요합니다.

```bash
npm install
npm run dev        # 서버 :8080 + 웹 :5173 (http://localhost:5173)
```

| 명령                | 하는 일                                     |
| ------------------- | ------------------------------------------- |
| `npm run typecheck` | 모든 워크스페이스 타입 검사                 |
| `npm run lint`      | ESLint                                      |
| `npm run format`    | Prettier로 고치기 (`format:check`는 검사만) |
| `npm test`          | 모든 워크스페이스 테스트                    |
| `npm run build`     | 웹 빌드 (`apps/web/dist`)                   |

## 구조

| 경로                            | 내용                                          | 담당                    |
| ------------------------------- | --------------------------------------------- | ----------------------- |
| `packages/shared`               | 스키마·소켓 계약·캠퍼스 데이터·placement 엔진 | cw (캠퍼스 데이터는 hm) |
| `apps/server`                   | Fastify + Socket.IO + SQLite                  | wj                      |
| `apps/web/src/world/campus`     | 캠퍼스 3D                                     | hm                      |
| `apps/web/src/world/characters` | 캐릭터 3D                                     | th                      |
| `apps/web/src/world/sim`        | 시간표대로 움직이기·조종                      | cw                      |
| `apps/web/src/ui`               | 화면 UI                                       | th                      |

## 협업 규칙

- 개인 브랜치 `cw` · `wj` · `hm` · `th` → `main`으로 PR. 머지는 **Create a merge commit**
- 머지 뒤 다음 작업 전에 `git fetch origin && git merge origin/main`
- CI 통과 + 다른 멤버 1명 승인. `packages/shared/src/schema`가 바뀌면 cw 승인 필수
````

- [ ] **Step 5: 전체 검사**

Run: `npm run format && npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
Expected: 모두 통과 (shared 23개, server 1개, web 5개)

- [ ] **Step 6: 커밋, push, PR**

```bash
git add .github README.md
git commit -m "chore: CI·CODEOWNERS·PR 템플릿·README"
git push -u origin cw
gh pr create --base main --head cw --title "[cw#1] 뼈대와 계약" --body-file .github/pull_request_template.md
```

PR 본문의 체크박스를 채우고, 나머지 세 명을 리뷰어로 지정한다. 머지 방식은 **Create a merge commit**이다.

- [ ] **Step 7: 머지 후 팀에 알림**

머지되면 단톡방에 "cw#1 머지됨 — 각자 `git fetch origin && git checkout <내 브랜치> && git merge origin/main` 후 웨이브 1 시작"을 알린다.
