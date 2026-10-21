# [cw#2] placement 엔진 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**담당:** 박찬우 · 브랜치 `cw` · 웨이브 1 · 선행: cw#1 (머지 후 시작)

**Goal:** 스펙 §7 전체(시간표 + 시각 → 위치·포즈·이름표)를 `packages/shared/src/placement`의 순수 함수로 구현한다. cw#1이 고정한 `computeDay` / `sampleAt` / `boardAt` 시그니처는 그대로 두고 속을 채운다.

**Architecture:** 계산을 세 단계로 나눈다. (1) `segments.ts`가 멤버 하루를 "구간(Block)" 목록으로 바꾼다(등교·수업·빈 시간·외부 일정·하교 규칙). (2) `seats.ts`가 같은 장소의 구간을 모아 구간 색칠로 좌석을 준다. (3) `build.ts`가 구간 사이 이동 경로(그래프 최단 경로 + 건물 출입 페이드)를 붙여 `Segment` 판별 유니온 목록을 만든다. `sampleAt`은 이진 탐색으로 구간 하나를 찾아 그 시각의 `Pose`만 계산한다(공원 산책도 상태 없이 칸 번호로 계산). 랜덤은 전부 `rand01`/`hashString` 기반이라 어느 브라우저에서 계산해도 같다.

**Tech Stack:** TypeScript ~5.9.3 · vitest ^5.0.5 (DOM·Node API 없음)

**설계 문서:** `docs/superpowers/specs/2026-10-21-4this-world-design.md` (이하 "스펙") §6.4, §7, §11

## Global Constraints

- Node `>=24`, npm workspaces, `package-lock.json` 커밋. TypeScript는 `~5.9.3` 고정.
- 모든 패키지는 ESM. `@4this/shared`는 빌드하지 않고 TS 소스를 바로 import한다.
- 공용 타입·스키마·경로·이벤트는 **`@4this/shared`에서만** 가져온다. 같은 타입을 다른 곳에 다시 정의하지 않는다.
- 시각은 KST, `packages/shared/src/time.ts`만 쓴다. 랜덤이 화면 결과에 영향을 주면 `rand01()`(결정적)을 쓴다.
- 좌표계: 단위 m, +x 동쪽, +z 남쪽(정문), 캠퍼스 x·z ∈ [-25, 25], `facing` = `rotation.y`(0이면 +z를 봄), 층 높이 3.2 m.
- 코드 스타일: Prettier(작은따옴표, 세미콜론, 100자). 주석과 사용자 문구는 한국어.
- 커밋: `feat:`/`fix:`/`chore:`/`test:`/`docs:` + 한국어 설명. PR 제목: `[cw#2] placement 엔진`.
- 남의 소유 파일(스펙 §12.2, `.github/CODEOWNERS`)은 고치지 않는다. 이 PR은 `packages/shared/src/placement/**`와 `packages/shared/src/hash.ts`(cw 소유)만 바꾼다.
- **이 PR 고유:**
  - `packages/shared`에서는 DOM·Node API(`performance`, `window`, `process`)를 쓰지 않는다.
  - 결정성: `Math.random()`·`Date.now()`·`localeCompare()`를 쓰지 않는다(`localeCompare`는 실행 환경마다 정렬이 다를 수 있다). 문자열 비교는 `<`/`>`로 한다.
  - `computeDay(input): DayPlan`, `sampleAt(plan, memberId, t): Pose | null`, `boardAt(plan, t): BoardEntry[]`, `Pose`·`BoardEntry`·`DayPlan` 모양은 cw#1 그대로다. `Segment`만 판별 유니온으로 넓힌다(다른 모듈은 `Segment` 내부를 읽지 않는다).
  - `Segment`의 시각은 KST 자정부터 지난 **분**(소수 포함), `sampleAt`의 `t`는 epoch ms다.
  - 성능: 30명 × 하루 `computeDay` 50 ms 안, `sampleAt`은 구간 이진 탐색(프레임당 30번 호출해도 가볍게).

## File Structure

```
packages/shared/src/
├─ hash.ts                       (수정) rand01에 mix32 섞기 추가
└─ placement/
    ├─ types.ts                  (수정) Segment 판별 유니온: stay · walk · park · away, WalkLeg
    ├─ constants.ts              걷기 1.5 m/s, 페이드 0.3초, 5분 전 등교, 20분·10분 규칙, 점심, 공원 칸
    ├─ status.ts                 이름표 문구 (공강·카페 ☕·점심 🍚·등교 중·하교 중·외출 중, 강의 제목)
    ├─ graph.ts                  다익스트라 최단 경로 + 캐시, 경로 길이, 가장 가까운 노드, facing
    ├─ segments.ts               멤버 하루 → Block 목록 (등교·빈 시간·점심·외부 일정·하교)
    ├─ seats.ts                  장소별 (시작, memberId) 정렬 구간 색칠, 넘침 자리
    ├─ build.ts                  Block → Segment (경로·건물 출입 페이드·머무는 자리)
    ├─ sample.ts                 Segment + 분 → Pose (걷기 보간, 공원 2분 칸 산책)
    ├─ board.ts                  boardAt (정문 게시판)
    ├─ demo.ts                   demoMembers(n): 개발·테스트용 결정적 가짜 멤버
    ├─ index.ts                  (수정) computeDay·sampleAt 조립, professorAt 기지개, 다시 내보내기
    ├─ test-fixtures.ts          테스트용 직선 캠퍼스 LINE_CAMPUS, member(), wed(), idWithFree()
    └─ *.test.ts                 graph · segments · seats · sample · index · campus
```

## Interfaces (이 PR이 다른 PR에 내놓는 것)

`@4this/shared`에서 import한다.

- 기존 계약 그대로: `computeDay(input: ComputeDayInput): DayPlan`, `sampleAt(plan: DayPlan, memberId: string, t: number): Pose | null`, `boardAt(plan: DayPlan, t: number): BoardEntry[]`, `professorAt(t: number, campus: Campus): Pose | null`, `PROFESSOR_HOURS`
- 새로 내보냄:
  - 타입 `Segment = StaySegment | WalkSegment | ParkSegment | AwaySegment`, `WalkLeg` (다른 모듈은 읽지 않는다)
  - `WALK_SPEED_MPS = 1.5`, `FADE_MS = 300`
  - `shortestPath(campus, from: NodeId, to: NodeId): readonly NodeId[]`, `nearestNode(campus, p: Vec2): NodeId`, `pathLength(pts: readonly Vec2[]): number`, `facingOf(from: Vec2, to: Vec2): number` — cw#4의 "조종 해제 후 걸어서 복귀"가 쓴다
  - `STATUS` (`free: '공강'`, `cafe: '카페 ☕'`, `lunch: '점심 🍚'`, `arriving: '등교 중'`, `leaving: '하교 중'`, `goingOut: '외출 중'`), `classStatus(kind, title?): string`
  - `demoMembers(n: number): MemberForPlacement[]` — cw#3의 `?dev=sim`, 다른 사람의 개발 페이지가 쓴다
  - `PROFESSOR_STRETCH = { everyMin: 15, seconds: 20 }` — 이 동안 `professorAt`은 `pose: 'stand'`, `status: '기지개 쭉~'`
  - `mix32(h: number): number` (`hash.ts`)
- `Pose.placeId` 값의 뜻: `PlaceId`(좌석·넘침 자리), `'door'`(건물 앞 대기), `'park'`(공원), `'gate'`(정문에서 나타나거나 사라지는 중·정문 앞 대기), `'transit'`(걷는 중)

### 동작 요약 (스펙 §7.2 해석)

| 상황 | 결과 |
|---|---|
| 그날 캠퍼스 일정 없음 | 하루 종일 `null`. 외부 일정은 게시판에만 |
| 등교 | 첫 캠퍼스 일정 5분 전 `gateSpawn`에서 페이드 인 → 걷기. 앞에 외부 일정이 있으면 첫 캠퍼스 일정 직전 외부 일정이 끝날 때 |
| 빈 시간 < 20분 | 다음 장소 건물 문 노드 옆(0.8 m, 사람마다 각도 다름)에서 `stand`, 다음이 외부 일정이면 정문 노드 |
| 빈 시간 점심 | `[max(빈시작,11:30), min(빈끝, 13:30, 그+60분))` → `main-1f` 좌석 `sitEat` |
| 빈 시간 나머지 | `mix32(hashString(memberId + date)) % 2` → 공원 / 카페(`sitSip`) 하루 고정 |
| 10분 미만 조각 | 앞 조각에 붙임(첫 조각이면 뒤에) |
| 외부 일정 | 시작 시각에 정문으로 걸어가 페이드 아웃(`외출 중`) → `null`. 게시판은 시작 시각부터 끝까지 |
| 하교 | 마지막 캠퍼스 일정 끝에 정문으로(`하교 중`) |
| 같은 일정이 맞닿음 | 종류·제목이 같으면 하나로 합쳐 자리를 옮기지 않는다 |
| 건물 출입 | 좌석 → 계단참 걷기 → 0.3초 페이드 아웃 → 문 노드에서 0.3초 페이드 인 → 그래프 경로 … (들어갈 때는 반대) |
| 같은 건물 다른 층 | 계단참에서 페이드 → 목표 층 계단참에서 나타남 |
| 공원 | 2분 칸마다 `rand01(memberId|date, 칸)`; 1/3 확률로 벤치(`sitRest`), 아니면 산책 지점(`idle`) |
| 넘침 | 좌석 다음 번호부터 `overflow` 자리, `stand`(카페 테라스 앞 4자리는 `sitSip`) |
| 사자 교수님 | 평일 09–18시. 15분마다 20초 `stand` + `기지개 쭉~` |

---

### Task 1: rand01 고르게 섞기

FNV-1a는 끝 글자만 다른 입력(`'…|405'`, `'…|406'` …)의 해시가 규칙적으로 늘어서서, 공원 칸처럼 연속 번호로 난수를 뽑으면 한쪽으로 몰린다(실제로 어떤 멤버는 75칸 연속 벤치에 한 번도 앉지 않았다). murmur3 `fmix32`로 한 번 섞는다. `hashString` 값은 바뀌지 않는다.

**Files:**
- Modify: `packages/shared/src/hash.ts`
- Test: `packages/shared/src/hash.test.ts`

**Interfaces:**
- Produces: `mix32(h: number): number`, `rand01(...parts)`(시그니처 그대로, 분포만 좋아짐)

- [ ] **Step 1: 브랜치 준비**

```bash
git fetch origin && git checkout cw && git merge origin/main
npm install
```

- [ ] **Step 2: 실패하는 테스트 추가** — `packages/shared/src/hash.test.ts` 끝에 붙인다

```ts
describe('rand01 분포', () => {
  it('끝 숫자만 다른 연속 입력도 고르게 퍼진다', () => {
    for (const seed of ['x0|2026-10-21', 'x3|2026-10-21', 'abc|2026-10-22']) {
      let low = 0;
      for (let slot = 405; slot < 480; slot++) if (rand01(seed, slot) < 1 / 3) low++;
      expect(low / 75).toBeGreaterThan(0.18);
      expect(low / 75).toBeLessThan(0.5);
    }
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -w @4this/shared -- hash`
Expected: FAIL — `rand01 분포 > 끝 숫자만 다른 연속 입력도 고르게 퍼진다` `AssertionError: expected 0 to be greater than 0.18`

- [ ] **Step 4: 구현** — `packages/shared/src/hash.ts` 전체

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

/**
 * murmur3 fmix32. FNV-1a는 끝 글자만 다른 입력('…|41', '…|42')의 해시가 규칙적으로 늘어서서
 * 그대로 쓰면 난수가 한쪽으로 몰린다. 이 함수로 한 번 섞으면 고르게 흩어진다.
 */
export function mix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** 0 이상 1 미만의 결정적 난수. 인자를 '|'로 이어 해시하고 섞는다. */
export function rand01(...parts: (string | number)[]): number {
  return mix32(hashString(parts.join('|'))) / 0x100000000;
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -w @4this/shared`
Expected: PASS — 24개

- [ ] **Step 6: 커밋**

```bash
git add packages/shared/src/hash.ts packages/shared/src/hash.test.ts
git commit -m "fix: rand01이 연속 입력에도 고르게 퍼지도록 mix32로 섞기"
```

> 이 변경은 `rand01`을 쓰는 다른 사람(hm의 장식 배치 등)의 결과 값도 바꾼다. PR 본문과 단톡방에 "rand01 값이 바뀜(분포 개선), 시그니처 동일"을 알린다.

---

### Task 2: 상수·이름표 문구·경로 그래프·테스트 캠퍼스

**Files:**
- Create: `packages/shared/src/placement/constants.ts`, `packages/shared/src/placement/status.ts`, `packages/shared/src/placement/graph.ts`, `packages/shared/src/placement/test-fixtures.ts`
- Test: `packages/shared/src/placement/graph.test.ts`

**Interfaces:**
- Consumes: `Campus`, `NodeId`, `Vec2`, `CAMPUS` (cw#1), `Kind` (cw#1)
- Produces:
  - `constants.ts`: `WALK_SPEED_MPS`, `WALK_M_PER_MIN`, `FADE_MS`, `FADE_MIN`, `ARRIVE_EARLY_MIN = 5`, `SHORT_GAP_MIN = 20`, `LUNCH_START_MIN = 690`, `LUNCH_END_MIN = 810`, `LUNCH_MAX_MIN = 60`, `MIN_PIECE_MIN = 10`, `PARK_SLOT_MIN = 2`, `PARK_SIT_CHANCE = 1/3`, `WAIT_SPREAD_M = 0.8`
  - `status.ts`: `STATUS`, `classStatus(kind: Exclude<Kind,'external'>, title?: string): string`, `externalTitle(title?: string): string`
  - `graph.ts`: `dist(a, b)`, `cumulative(pts): number[]`, `pathLength(pts)`, `shortestPath(campus, from, to)`, `nearestNode(campus, p)`, `facingOf(from, to)`
  - `test-fixtures.ts`: `LINE_CAMPUS: Campus`(모든 노드가 z=0 위 15 m 간격: `gate(0)`·`eng-door(15)`·`main-door(30)`·`lab-door(45)`·`cafe-door(60)`·`park(75)`, `gateSpawn [-15,0]`, 장소마다 계단참 `[x,-3]`, 좌석 `[x,-6]`·`[x,-9]`, 넘침 `[x,-12]`(카페는 `[x+1,-3]`·`[x+2,-3]`)), `member(schedules, id?, username?)`, `wed('HH:MM:SS')`, `WED = '2026-10-21'`, `WEDNESDAY = 2`

- [ ] **Step 1: 테스트 캠퍼스 픽스처 작성** — `packages/shared/src/placement/test-fixtures.ts` (Task 3에서 `idWithFree`를 더한다)

```ts
import type { Campus, Place, PlaceId, Seat } from '../campus/types';
import type { ScheduleItem } from '../schema/schedule';
import type { MemberForPlacement } from './types';

/**
 * 테스트용 직선 캠퍼스. 모든 노드가 z = 0 위에 15 m 간격으로 있다(걸어서 10초).
 *
 *   spawn(-15) ─ gate(0) ─ eng-door(15) ─ main-door(30) ─ lab-door(45) ─ cafe-door(60) ─ park(75)
 *
 * 건물은 문 노드 북쪽(-z)에 있고, 계단참은 문에서 3 m, 좌석은 계단참에서 3 m·6 m 북쪽이다.
 * 좌석 2개 + 넘침 1개. 카페만 넘침 2개이고, 카페 넘침(테라스)은 SITTING_OVERFLOW에 따라 앉는다.
 */
const S = Math.PI; // 북쪽(-z)을 봄
const seat = (x: number, z: number): Seat => ({ pos: [x, z], facing: S });

function place(id: PlaceId, building: Place['building'], floor: number, x: number): Place {
  return {
    id,
    building,
    floor,
    landing: [x, -3],
    seats: [seat(x, -6), seat(x, -9)],
    overflow: building === 'cafe' ? [seat(x + 1, -3), seat(x + 2, -3)] : [seat(x, -12)],
  };
}

export const LINE_CAMPUS: Campus = {
  buildings: {
    eng: {
      id: 'eng',
      name: '공학관',
      floors: 3,
      min: [12, -14],
      max: [18, -2],
      doorNode: 'eng-door',
    },
    main: {
      id: 'main',
      name: '본관',
      floors: 3,
      min: [27, -14],
      max: [33, -2],
      doorNode: 'main-door',
    },
    lab: {
      id: 'lab',
      name: '연구동',
      floors: 2,
      min: [42, -14],
      max: [48, -2],
      doorNode: 'lab-door',
    },
    cafe: {
      id: 'cafe',
      name: '카페',
      floors: 1,
      min: [57, -14],
      max: [63, -2],
      doorNode: 'cafe-door',
    },
  },
  places: {
    'eng-1f': place('eng-1f', 'eng', 1, 15),
    'eng-2f': place('eng-2f', 'eng', 2, 15),
    'eng-3f': place('eng-3f', 'eng', 3, 15),
    'lab-2f': place('lab-2f', 'lab', 2, 45),
    'main-1f': place('main-1f', 'main', 1, 30),
    'main-2f': place('main-2f', 'main', 2, 30),
    'main-3f': place('main-3f', 'main', 3, 30),
    cafe: place('cafe', 'cafe', 1, 60),
  },
  graph: {
    nodes: {
      gate: [0, 0],
      'eng-door': [15, 0],
      'main-door': [30, 0],
      'lab-door': [45, 0],
      'cafe-door': [60, 0],
      park: [75, 0],
    },
    edges: [
      ['gate', 'eng-door'],
      ['eng-door', 'main-door'],
      ['main-door', 'lab-door'],
      ['lab-door', 'cafe-door'],
      ['cafe-door', 'park'],
    ],
  },
  gateNode: 'gate',
  gateSpawn: [-15, 0],
  boardPos: [0, 3],
  parkNode: 'park',
  parkSpots: [seat(75, 6), seat(81, 6)],
  benchSpots: [seat(78, 9)],
  professorSeat: seat(45, -12),
  colliders: [],
};

let seq = 0;

/** 테스트용 멤버. 아이디를 주지 않으면 m1, m2 … 순서로 만든다 */
export function member(
  schedules: ScheduleItem[],
  id = `m${++seq}`,
  username = id,
): MemberForPlacement {
  return {
    id,
    username,
    look: { animal: 'duck', color: 'default', head: 'none', eyes: 'none', neck: 'none' },
    schedules,
  };
}

/** 2026-10-21(수, day=2) KST 'HH:MM:SS' → epoch ms */
export function wed(hhmmss: string): number {
  return Date.parse(`2026-10-21T${hhmmss}+09:00`);
}

export const WED = '2026-10-21';
export const WEDNESDAY = 2;
```

- [ ] **Step 2: 실패하는 테스트 작성** — `packages/shared/src/placement/graph.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { CAMPUS } from '../campus/data';
import { facingOf, nearestNode, pathLength, shortestPath } from './graph';
import { LINE_CAMPUS } from './test-fixtures';

describe('shortestPath', () => {
  it('직선 그래프는 지나는 노드를 모두 거친다', () => {
    expect(shortestPath(LINE_CAMPUS, 'gate', 'park')).toEqual([
      'gate',
      'eng-door',
      'main-door',
      'lab-door',
      'cafe-door',
      'park',
    ]);
    expect(shortestPath(LINE_CAMPUS, 'lab-door', 'eng-door')).toEqual([
      'lab-door',
      'main-door',
      'eng-door',
    ]);
    expect(shortestPath(LINE_CAMPUS, 'gate', 'gate')).toEqual(['gate']);
  });

  it('실제 캠퍼스에서 가장 짧은 길을 고른다', () => {
    expect(shortestPath(CAMPUS, 'gate', 'eng-door')).toEqual([
      'gate',
      'south',
      'plaza',
      'plaza-e',
      'eng-door',
    ]);
    expect(shortestPath(CAMPUS, 'gate', 'cafe-door')).toEqual(['gate', 'south', 'sw', 'cafe-door']);
  });

  it('결과를 캐시한다 (같은 배열을 돌려준다)', () => {
    expect(shortestPath(CAMPUS, 'gate', 'lab-door')).toBe(shortestPath(CAMPUS, 'gate', 'lab-door'));
  });
});

describe('기하 유틸', () => {
  it('pathLength는 꺾은선 길이', () => {
    expect(
      pathLength([
        [0, 0],
        [3, 4],
        [3, 10],
      ]),
    ).toBe(11);
    expect(pathLength([[1, 1]])).toBe(0);
  });

  it('nearestNode는 가장 가까운 노드', () => {
    expect(nearestNode(CAMPUS, [1, 21])).toBe('gate');
    expect(nearestNode(LINE_CAMPUS, [40, 5])).toBe('lab-door');
  });

  it('facingOf: +z는 0, +x는 π/2', () => {
    expect(facingOf([0, 0], [0, 1])).toBe(0);
    expect(facingOf([0, 0], [1, 0])).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(facingOf([0, 0], [0, -1]))).toBeCloseTo(Math.PI);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -w @4this/shared -- graph`
Expected: FAIL — `Failed to resolve import "./graph" from "src/placement/graph.test.ts"`

- [ ] **Step 4: 구현**

`packages/shared/src/placement/constants.ts`:

```ts
/** placement 규칙의 숫자들 (설계 문서 §7). 시간은 분 단위 */

/** 걷는 속도 1.5 m/s를 분당 거리로 */
export const WALK_SPEED_MPS = 1.5;
export const WALK_M_PER_MIN = WALK_SPEED_MPS * 60;

/** 건물·정문 출입 페이드 (나갈 때, 들어올 때 각각) */
export const FADE_MS = 300;
export const FADE_MIN = FADE_MS / 60_000;

/** 첫 캠퍼스 일정 몇 분 전에 정문에 나타나나 */
export const ARRIVE_EARLY_MIN = 5;
/** 빈 시간이 이보다 짧으면 다음 건물 입구에서 기다린다 */
export const SHORT_GAP_MIN = 20;
/** 점심 시간대와 최대 길이 */
export const LUNCH_START_MIN = 11 * 60 + 30;
export const LUNCH_END_MIN = 13 * 60 + 30;
export const LUNCH_MAX_MIN = 60;
/** 이보다 짧은 빈 시간 조각은 이웃 조각에 붙인다 */
export const MIN_PIECE_MIN = 10;
/** 공원 산책 칸 길이 */
export const PARK_SLOT_MIN = 2;
/** 산책 지점 대신 벤치·연못가에 앉을 확률 (3번 중 1번) */
export const PARK_SIT_CHANCE = 1 / 3;
/** 건물 앞에서 기다릴 때 문 노드에서 떨어지는 거리 (겹치지 않게) */
export const WAIT_SPREAD_M = 0.8;
```

`packages/shared/src/placement/status.ts`:

```ts
import type { Kind } from '../schema/schedule';

/** 이름표 문구 (설계 문서 §7.1, §9) */
export const STATUS = {
  free: '공강',
  cafe: '카페 ☕',
  lunch: '점심 🍚',
  arriving: '등교 중',
  leaving: '하교 중',
  goingOut: '외출 중',
} as const;

const CLASS_LABEL: Record<Exclude<Kind, 'external'>, string> = {
  lecture1: '1학년 강의',
  lecture2: '2학년 강의',
  lecture3: '3학년 강의',
  liberal: '교양 강의',
  research: '연구 중',
  library: '도서관',
};

const WITH_TITLE: ReadonlySet<Kind> = new Set(['lecture1', 'lecture2', 'lecture3', 'liberal']);

/** 캠퍼스 일정의 이름표. 강의 계열은 제목을 붙인다: '2학년 강의 · 자료구조' */
export function classStatus(kind: Exclude<Kind, 'external'>, title?: string): string {
  const label = CLASS_LABEL[kind];
  return title && WITH_TITLE.has(kind) ? `${label} · ${title}` : label;
}

/** 외부 일정 게시판 제목. 제목이 없으면 '외부 일정' */
export function externalTitle(title?: string): string {
  return title ? title : '외부 일정';
}
```

`packages/shared/src/placement/graph.ts`:

```ts
import type { Campus, NodeId, Vec2 } from '../campus/types';

/** 두 점 사이 거리 (m) */
export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/** 꺾은선의 누적 거리. 결과[0] = 0, 마지막 = 전체 길이 */
export function cumulative(pts: readonly Vec2[]): number[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + dist(pts[i - 1]!, pts[i]!));
  return cum;
}

/** 꺾은선 전체 길이 (m) */
export function pathLength(pts: readonly Vec2[]): number {
  return cumulative(pts).at(-1) ?? 0;
}

interface GraphCache {
  adj: Map<NodeId, { to: NodeId; w: number }[]>;
  paths: Map<string, readonly NodeId[]>;
}

/** 캠퍼스 객체마다 인접 목록과 최단 경로 결과를 한 번만 만든다 */
const caches = new WeakMap<Campus, GraphCache>();

function cacheOf(campus: Campus): GraphCache {
  let cache = caches.get(campus);
  if (!cache) {
    const adj = new Map<NodeId, { to: NodeId; w: number }[]>();
    const nodes = campus.graph.nodes;
    for (const [a, b] of campus.graph.edges) {
      const w = dist(nodes[a]!, nodes[b]!);
      adj.set(a, [...(adj.get(a) ?? []), { to: b, w }]);
      adj.set(b, [...(adj.get(b) ?? []), { to: a, w }]);
    }
    cache = { adj, paths: new Map() };
    caches.set(campus, cache);
  }
  return cache;
}

/**
 * 다익스트라 최단 경로. 노드 목록(양 끝 포함)을 돌려준다. 결과는 캐시한다.
 * 닿을 수 없으면 [from, to] (그래프 검사기가 막아 주므로 실제로는 생기지 않는다).
 */
export function shortestPath(campus: Campus, from: NodeId, to: NodeId): readonly NodeId[] {
  const cache = cacheOf(campus);
  const key = `${from}>${to}`;
  const hit = cache.paths.get(key);
  if (hit) return hit;

  const best = new Map<NodeId, number>([[from, 0]]);
  const prev = new Map<NodeId, NodeId>();
  const done = new Set<NodeId>();
  // 노드가 수십 개뿐이라 우선순위 큐 없이 가장 가까운 노드를 매번 찾는다
  while (true) {
    let cur: NodeId | null = null;
    let curD = Infinity;
    for (const [id, d] of best) {
      if (!done.has(id) && (d < curD || (d === curD && cur !== null && id < cur))) {
        cur = id;
        curD = d;
      }
    }
    if (cur === null || cur === to) break;
    done.add(cur);
    for (const { to: next, w } of cache.adj.get(cur) ?? []) {
      const nd = curD + w;
      if (nd < (best.get(next) ?? Infinity)) {
        best.set(next, nd);
        prev.set(next, cur);
      }
    }
  }

  let path: NodeId[];
  if (from === to) path = [from];
  else if (!prev.has(to)) path = [from, to];
  else {
    path = [to];
    while (path[0] !== from) path.unshift(prev.get(path[0]!)!);
  }
  cache.paths.set(key, path);
  return path;
}

/** 점에서 가장 가까운 그래프 노드 (같은 거리면 아이디 순) */
export function nearestNode(campus: Campus, p: Vec2): NodeId {
  let bestId = campus.gateNode;
  let bestD = Infinity;
  for (const [id, pos] of Object.entries(campus.graph.nodes)) {
    const d = dist(p, pos);
    if (d < bestD || (d === bestD && id < bestId)) {
      bestId = id;
      bestD = d;
    }
  }
  return bestId;
}

/** 진행 방향 → facing (rotation.y). 0이면 +z를 본다 */
export function facingOf(from: Vec2, to: Vec2): number {
  return Math.atan2(to[0] - from[0], to[1] - from[1]);
}
```

- [ ] **Step 5: 통과·타입 확인**

Run: `npm test -w @4this/shared && npm run typecheck -w @4this/shared`
Expected: PASS — 30개, 타입 에러 0

- [ ] **Step 6: 커밋**

```bash
git add packages/shared/src/placement
git commit -m "feat: placement 상수·이름표 문구·경로 그래프(다익스트라 캐시)"
```

---

### Task 3: 하루 구간 규칙 (segments)

스펙 §7.2의 시간 규칙만 다룬다. 좌석·경로는 아직 정하지 않는다.

**Files:**
- Create: `packages/shared/src/placement/segments.ts`
- Modify: `packages/shared/src/placement/test-fixtures.ts` (import 한 줄 + `idWithFree`)
- Test: `packages/shared/src/placement/segments.test.ts`

**Interfaces:**
- Consumes: `hashString`, `mix32`, `KIND_INFO`, `ScheduleItem`, `toMinutes`, Task 2의 상수·`classStatus`·`externalTitle`
- Produces:
  - `type Activity = { kind: 'class'; placeId; pose; status } | { kind: 'lunch' } | { kind: 'cafe' } | { kind: 'park' } | { kind: 'wait'; node: NodeId } | { kind: 'away'; title } | { kind: 'home' }`
  - `interface Block { from: number; to: number; activity: Activity }` (분, `[from, to)`. `home`은 길이 0)
  - `freeChoice(memberId, date): 'park' | 'cafe'`
  - `gapBlocks(memberId, date, g0, g1, waitNode): Block[]`
  - `planBlocks(memberId, date, dayItems: readonly ScheduleItem[], campus): Block[]` — `dayItems`는 그날 요일 일정만
  - `test-fixtures.ts`: `idWithFree(choice: 'park' | 'cafe', date = WED): string`

- [ ] **Step 1: 픽스처에 idWithFree 추가**

`packages/shared/src/placement/test-fixtures.ts`의 import를 다음처럼 바꾼다(old → new):

```ts
import type { Campus, Place, PlaceId, Seat } from '../campus/types';
import type { ScheduleItem } from '../schema/schedule';
import type { MemberForPlacement } from './types';
```
→
```ts
import type { Campus, Place, PlaceId, Seat } from '../campus/types';
import type { ScheduleItem } from '../schema/schedule';
import { freeChoice } from './segments';
import type { MemberForPlacement } from './types';
```

파일 끝에 붙인다:

```ts

/** 그날 빈 시간을 choice(공원/카페)에서 보내는 멤버 아이디 */
export function idWithFree(choice: 'park' | 'cafe', date = WED): string {
  for (let i = 0; ; i++) if (freeChoice(`x${i}`, date) === choice) return `x${i}`;
}
```

- [ ] **Step 2: 실패하는 테스트 작성** — `packages/shared/src/placement/segments.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import type { ScheduleItem } from '../schema/schedule';
import { freeChoice, gapBlocks, planBlocks, type Block } from './segments';
import { LINE_CAMPUS, WED, WEDNESDAY, idWithFree } from './test-fixtures';

const item = (start: string, end: string, kind: ScheduleItem['kind'], title?: string) =>
  ({ day: WEDNESDAY, start, end, kind, ...(title ? { title } : {}) }) as ScheduleItem;

/** 구간을 [시작, 끝, 종류]로 줄여 비교하기 쉽게 */
const brief = (blocks: Block[]) => blocks.map((b) => [b.from, b.to, b.activity.kind]);

const H = (h: number, m = 0) => h * 60 + m;

describe('planBlocks', () => {
  it('일정이 없으면 빈 목록 (부재)', () => {
    expect(planBlocks('m', WED, [], LINE_CAMPUS)).toEqual([]);
  });

  it('외부 일정만 있으면 게시판용 away만 남는다', () => {
    expect(brief(planBlocks('m', WED, [item('10:00', '12:00', 'external')], LINE_CAMPUS))).toEqual([
      [H(10), H(12), 'away'],
    ]);
  });

  it('첫 캠퍼스 일정 5분 전에 등교해 건물 앞에서 기다린다', () => {
    const blocks = planBlocks('m', WED, [item('09:00', '10:00', 'lecture1')], LINE_CAMPUS);
    expect(brief(blocks)).toEqual([
      [H(8, 55), H(9), 'wait'],
      [H(9), H(10), 'class'],
      [H(10), H(10), 'home'],
    ]);
    expect(blocks[0]!.activity).toEqual({ kind: 'wait', node: 'eng-door' });
    expect(blocks[1]!.activity).toEqual({
      kind: 'class',
      placeId: 'eng-1f',
      pose: 'sitType',
      status: '1학년 강의',
    });
  });

  it('앞에 외부 일정이 있으면 그 일정이 끝날 때 들어오고, 사이는 빈 시간 규칙', () => {
    const id = idWithFree('park');
    const blocks = planBlocks(
      id,
      WED,
      [item('07:00', '08:00', 'external'), item('10:00', '11:00', 'library')],
      LINE_CAMPUS,
    );
    expect(brief(blocks)).toEqual([
      [H(7), H(8), 'away'],
      [H(8), H(10), 'park'],
      [H(10), H(11), 'class'],
      [H(11), H(11), 'home'],
    ]);
  });

  it('지우의 수요일 (설계 문서 §7.2 예시)', () => {
    const id = idWithFree('cafe');
    const blocks = planBlocks(
      id,
      WED,
      [
        item('16:00', '18:00', 'research'),
        item('09:00', '12:00', 'lecture1'),
        item('13:00', '15:00', 'external', '알바'),
      ],
      LINE_CAMPUS,
    );
    expect(brief(blocks)).toEqual([
      [H(8, 55), H(9), 'wait'],
      [H(9), H(12), 'class'],
      [H(12), H(13), 'lunch'],
      [H(13), H(15), 'away'],
      [H(15), H(16), 'cafe'],
      [H(16), H(18), 'class'],
      [H(18), H(18), 'home'],
    ]);
    expect(blocks[3]!.activity).toEqual({ kind: 'away', title: '알바' });
  });

  it('마지막 캠퍼스 일정 뒤의 외부 일정은 다시 들어오지 않는다', () => {
    const blocks = planBlocks(
      'm',
      WED,
      [item('09:00', '10:00', 'lecture2'), item('11:00', '12:00', 'external')],
      LINE_CAMPUS,
    );
    expect(brief(blocks)).toEqual([
      [H(8, 55), H(9), 'wait'],
      [H(9), H(10), 'class'],
      [H(10), H(10), 'home'],
      [H(11), H(12), 'away'],
    ]);
  });

  it('다음 일정이 외부 일정이면 빈 시간 규칙을 따르고 그 시각에 정문으로 간다', () => {
    const blocks = planBlocks(
      'm',
      WED,
      [
        item('09:00', '10:00', 'lecture1'),
        item('10:10', '11:00', 'external'),
        item('14:00', '15:00', 'liberal'),
      ],
      LINE_CAMPUS,
    );
    expect(blocks[2]).toEqual({
      from: H(10),
      to: H(10, 10),
      activity: { kind: 'wait', node: 'gate' },
    });
    expect(blocks[3]!.activity).toEqual({ kind: 'away', title: '외부 일정' });
  });

  it('맞닿은 같은 일정은 하나로 합친다 (자리를 옮기지 않는다)', () => {
    const blocks = planBlocks(
      'm',
      WED,
      [
        item('09:00', '10:00', 'lecture3', '알고리즘'),
        item('10:00', '11:00', 'lecture3', '알고리즘'),
      ],
      LINE_CAMPUS,
    );
    expect(brief(blocks)).toEqual([
      [H(8, 55), H(9), 'wait'],
      [H(9), H(11), 'class'],
      [H(11), H(11), 'home'],
    ]);
    expect(blocks[1]!.activity).toMatchObject({ status: '3학년 강의 · 알고리즘' });
  });
});

describe('gapBlocks', () => {
  const park = idWithFree('park');

  it('20분 미만이면 다음 건물 입구에서 기다린다', () => {
    expect(gapBlocks(park, WED, H(10), H(10, 19), 'lab-door')).toEqual([
      { from: H(10), to: H(10, 19), activity: { kind: 'wait', node: 'lab-door' } },
    ]);
  });

  it('점심은 11:30~13:30과 겹친 부분, 최대 60분', () => {
    expect(brief(gapBlocks(park, WED, H(11), H(14), 'eng-door'))).toEqual([
      [H(11), H(11, 30), 'park'],
      [H(11, 30), H(12, 30), 'lunch'],
      [H(12, 30), H(14), 'park'],
    ]);
    expect(brief(gapBlocks(park, WED, H(12, 30), H(15), 'eng-door'))).toEqual([
      [H(12, 30), H(13, 30), 'lunch'],
      [H(13, 30), H(15), 'park'],
    ]);
    expect(brief(gapBlocks(park, WED, H(14), H(16), 'eng-door'))).toEqual([[H(14), H(16), 'park']]);
  });

  it('10분 미만 조각은 앞 조각에, 첫 조각이면 뒤 조각에 붙인다', () => {
    expect(brief(gapBlocks(park, WED, H(11, 25), H(12), 'eng-door'))).toEqual([
      [H(11, 25), H(12), 'lunch'],
    ]);
    expect(brief(gapBlocks(park, WED, H(10), H(11, 35), 'eng-door'))).toEqual([
      [H(10), H(11, 35), 'park'],
    ]);
  });

  it('공원/카페는 멤버·날짜마다 고정이고 둘 다 나온다', () => {
    const cafe = idWithFree('cafe');
    expect(brief(gapBlocks(cafe, WED, H(14), H(15), 'eng-door'))).toEqual([[H(14), H(15), 'cafe']]);
    expect(freeChoice(cafe, WED)).toBe(freeChoice(cafe, WED));
    const choices = new Set(Array.from({ length: 20 }, (_, i) => freeChoice(`m${i}`, WED)));
    expect(choices).toEqual(new Set(['park', 'cafe']));
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -w @4this/shared -- segments`
Expected: FAIL — `Failed to resolve import "./segments"`

- [ ] **Step 4: 구현** — `packages/shared/src/placement/segments.ts`

```ts
import type { Campus, NodeId, PlaceId } from '../campus/types';
import { hashString, mix32 } from '../hash';
import type { PoseKind } from '../schema/pose';
import { KIND_INFO, type Kind, type ScheduleItem } from '../schema/schedule';
import { toMinutes } from '../time';
import {
  ARRIVE_EARLY_MIN,
  LUNCH_END_MIN,
  LUNCH_MAX_MIN,
  LUNCH_START_MIN,
  MIN_PIECE_MIN,
  SHORT_GAP_MIN,
} from './constants';
import { classStatus, externalTitle } from './status';

/** 한 구간 동안 하는 일. 좌석·경로는 아직 정하지 않은 상태 */
export type Activity =
  | { kind: 'class'; placeId: PlaceId; pose: PoseKind; status: string }
  | { kind: 'lunch' }
  | { kind: 'cafe' }
  | { kind: 'park' }
  /** 다음 장소 입구(건물 문 노드 또는 정문 노드) 앞에서 서서 기다린다 */
  | { kind: 'wait'; node: NodeId }
  | { kind: 'away'; title: string }
  /** 하교. 길이가 0인 표시 구간 (이 시각에 정문으로 출발) */
  | { kind: 'home' };

/** 멤버 하루의 한 구간. 시각은 KST 자정부터 지난 분, [from, to) */
export interface Block {
  from: number;
  to: number;
  activity: Activity;
}

type CampusKind = Exclude<Kind, 'external'>;

interface Item {
  from: number;
  to: number;
  kind: Kind;
  title?: string;
}

/** 그날 빈 시간을 공원에서 보낼지 카페에서 보낼지. 하루 동안 고정 (§7.2-5) */
export function freeChoice(memberId: string, date: string): 'park' | 'cafe' {
  return mix32(hashString(memberId + date)) % 2 === 0 ? 'park' : 'cafe';
}

/** 빈 시간 [g0, g1)을 조각으로 나눈다 (§7.2-5). waitNode는 다음 장소의 입구 */
export function gapBlocks(
  memberId: string,
  date: string,
  g0: number,
  g1: number,
  waitNode: NodeId,
): Block[] {
  if (g1 <= g0) return [];
  if (g1 - g0 < SHORT_GAP_MIN)
    return [{ from: g0, to: g1, activity: { kind: 'wait', node: waitNode } }];

  const free: Activity = { kind: freeChoice(memberId, date) };
  const pieces: Block[] = [];
  const ls = Math.max(g0, LUNCH_START_MIN);
  const le = Math.min(g1, LUNCH_END_MIN, ls + LUNCH_MAX_MIN);
  if (le > ls) {
    if (ls > g0) pieces.push({ from: g0, to: ls, activity: free });
    pieces.push({ from: ls, to: le, activity: { kind: 'lunch' } });
    if (g1 > le) pieces.push({ from: le, to: g1, activity: free });
  } else {
    pieces.push({ from: g0, to: g1, activity: free });
  }

  // 10분 미만 조각은 바로 앞 조각에 붙인다 (첫 조각이면 뒤 조각에)
  for (let i = 0; i < pieces.length && pieces.length > 1;) {
    const p = pieces[i]!;
    if (p.to - p.from >= MIN_PIECE_MIN) {
      i++;
      continue;
    }
    if (i > 0) pieces[i - 1]!.to = p.to;
    else pieces[1]!.from = p.from;
    pieces.splice(i, 1);
  }
  // 붙이다 보면 같은 일이 이웃할 수 있다 → 하나로 합친다
  for (let i = 1; i < pieces.length;) {
    if (pieces[i]!.activity.kind === pieces[i - 1]!.activity.kind) {
      pieces[i - 1]!.to = pieces[i]!.to;
      pieces.splice(i, 1);
    } else i++;
  }
  return pieces;
}

/** 맞닿은 같은 일정(종류·제목이 같음)은 하나로 합쳐 자리를 옮기지 않게 한다 */
function mergeContiguous(items: Item[]): Item[] {
  const out: Item[] = [];
  for (const item of items) {
    const prev = out.at(-1);
    if (prev && prev.kind === item.kind && prev.title === item.title && prev.to === item.from) {
      prev.to = item.to;
    } else out.push({ ...item });
  }
  return out;
}

function classBlock(item: Item): Block {
  const kind = item.kind as CampusKind;
  const info = KIND_INFO[kind];
  return {
    from: item.from,
    to: item.to,
    activity: {
      kind: 'class',
      placeId: info.place!,
      pose: info.pose!,
      status: classStatus(kind, item.title),
    },
  };
}

function awayBlock(item: Item): Block {
  return {
    from: item.from,
    to: item.to,
    activity: { kind: 'away', title: externalTitle(item.title) },
  };
}

/**
 * 멤버 한 명의 하루(그날 요일의 일정만)를 구간 목록으로 바꾼다 (§7.2).
 * 캠퍼스 일정이 없으면 외부 일정(게시판용)만 남는다.
 */
export function planBlocks(
  memberId: string,
  date: string,
  dayItems: readonly ScheduleItem[],
  campus: Campus,
): Block[] {
  const items = mergeContiguous(
    dayItems
      .map((i) => ({
        from: toMinutes(i.start),
        to: toMinutes(i.end),
        kind: i.kind,
        title: i.title,
      }))
      .sort((a, b) => a.from - b.from),
  );
  const onCampus = items.filter((i) => i.kind !== 'external');
  const externals = items.filter((i) => i.kind === 'external');
  if (onCampus.length === 0) return externals.map(awayBlock);

  const firstStart = onCampus[0]!.from;
  const leave = onCampus.at(-1)!.to;
  const before = externals.filter((e) => e.to <= firstStart);
  // 등교: 첫 캠퍼스 일정 5분 전. 그 앞에 외부 일정이 있으면 직전 외부 일정이 끝날 때
  const arrive = before.length > 0 ? before.at(-1)!.to : firstStart - ARRIVE_EARLY_MIN;

  const waitNodeFor = (item: Item): NodeId =>
    item.kind === 'external'
      ? campus.gateNode
      : campus.buildings[campus.places[KIND_INFO[item.kind].place!].building].doorNode;

  const blocks: Block[] = before.map(awayBlock);
  let cursor = arrive;
  for (const item of items) {
    if (item.from < arrive || item.to > leave) continue;
    blocks.push(...gapBlocks(memberId, date, cursor, item.from, waitNodeFor(item)));
    blocks.push(item.kind === 'external' ? awayBlock(item) : classBlock(item));
    cursor = item.to;
  }
  blocks.push({ from: leave, to: leave, activity: { kind: 'home' } });
  blocks.push(...externals.filter((e) => e.from >= leave).map(awayBlock));
  return blocks;
}
```

- [ ] **Step 5: 통과·타입 확인**

Run: `npm test -w @4this/shared && npm run typecheck -w @4this/shared`
Expected: PASS — 42개 (segments 12개 추가), 타입 에러 0

- [ ] **Step 6: 커밋**

```bash
git add packages/shared/src/placement
git commit -m "feat: 하루 구간 규칙 (등교 5분 전·빈 시간·점심·외부 일정·하교)"
```

---

### Task 4: 좌석 배정 (구간 색칠)

**Files:**
- Create: `packages/shared/src/placement/seats.ts`
- Test: `packages/shared/src/placement/seats.test.ts`

**Interfaces:**
- Consumes: `Campus`, `PlaceId`, `Seat`
- Produces:
  - `interface SeatRequest { memberId; placeId; from; to }`
  - `interface SeatAssignment { index: number; seat: Seat; overflow: boolean; sit: boolean }`
  - `SITTING_OVERFLOW: Partial<Record<PlaceId, number>> = { cafe: 4 }` — 넘침 자리 중 앞의 몇 개가 앉는 자리인지(카페 테라스)
  - `assignSeats(requests: readonly SeatRequest[], campus): SeatAssignment[]` — 결과는 입력 순서, 입력 순서와 무관하게 같은 배정

- [ ] **Step 1: 실패하는 테스트 작성** — `packages/shared/src/placement/seats.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { assignSeats, type SeatRequest } from './seats';
import { LINE_CAMPUS } from './test-fixtures';

const req = (
  memberId: string,
  from: number,
  to: number,
  placeId: SeatRequest['placeId'] = 'eng-1f',
) => ({
  memberId,
  placeId,
  from,
  to,
});

describe('assignSeats', () => {
  it('(시작, memberId) 순으로 비어 있는 가장 앞 좌석을 준다', () => {
    const result = assignSeats(
      [req('b', 540, 600), req('a', 540, 600), req('c', 570, 630), req('d', 600, 660)],
      LINE_CAMPUS,
    );
    expect(result.map((r) => r.index)).toEqual([1, 0, 2, 0]);
    expect(result[1]!.seat).toEqual(LINE_CAMPUS.places['eng-1f'].seats[0]);
    expect(result[3]!.seat).toEqual(LINE_CAMPUS.places['eng-1f'].seats[0]);
  });

  it('좌석이 모자라면 넘침 자리에 서고, 넘침 자리도 모자라면 돌려 쓴다', () => {
    const result = assignSeats(
      ['a', 'b', 'c', 'd'].map((id) => req(id, 540, 600)),
      LINE_CAMPUS,
    );
    const overflow = LINE_CAMPUS.places['eng-1f'].overflow[0];
    expect(result[2]).toEqual({ index: 2, seat: overflow, overflow: true, sit: false });
    expect(result[3]).toEqual({ index: 3, seat: overflow, overflow: true, sit: false });
  });

  it('카페 넘침 자리(테라스)는 앉는다', () => {
    const result = assignSeats(
      ['a', 'b', 'c'].map((id) => req(id, 900, 960, 'cafe')),
      LINE_CAMPUS,
    );
    expect(result[2]).toMatchObject({ index: 2, overflow: true, sit: true });
  });

  it('장소가 다르면 서로 영향이 없다', () => {
    const result = assignSeats([req('a', 540, 600), req('b', 540, 600, 'eng-2f')], LINE_CAMPUS);
    expect(result.map((r) => r.index)).toEqual([0, 0]);
  });

  it('입력 순서가 달라도 같은 결과', () => {
    const reqs = [req('c', 570, 630), req('a', 540, 600), req('b', 540, 600), req('d', 600, 660)];
    const forward = assignSeats(reqs, LINE_CAMPUS);
    const backward = assignSeats([...reqs].reverse(), LINE_CAMPUS).reverse();
    expect(backward).toEqual(forward);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/shared -- seats`
Expected: FAIL — `Failed to resolve import "./seats"`

- [ ] **Step 3: 구현** — `packages/shared/src/placement/seats.ts`

```ts
import type { Campus, PlaceId, Seat } from '../campus/types';

/** 좌석이 필요한 구간 하나 (강의·연구·도서관·점심·카페) */
export interface SeatRequest {
  memberId: string;
  placeId: PlaceId;
  from: number;
  to: number;
}

export interface SeatAssignment {
  /** 0부터. seats.length 이상이면 넘침 자리 */
  index: number;
  seat: Seat;
  overflow: boolean;
  /** 넘침 자리라도 앉는 곳인가 (카페 테라스) */
  sit: boolean;
}

/**
 * 넘침 자리 중 앞의 몇 개가 앉는 자리인지. 나머지는 서 있는 자리다.
 * 카페: 테라스 4자리(앉음) + 스탠딩 (shared/campus/data.ts의 cafe.overflow 순서)
 */
export const SITTING_OVERFLOW: Partial<Record<PlaceId, number>> = { cafe: 4 };

/** 코드 포인트 순 비교. localeCompare는 실행 환경마다 다를 수 있어 쓰지 않는다 */
function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * 구간 색칠로 좌석을 준다 (§7.4). 결과는 requests와 같은 순서.
 * 장소마다 (시작, memberId) 순으로 정렬하고, 그 구간 동안 비어 있는 가장 앞 번호를 준다.
 * 좌석이 모자라면 넘침 자리를 같은 규칙으로 쓰고, 그것도 모자라면 넘침 자리를 다시 돌려 쓴다.
 */
export function assignSeats(requests: readonly SeatRequest[], campus: Campus): SeatAssignment[] {
  const result: SeatAssignment[] = new Array(requests.length);
  const byPlace = new Map<PlaceId, number[]>();
  requests.forEach((r, i) => {
    const list = byPlace.get(r.placeId) ?? [];
    list.push(i);
    byPlace.set(r.placeId, list);
  });

  for (const [placeId, indices] of byPlace) {
    const place = campus.places[placeId];
    indices.sort((a, b) => {
      const ra = requests[a]!;
      const rb = requests[b]!;
      return ra.from - rb.from || cmp(ra.memberId, rb.memberId);
    });
    /** 좌석 번호별로 비는 시각 */
    const busyUntil: number[] = [];
    for (const i of indices) {
      const r = requests[i]!;
      let index = busyUntil.findIndex((until) => until <= r.from);
      if (index === -1) index = busyUntil.length;
      busyUntil[index] = r.to;

      const k = index - place.seats.length;
      if (k < 0) {
        result[i] = { index, seat: place.seats[index]!, overflow: false, sit: true };
      } else if (place.overflow.length > 0) {
        result[i] = {
          index,
          seat: place.overflow[k % place.overflow.length]!,
          overflow: true,
          sit: k < (SITTING_OVERFLOW[placeId] ?? 0),
        };
      } else {
        result[i] = {
          index,
          seat: place.seats[index % place.seats.length]!,
          overflow: true,
          sit: true,
        };
      }
    }
  }
  return result;
}
```

- [ ] **Step 4: 통과·타입 확인**

Run: `npm test -w @4this/shared && npm run typecheck -w @4this/shared`
Expected: PASS — 47개, 타입 에러 0

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/placement/seats.ts packages/shared/src/placement/seats.test.ts
git commit -m "feat: 장소별 구간 색칠 좌석 배정과 넘침 자리"
```

---

### Task 5: Segment 유니온·경로·샘플·게시판으로 computeDay 완성

**Files:**
- Modify: `packages/shared/src/placement/types.ts`, `packages/shared/src/placement/index.ts`
- Create: `packages/shared/src/placement/sample.ts`, `packages/shared/src/placement/build.ts`, `packages/shared/src/placement/board.ts`
- Test: `packages/shared/src/placement/sample.test.ts`

**Interfaces:**
- Consumes: Task 2~4 전부
- Produces:
  - `types.ts`: `WalkLeg { from; to; pts; cum; floor; fadeIn; fadeOut; gate }`, `StaySegment { kind:'stay'; from; to; pos; floor; facing; pose; placeId: PlaceId|'door'|'gate'; status; seat? }`, `WalkSegment { kind:'walk'; from; to; legs; status }`, `ParkSegment { kind:'park'; from; to; entry; seed; walkSpots; sitSpots; status }`, `AwaySegment { kind:'away'; from; to; since; title }`, `Segment` 유니온. `DayPlan`·`Pose`·`BoardEntry`는 그대로
  - `sample.ts`: `planMinutes(plan, t)`, `findSegment(segments, m)`(이진 탐색), `parkSpotAt(seg, slot)`, `sampleSegment(seg, m)`
  - `build.ts`: `type Spot`, `route(campus, a, b)`, `timeLegs(raw, start, available)`, `buildSegments(memberId, date, blocks, seatOf, campus)`
  - `board.ts`: `boardAt(plan, t)` (끝나는 시각 → 이름 → 아이디 순)
  - `index.ts`: `computeDay`, `sampleAt` 실제 구현, 다시 내보내기(`boardAt`, `FADE_MS`, `WALK_SPEED_MPS`, `facingOf`, `nearestNode`, `pathLength`, `shortestPath`, `STATUS`, `classStatus`)

- [ ] **Step 1: 실패하는 테스트 작성** — `packages/shared/src/placement/sample.test.ts`

직선 캠퍼스라 시각마다 위치를 정확히 계산할 수 있다. 예: 정문 바깥(-15)에서 0.3초 페이드 인 후 5초 걸으면 7.5 m → x = -7.5. 좌석 → 계단참 3 m(2초) + 페이드 0.3·0.3 + 문 → 정문 바깥 30 m(20초) + 페이드 0.3 = 22.9초에 사라진다.

```ts
import { describe, expect, it } from 'vitest';
import type { ScheduleItem } from '../schema/schedule';
import { boardAt, computeDay, sampleAt } from './index';
import { LINE_CAMPUS, WED, WEDNESDAY, idWithFree, member, wed } from './test-fixtures';
import type { MemberForPlacement } from './types';

const item = (
  start: string,
  end: string,
  kind: ScheduleItem['kind'],
  title?: string,
  day = WEDNESDAY,
) => ({ day, start, end, kind, ...(title ? { title } : {}) }) as ScheduleItem;

const plan = (members: MemberForPlacement[], date = WED) =>
  computeDay({ members, date, campus: LINE_CAMPUS });

const xz = (p: { position: [number, number, number] } | null) =>
  p ? [p.position[0], p.position[2]] : null;

describe('등교·수업·하교 (직선 캠퍼스)', () => {
  const p = plan([member([item('09:00', '10:00', 'lecture1')], 'm')]);

  it('5분 전까지는 없다가 정문 바깥에서 페이드로 나타난다', () => {
    expect(sampleAt(p, 'm', wed('08:54:59'))).toBeNull();
    expect(sampleAt(p, 'm', wed('08:55:00'))).toMatchObject({
      position: [-15, 0, 0],
      opacity: 0,
      placeId: 'gate',
      status: '등교 중',
    });
    expect(sampleAt(p, 'm', wed('08:55:00.150'))!.opacity).toBeCloseTo(0.5);
  });

  it('1.5 m/s로 경로를 따라 걷는다', () => {
    const s = sampleAt(p, 'm', wed('08:55:05.300'))!;
    expect(s.position[0]).toBeCloseTo(-7.5);
    expect(s.position[2]).toBeCloseTo(0);
    expect(s).toMatchObject({ pose: 'walk', placeId: 'transit', opacity: 1 });
    expect(s.facing).toBeCloseTo(Math.PI / 2);
  });

  it('20분 미만 빈 시간은 다음 건물 문 앞에서 선다', () => {
    const s = sampleAt(p, 'm', wed('08:58:00'))!;
    expect(s).toMatchObject({ pose: 'stand', placeId: 'door', status: '공강', floor: 1 });
    expect(Math.hypot(s.position[0] - 15, s.position[2])).toBeCloseTo(0.8);
  });

  it('수업 시간에는 배정된 좌석에 앉아 있다', () => {
    expect(sampleAt(p, 'm', wed('09:01:00'))).toEqual({
      position: [15, 0, -6],
      facing: Math.PI,
      pose: 'sitType',
      placeId: 'eng-1f',
      floor: 1,
      status: '1학년 강의',
      opacity: 1,
    });
  });

  it('마지막 일정이 끝나면 정문으로 걸어가 사라진다', () => {
    const s = sampleAt(p, 'm', wed('10:00:01'))!;
    expect(xz(s)?.[0]).toBeCloseTo(15);
    expect(xz(s)?.[1]).toBeCloseTo(-4.5);
    expect(s).toMatchObject({ pose: 'walk', status: '하교 중' });
    // 좌석→계단참 2초 + 페이드 0.3·0.3 + 문→정문 바깥 20초 + 페이드 0.3 = 22.9초
    expect(sampleAt(p, 'm', wed('10:00:22.800'))).toMatchObject({ placeId: 'gate' });
    expect(sampleAt(p, 'm', wed('10:00:23'))).toBeNull();
  });
});

describe('건물 안 층 이동', () => {
  const p = plan([
    member([item('09:00', '10:00', 'lecture1'), item('10:00', '11:00', 'lecture2')], 'm'),
  ]);

  it('계단참까지 걷고 페이드 → 윗층 계단참에서 나타나 자리로 걷는다', () => {
    expect(sampleAt(p, 'm', wed('10:00:02.150'))).toMatchObject({
      position: [15, 0, -3],
      floor: 1,
      pose: 'stand',
    });
    expect(sampleAt(p, 'm', wed('10:00:02.150'))!.opacity).toBeCloseTo(0.5);
    const appear = sampleAt(p, 'm', wed('10:00:02.450'))!;
    expect(appear.position).toEqual([15, 3.2, -3]);
    expect(appear.opacity).toBeCloseTo(0.5);
    const walking = sampleAt(p, 'm', wed('10:00:03.600'))!;
    expect(walking.position[2]).toBeCloseTo(-4.5);
    expect(walking.facing).toBeCloseTo(Math.PI);
    expect(sampleAt(p, 'm', wed('10:00:05'))).toMatchObject({
      position: [15, 3.2, -6],
      floor: 2,
      pose: 'sitType',
      status: '2학년 강의',
    });
  });
});

describe('좌석·포즈·이름표', () => {
  it('좌석이 모자라면 세 번째 사람은 넘침 자리에 선다', () => {
    const p = plan(['a', 'b', 'c'].map((id) => member([item('09:00', '10:00', 'lecture1')], id)));
    expect(sampleAt(p, 'a', wed('09:30'))!.position).toEqual([15, 0, -6]);
    expect(sampleAt(p, 'b', wed('09:30'))!.position).toEqual([15, 0, -9]);
    expect(sampleAt(p, 'c', wed('09:30'))).toMatchObject({ position: [15, 0, -12], pose: 'stand' });
  });

  it('도서관 sitRead, 교양 제목, 연구 중', () => {
    const p = plan([
      member([item('09:00', '10:00', 'library')], 'lib'),
      member([item('09:00', '10:00', 'liberal', '심리학')], 'lib2'),
      member([item('09:00', '10:00', 'research', '논문')], 'lab'),
    ]);
    expect(sampleAt(p, 'lib', wed('09:30'))).toMatchObject({
      placeId: 'main-3f',
      pose: 'sitRead',
      status: '도서관',
      floor: 3,
    });
    expect(sampleAt(p, 'lib', wed('09:30'))!.position[1]).toBeCloseTo(6.4);
    expect(sampleAt(p, 'lib2', wed('09:30'))!.status).toBe('교양 강의 · 심리학');
    expect(sampleAt(p, 'lab', wed('09:30'))).toMatchObject({
      placeId: 'lab-2f',
      status: '연구 중',
    });
  });

  it('점심은 식당 sitEat, 카페는 sitSip', () => {
    const id = idWithFree('cafe');
    const p = plan([
      member([item('10:00', '11:30', 'lecture1'), item('13:30', '15:00', 'lecture1')], id),
    ]);
    expect(sampleAt(p, id, wed('12:00'))).toMatchObject({
      placeId: 'main-1f',
      pose: 'sitEat',
      status: '점심 🍚',
    });
    expect(sampleAt(p, id, wed('13:00'))).toMatchObject({
      placeId: 'cafe',
      pose: 'sitSip',
      status: '카페 ☕',
    });
  });
});

describe('공원 산책', () => {
  const id = idWithFree('park');
  const p = plan([
    member([item('09:00', '10:00', 'lecture1'), item('16:00', '17:00', 'lecture1')], id),
  ]);

  it('2분 칸마다 지점을 옮기고, 3번 중 1번꼴로 벤치에 앉는다', () => {
    let sit = 0;
    let idle = 0;
    // 13:30~15:59 칸의 가운데(도착한 뒤)를 본다
    for (let m = 13 * 60 + 30; m < 16 * 60; m += 2) {
      const t = wed('00:00:00') + (m + 1) * 60_000;
      const s = sampleAt(p, id, t)!;
      expect(s.placeId).toBe('park');
      expect(s.status).toBe('공강');
      if (s.pose === 'sitRest') sit++;
      else if (s.pose === 'idle') idle++;
    }
    expect(sit).toBeGreaterThan(0);
    expect(idle).toBeGreaterThan(0);
    expect(sit / (sit + idle)).toBeGreaterThan(0.15);
    expect(sit / (sit + idle)).toBeLessThan(0.55);
  });

  it('순간이동 없이 이어진다 (5초에 7.5 m 이하)', () => {
    let prev = sampleAt(p, id, wed('10:00:00'))!;
    for (let t = wed('10:00:05'); t < wed('16:00:00'); t += 5000) {
      const s = sampleAt(p, id, t)!;
      if (s.opacity === 1 && prev.opacity === 1 && s.floor === prev.floor) {
        const d = Math.hypot(s.position[0] - prev.position[0], s.position[2] - prev.position[2]);
        expect(d).toBeLessThanOrEqual(7.5 + 1e-6);
      }
      prev = s;
    }
  });
});

describe('외부 일정과 게시판', () => {
  it('외부 일정만 있는 날은 캠퍼스에 없고 게시판에만 보인다', () => {
    const p = plan([member([item('10:00', '12:00', 'external')], 'ext', '지우')]);
    expect(sampleAt(p, 'ext', wed('11:00'))).toBeNull();
    expect(boardAt(p, wed('11:00'))).toEqual([
      { memberId: 'ext', username: '지우', title: '외부 일정', until: '12:00' },
    ]);
    expect(boardAt(p, wed('12:00'))).toEqual([]);
  });

  it('게시판은 끝나는 시각 순', () => {
    const p = plan([
      member([item('13:00', '15:00', 'external', '알바')], 'a', '가'),
      member([item('13:00', '14:00', 'external', '병원')], 'b', '나'),
    ]);
    expect(boardAt(p, wed('13:30')).map((e) => e.until)).toEqual(['14:00', '15:00']);
  });
});

describe('부재·승인·날짜', () => {
  it('일정 없는 날, 다른 요일 일정, 승인 안 된 멤버는 null', () => {
    const p = plan([
      member([], 'none'),
      member([item('09:00', '10:00', 'lecture1', undefined, 0)], 'mon'),
    ]);
    expect(sampleAt(p, 'none', wed('09:30'))).toBeNull();
    expect(sampleAt(p, 'mon', wed('09:30'))).toBeNull();
    // 승인 대기 멤버는 입력에 넣지 않으므로 계획에도 없다
    expect(sampleAt(p, 'pending', wed('09:30'))).toBeNull();
    expect(p.usernames.has('pending')).toBe(false);
  });

  it('KST 자정 경계: 24:00에 끝난 일정은 그날 계획으로만 하교 중이다', () => {
    const m = member([item('22:00', '24:00', 'lecture1')], 'late');
    const wedPlan = plan([m], '2026-10-21');
    const thuPlan = plan([m], '2026-10-22');
    const after = Date.parse('2026-10-22T00:00:10+09:00');
    expect(sampleAt(wedPlan, 'late', wed('23:59:00'))!.placeId).toBe('eng-1f');
    expect(sampleAt(wedPlan, 'late', after)!.status).toBe('하교 중');
    expect(sampleAt(thuPlan, 'late', after)).toBeNull();
  });

  it('UTC로는 수요일이어도 KST 목요일 일정을 따른다', () => {
    const m = member([item('08:00', '09:00', 'lecture3', undefined, 3)], 'thu');
    const t = Date.parse('2026-10-21T23:30:00Z'); // KST 2026-10-22(목) 08:30
    expect(plan([m], '2026-10-22').weekday).toBe(3);
    expect(sampleAt(plan([m], '2026-10-22'), 'thu', t)).toMatchObject({ placeId: 'eng-3f' });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/shared -- sample`
Expected: FAIL — cw#1의 `sampleAt`은 항상 `null`이라 `expected null to match object { position: [ -15, 0, 0 ], …}` 등 대부분 실패

- [ ] **Step 3: Segment 유니온** — `packages/shared/src/placement/types.ts` 전체

```ts
import type { Campus, PlaceId, Seat, Vec2 } from '../campus/types';
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

/** 걷기 한 다리. 다리 사이에서 건물·정문을 드나들며 페이드한다. 시각은 KST 자정부터 지난 분 */
export interface WalkLeg {
  from: number;
  to: number;
  /** 지나는 점들 (바닥 좌표) */
  pts: readonly Vec2[];
  /** pts[i]까지의 누적 거리 (m). cum[0] = 0 */
  cum: readonly number[];
  /** 이 다리를 걷는 층 (바깥은 1) */
  floor: number;
  /** 시작할 때 FADE_MS 동안 제자리에서 나타난다 */
  fadeIn: boolean;
  /** 끝날 때 FADE_MS 동안 제자리에서 사라진다 */
  fadeOut: boolean;
  /** 정문 바깥에서 나타나거나 사라지는 다리 */
  gate: boolean;
}

/** 자리에 머무는 구간 (좌석·건물 앞 대기) */
export interface StaySegment {
  kind: 'stay';
  from: number;
  to: number;
  pos: Vec2;
  floor: number;
  facing: number;
  pose: PoseKind;
  placeId: PlaceId | 'door' | 'gate';
  status: string;
  /** 좌석 번호 (넘침 자리는 seats.length부터). 건물 앞 대기는 없음 */
  seat?: number;
}

/** 경로를 따라 걷는 구간 */
export interface WalkSegment {
  kind: 'walk';
  from: number;
  to: number;
  legs: readonly WalkLeg[];
  status: string;
}

/** 공원 산책 구간. 2분 칸마다 산책 지점을 고른다 (§7.5) */
export interface ParkSegment {
  kind: 'park';
  from: number;
  to: number;
  /** 공원에 들어온 지점 (첫 칸은 여기서 출발) */
  entry: Vec2;
  /** 결정적 난수 씨앗 'memberId|date' */
  seed: string;
  /** 걸어서 들르는 산책 지점 (campus.parkSpots) */
  walkSpots: readonly Seat[];
  /** 앉아 쉬는 벤치·연못가 (campus.benchSpots) */
  sitSpots: readonly Seat[];
  status: string;
}

/** 외부 일정으로 캠퍼스 밖에 있는 구간. sampleAt은 null, 게시판에는 보인다 */
export interface AwaySegment {
  kind: 'away';
  /** 정문을 나선 시각 (외부 일정 시작 + 정문까지 걷는 시간) */
  from: number;
  to: number;
  /** 외부 일정 시작 시각 (게시판은 이때부터 보인다) */
  since: number;
  title: string;
}

/**
 * 하루 계획의 한 구간. 시각은 KST 자정부터 지난 분.
 * 다른 모듈은 Segment 내부를 읽지 않는다 (sampleAt·boardAt만 쓴다).
 */
export type Segment = StaySegment | WalkSegment | ParkSegment | AwaySegment;

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

- [ ] **Step 4: 샘플러** — `packages/shared/src/placement/sample.ts`

```ts
import { FLOOR_HEIGHT, type Seat, type Vec2 } from '../campus/types';
import { rand01 } from '../hash';
import { kstMidnight } from '../time';
import { FADE_MIN, PARK_SIT_CHANCE, PARK_SLOT_MIN, WALK_M_PER_MIN } from './constants';
import { dist, facingOf } from './graph';
import type {
  DayPlan,
  ParkSegment,
  Pose,
  Segment,
  StaySegment,
  WalkLeg,
  WalkSegment,
} from './types';

const floorY = (floor: number) => (floor - 1) * FLOOR_HEIGHT;

/** epoch ms → 계획 날짜의 KST 자정부터 지난 분 (자정을 넘기면 1440 이상) */
export function planMinutes(plan: DayPlan, t: number): number {
  return (t - kstMidnight(plan.date)) / 60_000;
}

/** 구간 목록에서 m을 품은 구간. 이진 탐색 (구간은 from 순, 겹치지 않음) */
export function findSegment(segments: readonly Segment[], m: number): Segment | null {
  let lo = 0;
  let hi = segments.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid]!.from <= m) {
      found = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (found === -1) return null;
  const seg = segments[found]!;
  return m < seg.to ? seg : null;
}

/** 공원 산책 칸 slot의 목표 지점. 3번 중 1번꼴로 벤치·연못가에 앉는다 (§7.5) */
export function parkSpotAt(
  seg: Pick<ParkSegment, 'seed' | 'walkSpots' | 'sitSpots'>,
  slot: number,
): { spot: Seat; sit: boolean } {
  const sit = seg.sitSpots.length > 0 && rand01(seg.seed, slot) < PARK_SIT_CHANCE;
  const list = sit ? seg.sitSpots : seg.walkSpots;
  const spot = list[Math.floor(rand01(seg.seed, slot, 'spot') * list.length)]!;
  return { spot, sit };
}

function lerp(a: Vec2, b: Vec2, k: number): Vec2 {
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
}

function sampleStay(seg: StaySegment): Pose {
  return {
    position: [seg.pos[0], floorY(seg.floor), seg.pos[1]],
    facing: seg.facing,
    pose: seg.pose,
    placeId: seg.placeId,
    floor: seg.floor,
    status: seg.status,
    opacity: 1,
  };
}

/** 꺾은선 위 거리 d의 점과 그 자리의 진행 방향 */
function alongPath(leg: WalkLeg, d: number): { pos: Vec2; facing: number } {
  const { pts, cum } = leg;
  if (pts.length < 2) return { pos: pts[0]!, facing: 0 };
  let i = 1;
  while (i < pts.length - 1 && cum[i]! < d) i++;
  const a = pts[i - 1]!;
  const b = pts[i]!;
  const span = cum[i]! - cum[i - 1]!;
  const k = span > 0 ? Math.min(1, Math.max(0, (d - cum[i - 1]!) / span)) : 1;
  return { pos: lerp(a, b, k), facing: facingOf(a, b) };
}

function sampleWalk(seg: WalkSegment, m: number): Pose {
  let leg = seg.legs[0]!;
  for (const l of seg.legs) {
    if (l.from <= m) leg = l;
    else break;
  }
  const length = leg.cum.at(-1) ?? 0;
  const fi = leg.fadeIn ? FADE_MIN : 0;
  const fo = leg.fadeOut ? FADE_MIN : 0;
  const moveFrom = leg.from + fi;
  const moveTo = leg.to - fo;
  let opacity = 1;
  let d: number;
  let moving = true;
  if (m < moveFrom) {
    opacity = fi > 0 ? (m - leg.from) / fi : 1;
    d = 0;
    moving = false;
  } else if (m >= moveTo) {
    opacity = fo > 0 ? 1 - (m - moveTo) / fo : 1;
    d = length;
    moving = false;
  } else {
    d = ((m - moveFrom) / (moveTo - moveFrom)) * length;
  }
  const { pos, facing } = alongPath(leg, d);
  return {
    position: [pos[0], floorY(leg.floor), pos[1]],
    facing,
    pose: moving ? 'walk' : 'stand',
    placeId: leg.gate && !moving ? 'gate' : 'transit',
    floor: leg.floor,
    status: seg.status,
    opacity: Math.min(1, Math.max(0, opacity)),
  };
}

function samplePark(seg: ParkSegment, m: number): Pose {
  const slot = Math.floor(m / PARK_SLOT_MIN);
  const slotStart = Math.max(slot * PARK_SLOT_MIN, seg.from);
  const prev = slot * PARK_SLOT_MIN <= seg.from ? seg.entry : parkSpotAt(seg, slot - 1).spot.pos;
  const { spot, sit } = parkSpotAt(seg, slot);
  const walkMin = dist(prev, spot.pos) / WALK_M_PER_MIN;
  const base = { floor: 1, status: seg.status, opacity: 1, placeId: 'park' as const };
  if (m < slotStart + walkMin) {
    const pos = lerp(prev, spot.pos, (m - slotStart) / walkMin);
    return {
      ...base,
      position: [pos[0], 0, pos[1]],
      facing: facingOf(prev, spot.pos),
      pose: 'walk',
    };
  }
  return {
    ...base,
    position: [spot.pos[0], 0, spot.pos[1]],
    facing: spot.facing,
    pose: sit ? 'sitRest' : 'idle',
  };
}

/** 구간 하나를 분 m에서 샘플한다. 캠퍼스 밖(외부 일정)이면 null */
export function sampleSegment(seg: Segment, m: number): Pose | null {
  switch (seg.kind) {
    case 'stay':
      return sampleStay(seg);
    case 'walk':
      return sampleWalk(seg, m);
    case 'park':
      return samplePark(seg, m);
    case 'away':
      return null;
  }
}
```

- [ ] **Step 5: 경로와 구간 조립** — `packages/shared/src/placement/build.ts`

```ts
import type { BuildingId, Campus, NodeId, PlaceId, Vec2 } from '../campus/types';
import { rand01 } from '../hash';
import type { PoseKind } from '../schema/pose';
import { FADE_MIN, PARK_SLOT_MIN, WAIT_SPREAD_M, WALK_M_PER_MIN } from './constants';
import { cumulative, facingOf, shortestPath } from './graph';
import { parkSpotAt } from './sample';
import type { SeatAssignment } from './seats';
import type { Block } from './segments';
import { STATUS } from './status';
import type { Segment, WalkLeg } from './types';

/** 캐릭터가 있는 곳: 건물 안 / 바깥 길 위 / 정문 밖(안 보임) */
export type Spot =
  | { kind: 'inside'; building: BuildingId; floor: number; pos: Vec2; landing: Vec2 }
  | { kind: 'outside'; pos: Vec2; node: NodeId }
  | { kind: 'gone' };

export type RawLeg = Omit<WalkLeg, 'from' | 'to' | 'cum'>;

const GONE: Spot = { kind: 'gone' };

function samePoint(a: Vec2, b: Vec2): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

function sameSpot(a: Spot, b: Spot): boolean {
  if (a.kind === 'gone' || b.kind === 'gone') return a.kind === b.kind;
  if (a.kind === 'inside' && b.kind === 'inside') {
    return a.building === b.building && a.floor === b.floor && samePoint(a.pos, b.pos);
  }
  return a.kind === b.kind && samePoint(a.pos, b.pos);
}

function dedupe(pts: Vec2[]): Vec2[] {
  return pts.filter((p, i) => i === 0 || !samePoint(p, pts[i - 1]!));
}

function leg(pts: Vec2[], floor: number, fadeIn = false, fadeOut = false, gate = false): RawLeg {
  return { pts: dedupe(pts), floor, fadeIn, fadeOut, gate };
}

/**
 * a에서 b까지 걷는 다리들 (§5.3 출입 연출, §7.3).
 * 건물 안 → 계단참까지 걷고 페이드 → 문 노드에서 나타나 그래프 최단 경로 → 문에서 페이드
 * → 목표 층 계단참에서 나타나 자리까지 걷기. 정문 밖은 gateSpawn에서 나타나고 사라진다.
 */
export function route(campus: Campus, a: Spot, b: Spot): RawLeg[] {
  if (a.kind === 'inside' && b.kind === 'inside' && a.building === b.building) {
    if (a.floor === b.floor) return [leg([a.pos, b.pos], a.floor)];
    return [leg([a.pos, a.landing], a.floor, false, true), leg([b.landing, b.pos], b.floor, true)];
  }

  const legs: RawLeg[] = [];
  let head: Vec2[] = [];
  let startNode: NodeId;
  let fadeIn = false;
  let gate = false;
  if (a.kind === 'inside') {
    legs.push(leg([a.pos, a.landing], a.floor, false, true));
    startNode = campus.buildings[a.building].doorNode;
    fadeIn = true;
  } else if (a.kind === 'outside') {
    head = [a.pos];
    startNode = a.node;
  } else {
    head = [campus.gateSpawn];
    startNode = campus.gateNode;
    fadeIn = true;
    gate = true;
  }

  let tail: Vec2[] = [];
  let endNode: NodeId;
  let fadeOut = false;
  if (b.kind === 'inside') {
    endNode = campus.buildings[b.building].doorNode;
    fadeOut = true;
  } else if (b.kind === 'outside') {
    endNode = b.node;
    tail = [b.pos];
  } else {
    endNode = campus.gateNode;
    tail = [campus.gateSpawn];
    fadeOut = true;
    gate = true;
  }

  const path = shortestPath(campus, startNode, endNode).map((id) => campus.graph.nodes[id]!);
  legs.push(leg([...head, ...path, ...tail], 1, fadeIn, fadeOut, gate));
  if (b.kind === 'inside') legs.push(leg([b.landing, b.pos], b.floor, true));
  return legs;
}

/** 다리에 시각을 붙인다. available(분)보다 오래 걸리면 걷는 부분만 빠르게 줄인다 */
export function timeLegs(raw: readonly RawLeg[], start: number, available: number): WalkLeg[] {
  const withCum = raw.map((r) => ({ ...r, cum: cumulative(r.pts) }));
  const fadeOf = (r: RawLeg) => (r.fadeIn ? FADE_MIN : 0) + (r.fadeOut ? FADE_MIN : 0);
  const walkOf = (r: { cum: number[] }) => (r.cum.at(-1) ?? 0) / WALK_M_PER_MIN;
  const fades = withCum.reduce((s, r) => s + fadeOf(r), 0);
  const walking = withCum.reduce((s, r) => s + walkOf(r), 0);
  const scale =
    walking > 0 && fades + walking > available ? Math.max(0, available - fades) / walking : 1;
  let t = start;
  return withCum.map((r) => {
    const from = t;
    t = from + fadeOf(r) + walkOf(r) * scale;
    return { ...r, from, to: t };
  });
}

interface Target {
  spot: Spot;
  /** 이곳으로 걷는 동안의 이름표 */
  status: string;
  /** 도착해서 머무는 구간 [from, to). null이면 머물지 않는다 (하교) */
  stay: ((from: number, to: number) => Segment) | null;
}

/**
 * 구간 목록 → Segment 목록. seatOf(i)는 blocks[i]의 좌석 (강의·점심·카페만).
 * 각 구간이 시작하는 순간 이전 자리에서 출발해 걷고, 도착하면 머문다 (§7.3).
 */
export function buildSegments(
  memberId: string,
  date: string,
  blocks: readonly Block[],
  seatOf: (blockIndex: number) => SeatAssignment | undefined,
  campus: Campus,
): Segment[] {
  const out: Segment[] = [];
  let here: Spot = GONE;
  let arrived = false;

  const seatTarget = (i: number, placeId: PlaceId, sitPose: PoseKind, status: string): Target => {
    const place = campus.places[placeId];
    const a = seatOf(i)!;
    return {
      spot: {
        kind: 'inside',
        building: place.building,
        floor: place.floor,
        pos: a.seat.pos,
        landing: place.landing,
      },
      status,
      stay: (from, to) => ({
        kind: 'stay',
        from,
        to,
        pos: a.seat.pos,
        floor: place.floor,
        facing: a.seat.facing,
        pose: a.sit ? sitPose : 'stand',
        placeId,
        status,
        seat: a.index,
      }),
    };
  };

  const waitTarget = (node: NodeId): Target => {
    const center = campus.graph.nodes[node]!;
    const angle = rand01(memberId, 'wait') * Math.PI * 2;
    const pos: Vec2 = [
      center[0] + Math.cos(angle) * WAIT_SPREAD_M,
      center[1] + Math.sin(angle) * WAIT_SPREAD_M,
    ];
    const building = Object.values(campus.buildings).find((b) => b.doorNode === node);
    const facing = building
      ? facingOf(pos, [
          (building.min[0] + building.max[0]) / 2,
          (building.min[1] + building.max[1]) / 2,
        ])
      : Math.PI;
    return {
      spot: { kind: 'outside', pos, node },
      status: STATUS.free,
      stay: (from, to) => ({
        kind: 'stay',
        from,
        to,
        pos,
        floor: 1,
        facing,
        pose: 'stand',
        placeId: building ? 'door' : 'gate',
        status: STATUS.free,
      }),
    };
  };

  const parkEntry = campus.graph.nodes[campus.parkNode]!;
  const parkSeed = `${memberId}|${date}`;

  blocks.forEach((block, i) => {
    const act = block.activity;
    let target: Target;
    switch (act.kind) {
      case 'class':
        target = seatTarget(i, act.placeId, act.pose, act.status);
        break;
      case 'lunch':
        target = seatTarget(i, 'main-1f', 'sitEat', STATUS.lunch);
        break;
      case 'cafe':
        target = seatTarget(i, 'cafe', 'sitSip', STATUS.cafe);
        break;
      case 'wait':
        target = waitTarget(act.node);
        break;
      case 'park':
        target = {
          spot: { kind: 'outside', pos: parkEntry, node: campus.parkNode },
          status: STATUS.free,
          stay: (from, to) => ({
            kind: 'park',
            from,
            to,
            entry: parkEntry,
            seed: parkSeed,
            walkSpots: campus.parkSpots,
            sitSpots: campus.benchSpots,
            status: STATUS.free,
          }),
        };
        break;
      case 'away':
        target = {
          spot: GONE,
          status: STATUS.goingOut,
          stay: (from, to) => ({ kind: 'away', from, to, since: block.from, title: act.title }),
        };
        break;
      case 'home':
        target = { spot: GONE, status: STATUS.leaving, stay: null };
        break;
    }

    let t = block.from;
    if (!sameSpot(here, target.spot)) {
      const status = here.kind === 'gone' && !arrived ? STATUS.arriving : target.status;
      const available = act.kind === 'home' ? Infinity : block.to - block.from;
      const legs = timeLegs(route(campus, here, target.spot), block.from, available);
      t = legs.at(-1)!.to;
      out.push({ kind: 'walk', from: block.from, to: t, legs, status });
    }
    if (target.stay && t < block.to) {
      const seg = target.stay(t, block.to);
      out.push(seg);
      if (seg.kind === 'park') {
        // 다음 출발점은 마지막 칸의 산책 지점
        const last = parkSpotAt(seg, Math.floor((block.to - 1e-9) / PARK_SLOT_MIN));
        target.spot = { kind: 'outside', pos: last.spot.pos, node: campus.parkNode };
      }
    }
    here = target.spot;
    if (here.kind !== 'gone') arrived = true;
  });
  return out.filter((s) => s.to > s.from);
}
```

- [ ] **Step 6: 게시판** — `packages/shared/src/placement/board.ts`

```ts
import { fromMinutes } from '../time';
import { planMinutes } from './sample';
import type { BoardEntry, DayPlan } from './types';

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** 정문 게시판: 시각 t에 외부 일정 중인 멤버들. 끝나는 시각, 이름 순 (§7.2-4) */
export function boardAt(plan: DayPlan, t: number): BoardEntry[] {
  const m = planMinutes(plan, t);
  const entries: BoardEntry[] = [];
  for (const [memberId, segments] of plan.segments) {
    for (const seg of segments) {
      if (seg.kind === 'away' && seg.since <= m && m < seg.to) {
        entries.push({
          memberId,
          username: plan.usernames.get(memberId) ?? '',
          title: seg.title,
          until: fromMinutes(seg.to),
        });
      }
    }
  }
  return entries.sort(
    (a, b) => cmp(a.until, b.until) || cmp(a.username, b.username) || cmp(a.memberId, b.memberId),
  );
}
```

- [ ] **Step 7: computeDay·sampleAt 조립** — `packages/shared/src/placement/index.ts` 전체 (cw#1의 빈 `boardAt`은 `board.ts`로 옮겨 지운다)

```ts
import { FLOOR_HEIGHT, type Campus, type PlaceId } from '../campus/types';
import { kstMinutes, kstWeekday } from '../time';
import { buildSegments } from './build';
import { findSegment, planMinutes, sampleSegment } from './sample';
import { assignSeats, type SeatAssignment, type SeatRequest } from './seats';
import { planBlocks, type Block } from './segments';
import type { ComputeDayInput, DayPlan, Pose, Segment } from './types';

export * from './types';
export { boardAt } from './board';
export { FADE_MS, WALK_SPEED_MPS } from './constants';
export { facingOf, nearestNode, pathLength, shortestPath } from './graph';
export { STATUS, classStatus } from './status';

/** 좌석이 필요한 구간이면 그 장소 */
function seatPlace(block: Block): PlaceId | null {
  switch (block.activity.kind) {
    case 'class':
      return block.activity.placeId;
    case 'lunch':
      return 'main-1f';
    case 'cafe':
      return 'cafe';
    default:
      return null;
  }
}

/**
 * 하루 계획을 만든다 (§7). 같은 입력이면 어디서 계산해도 같은 결과다.
 * members에는 승인된 멤버만 넣는다.
 */
export function computeDay(input: ComputeDayInput): DayPlan {
  const { members, date, campus } = input;
  const weekday = kstWeekday(Date.parse(`${date}T12:00:00+09:00`));

  // 1) 멤버마다 시간 규칙으로 구간을 나눈다
  const blocksOf = members.map((m) =>
    planBlocks(
      m.id,
      date,
      m.schedules.filter((s) => s.day === weekday),
      campus,
    ),
  );

  // 2) 같은 장소의 구간을 모아 좌석을 색칠한다
  const requests: SeatRequest[] = [];
  const owners: [member: number, block: number][] = [];
  blocksOf.forEach((blocks, mi) =>
    blocks.forEach((b, bi) => {
      const placeId = seatPlace(b);
      if (placeId) {
        requests.push({ memberId: members[mi]!.id, placeId, from: b.from, to: b.to });
        owners.push([mi, bi]);
      }
    }),
  );
  const seats = assignSeats(requests, campus);
  const seatMaps = members.map(() => new Map<number, SeatAssignment>());
  owners.forEach(([mi, bi], k) => seatMaps[mi]!.set(bi, seats[k]!));

  // 3) 구간마다 경로·머무는 자리를 붙인다
  const segments = new Map<string, readonly Segment[]>();
  members.forEach((m, mi) => {
    const seatMap = seatMaps[mi]!;
    segments.set(
      m.id,
      buildSegments(m.id, date, blocksOf[mi]!, (bi) => seatMap.get(bi), campus),
    );
  });

  return {
    date,
    weekday,
    usernames: new Map(members.map((m) => [m.id, m.username])),
    segments,
  };
}

/** 시각 t(epoch ms)에 멤버가 어디서 무엇을 하는지. 캠퍼스에 없으면 null (§7.6) */
export function sampleAt(plan: DayPlan, memberId: string, t: number): Pose | null {
  const segments = plan.segments.get(memberId);
  if (!segments) return null;
  const m = planMinutes(plan, t);
  const seg = findSegment(segments, m);
  return seg ? sampleSegment(seg, m) : null;
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

- [ ] **Step 8: 통과·타입 확인**

Run: `npm test -w @4this/shared && npm run typecheck -w @4this/shared`
Expected: PASS — 63개 (sample 16개 추가, cw#1의 `index.test.ts` 2개도 그대로 통과), 타입 에러 0

- [ ] **Step 9: 커밋**

```bash
git add packages/shared/src/placement
git commit -m "feat: computeDay·sampleAt·boardAt — 경로·출입 페이드·공원 산책·게시판"
```

---

### Task 6: 사자 교수님 기지개 (§6.4)

**Files:**
- Modify: `packages/shared/src/placement/index.ts` (`professorAt`)
- Test: `packages/shared/src/placement/index.test.ts`

**Interfaces:**
- Produces: `PROFESSOR_STRETCH = { everyMin: 15, seconds: 20 }`. `professorAt`은 매 15분 정각부터 20초 동안 `{ pose: 'stand', status: '기지개 쭉~' }`, 그 밖에는 `{ pose: 'sitType', status: '교수님' }`

- [ ] **Step 1: 실패하는 테스트 추가** — `packages/shared/src/placement/index.test.ts`의 `describe('professorAt', …)` 안, 기존 `it` 다음에 넣는다

```ts
  it('15분마다 20초 동안 일어나 기지개를 켠다', () => {
    expect(professorAt(at('2026-10-21T10:15:10+09:00'), CAMPUS)).toMatchObject({
      pose: 'stand',
      status: '기지개 쭉~',
    });
    expect(professorAt(at('2026-10-21T10:15:30+09:00'), CAMPUS)).toMatchObject({
      pose: 'sitType',
      status: '교수님',
    });
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/shared -- index`
Expected: FAIL — `expected { …, pose: 'sitType', status: '교수님' } to match object { pose: 'stand', status: '기지개 쭉~' }`

- [ ] **Step 3: 구현** — `index.ts`의 `PROFESSOR_HOURS`부터 파일 끝까지를 바꾼다

```ts
export const PROFESSOR_HOURS = { start: 9 * 60, end: 18 * 60 } as const;
/** 교수님은 15분마다 20초 동안 일어나 기지개를 켠다 (§6.4) */
export const PROFESSOR_STRETCH = { everyMin: 15, seconds: 20 } as const;

/** 사자 교수님: 평일 09:00~18:00 연구동 2F 책상. 가끔 일어나 기지개를 켠다 */
export function professorAt(t: number, campus: Campus): Pose | null {
  const min = kstMinutes(t);
  if (kstWeekday(t) > 4 || min < PROFESSOR_HOURS.start || min >= PROFESSOR_HOURS.end) return null;
  const stretching = min % PROFESSOR_STRETCH.everyMin < PROFESSOR_STRETCH.seconds / 60;
  const { pos, facing } = campus.professorSeat;
  return {
    position: [pos[0], FLOOR_HEIGHT, pos[1]],
    facing,
    pose: stretching ? 'stand' : 'sitType',
    placeId: 'lab-2f',
    floor: 2,
    status: stretching ? '기지개 쭉~' : '교수님',
    opacity: 1,
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -w @4this/shared && npm run typecheck -w @4this/shared`
Expected: PASS — 64개

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/placement/index.ts packages/shared/src/placement/index.test.ts
git commit -m "feat: 사자 교수님이 15분마다 기지개를 켠다"
```

---

### Task 7: 30명 가짜 멤버와 실제 캠퍼스 스모크(지우의 수요일·결정성·좌석 안정성·성능)

**Files:**
- Create: `packages/shared/src/placement/demo.ts`
- Modify: `packages/shared/src/placement/index.ts` (내보내기 한 줄)
- Test: `packages/shared/src/placement/campus.test.ts`

**Interfaces:**
- Consumes: `randomLook`, `KINDS`, `fromMinutes`, `rand01`
- Produces: `demoMembers(n: number): MemberForPlacement[]` — `id = 'demo-<i>'`, 이름은 `철수`·`영희`… 순, 요일마다 09:00~22:00 사이 겹치지 않는 30분 단위 일정 1~4개(외부 일정 제목 `알바`). 같은 n이면 항상 같다

- [ ] **Step 1: 실패하는 테스트 작성** — `packages/shared/src/placement/campus.test.ts`

`performance`는 shared의 `lib`에 없으므로 `Date.now()`로 잰다(테스트 안에서만 쓰는 측정이라 결정성 규칙과 무관하다).

```ts
import { describe, expect, it } from 'vitest';
import { CAMPUS } from '../campus/data';
import { PLACE_IDS } from '../campus/types';
import type { ScheduleItem } from '../schema/schedule';
import { boardAt, computeDay, demoMembers, sampleAt } from './index';
import { WED, WEDNESDAY, idWithFree, member, wed } from './test-fixtures';

const item = (start: string, end: string, kind: ScheduleItem['kind'], title?: string) =>
  ({ day: WEDNESDAY, start, end, kind, ...(title ? { title } : {}) }) as ScheduleItem;

const minuteOf = (m: number) => wed('00:00:00') + m * 60_000;

describe('지우의 수요일 (실제 캠퍼스, 설계 문서 §7.2 예시)', () => {
  const id = idWithFree('cafe');
  const plan = computeDay({
    date: WED,
    campus: CAMPUS,
    members: [
      member(
        [
          item('09:00', '12:00', 'lecture1'),
          item('13:00', '15:00', 'external', '알바'),
          item('16:00', '18:00', 'research'),
        ],
        id,
        '지우',
      ),
    ],
  });
  const at = (hhmmss: string) => sampleAt(plan, id, wed(hhmmss));

  it('08:55 정문 등장 → 09:00 eng-1f 자리', () => {
    expect(at('08:54:59')).toBeNull();
    expect(at('08:55:10')).toMatchObject({ status: '등교 중', placeId: 'transit' });
    expect(at('09:05:00')).toMatchObject({
      placeId: 'eng-1f',
      pose: 'sitType',
      status: '1학년 강의',
    });
  });

  it('12:00 식당 → 13:00 정문 퇴장(게시판)', () => {
    expect(at('12:05:00')).toMatchObject({ placeId: 'main-1f', pose: 'sitEat' });
    expect(at('13:00:10')).toMatchObject({ status: '외출 중' });
    expect(at('13:05:00')).toBeNull();
    expect(boardAt(plan, wed('12:59:59'))).toEqual([]);
    expect(boardAt(plan, wed('13:00:00'))).toEqual([
      { memberId: id, username: '지우', title: '알바', until: '15:00' },
    ]);
  });

  it('15:00 정문 입장 → 카페 → 16:00 lab-2f → 18:00 하교', () => {
    expect(boardAt(plan, wed('15:00:00'))).toEqual([]);
    expect(at('15:00:05')).toMatchObject({ placeId: 'transit', status: '카페 ☕' });
    expect(at('15:10:00')).toMatchObject({ placeId: 'cafe', pose: 'sitSip' });
    const lab = at('16:05:00')!;
    expect(lab).toMatchObject({ placeId: 'lab-2f', status: '연구 중', floor: 2 });
    expect(lab.position[1]).toBeCloseTo(3.2);
    expect(at('18:00:10')).toMatchObject({ status: '하교 중' });
    expect(at('18:05:00')).toBeNull();
  });
});

describe('30명 픽스처 (실제 캠퍼스)', () => {
  const members = demoMembers(30);
  const input = { date: WED, campus: CAMPUS, members };

  it('두 번 계산해도 결과가 같다 (결정성)', () => {
    const a = computeDay(input);
    const b = computeDay({ ...input, members: [...members].reverse() });
    for (let m = 6 * 60; m < 24 * 60; m += 7) {
      for (const { id } of members) {
        expect(sampleAt(b, id, minuteOf(m))).toEqual(sampleAt(a, id, minuteOf(m)));
      }
    }
  });

  it('같은 일정 동안 좌석이 바뀌지 않고, 앉은 자리는 한 사람만 쓴다', () => {
    const plan = computeDay(input);
    const places = new Set<string>(PLACE_IDS);
    const last = new Map<string, string>();
    for (let m = 6 * 60; m < 24 * 60; m++) {
      const taken = new Set<string>();
      for (const { id } of members) {
        const p = sampleAt(plan, id, minuteOf(m));
        if (!p || !places.has(p.placeId)) {
          last.delete(id);
          continue;
        }
        const key = `${p.placeId}|${p.status}`;
        const pos = p.position.join(',');
        const prev = last.get(id);
        if (prev?.startsWith(`${key}@`)) expect(prev).toBe(`${key}@${pos}`);
        last.set(id, `${key}@${pos}`);
        if (p.pose !== 'stand') {
          const seatKey = `${p.placeId}@${pos}`;
          expect(taken.has(seatKey)).toBe(false);
          taken.add(seatKey);
        }
      }
    }
  });

  it('모든 좌표가 캠퍼스 안이고 키가 유한하다', () => {
    const plan = computeDay(input);
    for (let m = 6 * 60; m < 24 * 60; m += 3) {
      for (const { id } of members) {
        const p = sampleAt(plan, id, minuteOf(m));
        if (!p) continue;
        expect(Number.isFinite(p.facing)).toBe(true);
        expect(Math.abs(p.position[0])).toBeLessThanOrEqual(26);
        expect(Math.abs(p.position[2])).toBeLessThanOrEqual(26);
      }
    }
  });

  it('성능: computeDay 30명 50 ms 안, sampleAt 30명 × 600프레임 100 ms 안', () => {
    computeDay(input); // 경로 캐시 데우기
    const t0 = Date.now();
    const plan = computeDay(input);
    expect(Date.now() - t0).toBeLessThan(50);

    const t1 = Date.now();
    for (let f = 0; f < 600; f++) {
      const t = wed('14:00:00') + f * 16;
      for (const { id } of members) sampleAt(plan, id, t);
    }
    expect(Date.now() - t1).toBeLessThan(100);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/shared -- campus`
Expected: FAIL — `SyntaxError: The requested module './index' does not provide an export named 'demoMembers'` (또는 `demoMembers is not a function`)

- [ ] **Step 3: 구현** — `packages/shared/src/placement/demo.ts`

```ts
import { rand01 } from '../hash';
import { randomLook } from '../schema/look';
import { KINDS, type ScheduleItem } from '../schema/schedule';
import { fromMinutes } from '../time';
import type { MemberForPlacement } from './types';

/**
 * 개발·테스트용 가짜 멤버 n명. 같은 n이면 항상 같은 결과다.
 * 평일·주말 모두 09:00~22:00 사이에 30분 단위로 겹치지 않는 일정 1~4개를 만든다.
 */
export function demoMembers(n: number): MemberForPlacement[] {
  const names = ['철수', '영희', '지우', '민준', '서연', '하준', '지민', '도윤', '수아', '예준'];
  return Array.from({ length: n }, (_, i) => {
    const schedules: ScheduleItem[] = [];
    for (let day = 0; day < 7; day++) {
      let cur = 9 * 60 + Math.floor(rand01('demo', i, day, 'start') * 4) * 30;
      const count = 1 + Math.floor(rand01('demo', i, day, 'count') * 4);
      for (let k = 0; k < count; k++) {
        const len = (2 + Math.floor(rand01('demo', i, day, k, 'len') * 4)) * 30;
        if (cur + len > 22 * 60) break;
        const kind = KINDS[Math.floor(rand01('demo', i, day, k, 'kind') * KINDS.length)]!;
        schedules.push({
          day,
          start: fromMinutes(cur),
          end: fromMinutes(cur + len),
          kind,
          ...(kind === 'external' ? { title: '알바' } : {}),
        });
        cur += len + Math.floor(rand01('demo', i, day, k, 'gap') * 4) * 30;
      }
    }
    let seed = 0;
    const look = randomLook(() => rand01('demo', i, 'look', seed++));
    const username = `${names[i % names.length]}${i >= names.length ? Math.floor(i / names.length) : ''}`;
    return { id: `demo-${i}`, username, look, schedules };
  });
}
```

`packages/shared/src/placement/index.ts`의 내보내기 묶음 끝에 한 줄 추가:

```ts
export { STATUS, classStatus } from './status';
export { demoMembers } from './demo';
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -w @4this/shared && npm run typecheck -w @4this/shared`
Expected: PASS — 71개. (참고: 개발 PC에서 30명 `computeDay` ≈ 2 ms, `sampleAt` 30명 × 600프레임 ≈ 18 ms)

- [ ] **Step 5: 커밋**

```bash
git add packages/shared/src/placement
git commit -m "test: 실제 캠퍼스 30명 결정성·좌석 안정성·성능, demoMembers"
```

---

### Task 8: 전체 검사·PR

- [ ] **Step 1: 전체 검사**

Run: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
Expected: 모두 통과 — shared 71개, server 1개, web 5개. `✓ built` (500 kB 청크 경고는 무시)

- [ ] **Step 2: push·PR**

```bash
git push origin cw
gh pr create --base main --head cw --title "[cw#2] placement 엔진" --body-file .github/pull_request_template.md
```

PR 본문에 적는다:
- `rand01` 값이 바뀌었다(`mix32`로 섞기, 시그니처 동일) — 4명 모두에게 알림
- `Pose.placeId` 값의 뜻(위 Interfaces 표)과 `demoMembers`·`nearestNode`·`shortestPath`를 새로 내보냄
- hm에게: 카페 `overflow` 앞 4자리를 테라스 좌석(앉음)으로 본다(`SITTING_OVERFLOW`). 테라스 자리 수를 바꾸면 이 값도 같이 바꿔야 한다

리뷰어는 hm(캠퍼스 데이터를 읽는 쪽)과 th 중 1명 이상. 머지 방식은 **Create a merge commit**.

- [ ] **Step 3: 머지 후 알림**

단톡방: "cw#2 머지됨 — `sampleAt`이 실제 위치를 돌려줍니다. `?dev=sim`은 cw#3에서. 각자 `git fetch origin && git merge origin/main`"

---

## Self-Review

- **스펙 커버리지:** §7.1 이름표(Task 2 `status.ts`, 강의 계열만 제목) · §7.2-1 부재(Task 3·5) · -2 등교 5분 전/외부 일정 뒤 입장(Task 3) · -3 좌석(Task 4·5) · -4 외부 일정 출입·게시판·남은 일정 없으면 재입장 안 함(Task 3·5) · -5 20분 미만 문 앞 stand, 점심 공식·60분 상한, 공원/카페 하루 고정, 10분 미만 병합, 다음이 외부 일정(Task 3) · -6 하교(Task 3·5) · -7 승인 안 된 멤버(입력에서 빠짐, Task 5 테스트) · 예시 지우의 수요일(Task 3 블록 단위 + Task 7 실제 캠퍼스) · §7.3 다익스트라 캐시·1.5 m/s·t의 함수(Task 2·5) · §7.4 색칠·넘침·빈 시간 장소도 같은 방식(Task 4·5) · §7.5 공원 2분 칸·1/3 벤치(Task 5) · §7.6 시그니처(Task 5) · §5.3 출입 연출 0.3초 페이드(Task 5) · §6.4 교수님 시간·기지개(Task 6) · §11 placement 테스트 목록(결정성·KST 자정·교수님 시간 포함, Task 5~7).
- **플레이스홀더:** 없음. 모든 코드 Step에 완성 코드.
- **계약 일치:** `computeDay`/`sampleAt`/`boardAt`/`professorAt` 시그니처, `Pose`·`BoardEntry`·`DayPlan` 필드는 cw#1 그대로. `Segment`만 유니온으로 넓힘(cw#1 주석대로).
- **알려진 한계:** 24:00에 끝나는 일정의 하교 걸음은 그날 계획에만 있다(다음 날 계획으로 바꾸면 자정에 사라진다 — 테스트로 고정). 공원 벤치는 여러 명이 같은 칸에 같은 벤치를 고를 수 있다(스펙에 배정 규칙 없음).
