# [cw#4] 실시간 클라이언트 + E2E Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**담당:** 박찬우 · 브랜치 `cw` · 웨이브 4 (마지막 통합) · 선행: cw#3, wj#3, th#4 (E2E 실행에는 wj#4의 정적 서빙도 필요)

**Goal:** Socket.IO로 접속자·조종·이모지·`world:changed`·시계 보정을 받아 월드에 반영하고, 로그인 멤버가 자기 캐릭터를 키보드·클릭·탭으로 조종하게 한다. 오버레이 훅의 나머지(접속자·조종·이모지·연결 배지·게시판)를 채우고, "가입 → 승인 → 등장 → 조종 → 두 번째 브라우저에서 확인" Playwright E2E와 CI 잡을 붙인다.

**Architecture:** 소켓 이벤트는 zustand `useRealtime` 한 곳에서 받는다(`connect(socket?)`가 핸들러를 달고 끊는 함수를 돌려준다 → 테스트는 가짜 소켓을 넣는다). 화면 위치는 cw#3의 `resolvePose`가 정하는데, 이 PR에서 우선순위를 넓힌다: 내 조종(로컬 위치, 서버 응답을 기다리지 않음) → 남의 조종(10 Hz 상태 두 개 사이 보간) → 조종이 풀린 뒤 걸어서 복귀(가장 가까운 노드 → 그래프 최단 경로 → placement 자리) → placement. 충돌·입력 방향·스로틀·보간·복귀 길은 순수 함수로 빼서 테스트한다. 3D 캔버스 안은 DOM이 없으므로 E2E는 개발 서버이거나 `VITE_E2E=1`로 빌드했을 때만 생기는 `window.__world`로 위치·조종·이모지를 확인한다.

**Tech Stack:** socket.io-client ^4.8.4 · zustand ^5.0.15 · @react-three/fiber ^9.8.2 · vitest ^5.0.5 + @testing-library/react · @playwright/test ^1.64.1 · GitHub Actions

**설계 문서:** `docs/superpowers/specs/2026-10-21-4this-world-design.md` (이하 "스펙") §5.1, §6.3, §8.3, §9, §10, §11

## Global Constraints

- Node `>=24`, npm workspaces, `package-lock.json` 커밋. TypeScript는 `~5.9.3` 고정.
- 모든 패키지는 ESM. `@4this/shared`는 빌드하지 않고 TS 소스를 바로 import한다.
- 공용 타입·스키마·경로·이벤트는 **`@4this/shared`에서만** 가져온다(`ServerToClientEvents`, `ClientToServerEvents`, `ControlMove`, `Presence`, `SOCKET_LIMITS`, `EMOJIS`, `API`).
- 시각은 KST, `packages/shared/src/time.ts`만 쓴다.
- 좌표계: 단위 m, +x 동쪽, +z 남쪽(정문), 캠퍼스 x·z ∈ [-25, 25], `facing` = `rotation.y`(0이면 +z를 봄), 층 높이 3.2 m.
- 코드 스타일: Prettier(작은따옴표, 세미콜론, 100자). 주석과 사용자 문구는 한국어.
- 커밋: `feat:`/`fix:`/`chore:`/`test:`/`docs:` + 한국어 설명. PR 제목: `[cw#4] 실시간 클라이언트 + E2E`.
- 남의 소유 파일은 고치지 않는다. 이 PR이 바꾸는 곳: `apps/web/src/{api,store,world/sim}/**`, `apps/web/src/world/WorldCanvas.tsx`, `e2e/**`, `playwright.config.ts`, 루트 `package.json`·`eslint.config.js`·`.prettierignore`, `.github/workflows/ci.yml`(모두 cw 소유). **`ui/UiRoot.tsx`·`ui/overlay/*`(th)는 고치지 않는다** — UiRoot가 `useOverlayProps()`로 받아 그린다.
- **이 PR 고유 (서버 쪽 가정, 팀 공통 결정·shared 소켓 계약 기준):**
  - 소켓은 `io({ withCredentials: true })`(같은 출처 `/socket.io`), 서버는 쿠키 `sid`로 사용자를 알아본다. 로그인·로그아웃 뒤에는 다시 연결해야 새 쿠키가 적용된다.
  - 서버는 접속 직후 `time`과 `presence`를 보낸다. `control:start`는 승인된 본인만, 마지막으로 보낸 소켓이 조종권을 갖는다. `control:move`는 초당 15회(`SOCKET_LIMITS.movePerSec`)를 넘으면 버리고 맵 범위로 자른다. `control:state`는 10 Hz 묶음(조종 중인 모든 멤버, 나 포함). 60초(`controlIdleMs`) 동안 `control:move`가 없으면 `control:released`. `emote`는 멤버당 초당 1회, 보낸 사람에게도 돌아온다.
  - 클라이언트는 같은 위치를 다시 보내지 않는다(가만히 서 있으면 60초 뒤 서버가 푼다 = 스펙의 "60초 무입력").
  - 이모지 `ActiveEmote.at`은 `performance.now()`이고 th의 말풍선 key로 쓰인다(같은 `at`이면 다시 튀어나오지 않는다) → 새 이모지마다 새 `at`.
  - 모바일(폭 640px 이하)은 접속자 패널을 접은 채로 시작한다(th 권장). `ConnectionBadge`는 `reconnecting`일 때만 보인다(th).
  - `useOverlayProps()`는 렌더마다 불린다 → 훅을 조건문 안에서 부르지 않고, 매 프레임 바뀌는 `local`은 구독하지 않는다(`useShallow`로 필요한 값만).

## File Structure

```
apps/web/src/
├─ api/socket.ts                 GameSocket 타입, createSocket()
├─ store/
│   ├─ realtime.ts               useRealtime: 연결·presence·남의 조종·복귀 걷기·이모지·내 조종·게시판·패널 접기
│   └─ overlay.ts                (수정) presence·emoteBar·control·connection·board·canControl 채우기
├─ world/
│   ├─ WorldCanvas.tsx           (수정) 소켓 연결, BoardHotspot·ControlDriver, window.__world
│   └─ sim/
│       ├─ collision.ts          isBlocked·resolveMove(벽 따라 미끄러짐)·freeSpot (순수)
│       ├─ input.ts              CONTROL_SPEED·keyDirection·toWorld(카메라 기준)·createThrottle (순수)
│       ├─ remote.ts             조종 상태 보간·controlPose·planReturn·sampleReturn (순수)
│       ├─ resolvePose.ts        (수정) 내 조종 → 남의 조종 → 복귀 걷기 → placement
│       ├─ ControlDriver.tsx     WASD·방향키·바닥 클릭/탭 → 로컬 이동 + control:move
│       ├─ BoardHotspot.tsx      정문 게시판 자리의 투명 클릭 영역 → 게시판 패널
│       ├─ MemberAvatar.tsx      (수정) emote 연결
│       └─ debug.ts              window.__world (DEV 또는 VITE_E2E=1)
e2e/
├─ env.ts · tsconfig.json
└─ world.spec.ts                 가입 → 승인 → 등장 → 조종 → 두 번째 브라우저 → 이모지
playwright.config.ts             webServer: 웹 빌드(VITE_E2E=1) + 서버(WEB_DIST·임시 DB·PORT 8080)
.github/workflows/ci.yml         (수정) e2e 잡
```

## Interfaces (이 PR이 내놓는 것)

- `api/socket.ts`: `type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>`, `createSocket(): GameSocket`
- `store/realtime.ts`: `useRealtime` — `{ connection: 'connected' | 'reconnecting'; presence: Presence; remotes: Record<id, RemoteTrack>; returning: Record<id, ReturnWalk>; emotes: Record<id, ActiveEmote>; controlling: boolean; local: ControlMove | null; presenceCollapsed; boardOpen; connect(socket?): () => void; startControl(); stopControl(); move(m: ControlMove, nowMs: number); sendEmote(emoji: Emoji); togglePresence(); openBoard(); closeBoard() }`, `myMemberId(): string | null`(승인된 로그인 멤버), `EMOTE_MS = 3000`
- `world/sim/remote.ts`: `CONTROL_STATUS = '🎮 조종 중'`, `RemoteSample`, `RemoteTrack`, `pushSample`, `controlPose`, `remotePose(track, now)`, `ReturnWalk`, `planReturn(campus, from, to, start, status)`, `sampleReturn(walk, now)`
- `world/sim/collision.ts`: `CHARACTER_RADIUS = 0.35`, `isBlocked(campus, p, r?)`, `resolveMove(campus, from, to, r?)`, `freeSpot(campus, p)`
- `world/sim/input.ts`: `CONTROL_SPEED = 3`, `CONTROL_KEYS`, `keyDirection(keys)`, `toWorld(input, look)`, `createThrottle(perSec)`
- `window.__world: WorldDebug` — `{ members(): string[]; positionOf(id): { x; y; z; visible } | null; controlling(): string[]; emoteOf(id): string | null; connection(): string }`
- `useOverlayProps()` 전체 (`OverlayProps` 계약 그대로):
  - `presence.entries`: presence에 있고 월드에도 있는 멤버. 나를 맨 위, 나머지는 이름 순. `status`는 조종 중이면 `🎮 조종 중`, 아니면 지금 이름표 문구(없으면 `캠퍼스 밖`). `onSelect(id)` → 카메라가 그 캐릭터로
  - `emoteBar.disabled`·`control.disabled`: 연결이 끊겼거나 승인된 로그인 멤버가 아니면 `true`. `canControl`: 승인된 로그인 멤버
  - `connection.state`, `board`(정문 게시판을 눌렀을 때만 `boardAt` 결과)

---

### Task 1: 조종 순수 함수 — 충돌·입력·스로틀·보간·복귀 길

**Files:**
- Create: `apps/web/src/world/sim/collision.ts`, `apps/web/src/world/sim/input.ts`, `apps/web/src/world/sim/remote.ts`
- Test: `apps/web/src/world/sim/control.test.ts`

**Interfaces:**
- Consumes: `CAMPUS_HALF`, `Campus.colliders`, `nearestNode`, `shortestPath`, `pathLength`, `facingOf`, `WALK_SPEED_MPS` (cw#2)
- Produces: 위 `collision.ts`·`input.ts`·`remote.ts`

- [ ] **Step 1: 브랜치 준비**

```bash
git fetch origin && git checkout cw && git merge origin/main
npm install
```

- [ ] **Step 2: 실패하는 테스트 작성** — `apps/web/src/world/sim/control.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { CAMPUS } from '@4this/shared';
import { freeSpot, isBlocked, resolveMove } from './collision';
import { createThrottle, keyDirection, toWorld } from './input';
import { CONTROL_STATUS, planReturn, pushSample, remotePose, sampleReturn } from './remote';

describe('충돌', () => {
  it('맵 경계·건물·연못은 막혀 있고 길은 열려 있다', () => {
    expect(isBlocked(CAMPUS, [0, 3])).toBe(false); // 광장
    expect(isBlocked(CAMPUS, [16, -2])).toBe(true); // 공학관 안
    expect(isBlocked(CAMPUS, [-15, 0])).toBe(true); // 연못
    expect(isBlocked(CAMPUS, [0, 24.9])).toBe(true); // 맵 끝
  });

  it('벽에 비스듬히 부딪히면 벽을 따라 미끄러진다', () => {
    // 공학관 서쪽 벽(x=12) 앞에서 북동쪽으로 → z만 움직인다
    expect(resolveMove(CAMPUS, [11.5, 0], [12.5, -1])).toEqual([11.5, -1]);
  });

  it('맵 밖으로는 나가지 못한다', () => {
    const p = resolveMove(CAMPUS, [24, 0], [30, 0]);
    expect(p[0]).toBeLessThanOrEqual(25 - 0.35);
  });

  it('건물 안에서 시작하면 가장 가까운 길목으로 옮긴다', () => {
    expect(freeSpot(CAMPUS, [16, -2])).toEqual(CAMPUS.graph.nodes['eng-door']);
    expect(freeSpot(CAMPUS, [0, 3])).toEqual([0, 3]);
  });
});

describe('입력', () => {
  it('WASD·방향키 → [오른쪽, 앞], 대각선은 길이 1', () => {
    expect(keyDirection(new Set(['KeyW']))).toEqual([0, 1]);
    expect(keyDirection(new Set(['ArrowLeft']))).toEqual([-1, 0]);
    const diag = keyDirection(new Set(['KeyW', 'KeyD']));
    expect(Math.hypot(...diag)).toBeCloseTo(1);
    expect(keyDirection(new Set(['KeyW', 'KeyS']))).toEqual([0, 0]);
  });

  it('카메라가 북쪽(-z)을 보면 앞은 -z, 오른쪽은 +x', () => {
    const fwd = toWorld([0, 1], [0, -1]);
    expect(fwd[0]).toBeCloseTo(0);
    expect(fwd[1]).toBeCloseTo(-1);
    const right = toWorld([1, 0], [0, -1]);
    expect(right[0]).toBeCloseTo(1);
    expect(right[1]).toBeCloseTo(0);
  });

  it('스로틀: 초당 15회를 넘지 않는다', () => {
    const allow = createThrottle(15);
    let sent = 0;
    for (let t = 0; t < 1000; t += 1000 / 60) if (allow(t)) sent++;
    expect(sent).toBeLessThanOrEqual(15);
    expect(sent).toBeGreaterThanOrEqual(14);
  });
});

describe('다른 사람의 조종 상태', () => {
  it('두 상태 사이를 받은 간격만큼 보간한다', () => {
    let track = pushSample(undefined, { x: 0, z: 0, facing: 0, moving: true, at: 1000 });
    expect(remotePose(track, 1000).position).toEqual([0, 0, 0]);
    track = pushSample(track, { x: 1, z: 0, facing: 1, moving: true, at: 1100 });
    expect(remotePose(track, 1150).position[0]).toBeCloseTo(0.5);
    expect(remotePose(track, 1300)).toMatchObject({
      position: [1, 0, 0],
      facing: 1,
      pose: 'walk',
      status: CONTROL_STATUS,
    });
  });
});

describe('조종이 풀린 뒤 걸어서 복귀', () => {
  it('가장 가까운 노드를 거쳐 목표까지 1.5 m/s로 걷고, 끝나면 null', () => {
    const walk = planReturn(CAMPUS, [0, 5], [10.5, -2], 0, '공강');
    expect(walk.pts[0]).toEqual([0, 5]);
    expect(walk.pts).toContainEqual(CAMPUS.graph.nodes['plaza']);
    expect(walk.pts.at(-1)).toEqual([10.5, -2]);
    const mid = sampleReturn(walk, 1000)!;
    expect(mid).toMatchObject({ pose: 'walk', status: '공강' });
    const moved = Math.hypot(mid.position[0], mid.position[2] - 5);
    expect(moved).toBeCloseTo(1.5);
    expect(sampleReturn(walk, (walk.length / 1.5) * 1000 + 1)).toBeNull();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -w @4this/web -- control`
Expected: FAIL — `Failed to resolve import "./collision"`

- [ ] **Step 4: 구현**

`apps/web/src/world/sim/collision.ts` (hm이 `CAMPUS.colliders`를 바꾸면 자동으로 따라간다):

```ts
import { CAMPUS_HALF, nearestNode, type Campus, type Vec2 } from '@4this/shared';

/** 조종하는 캐릭터의 충돌 반지름 (m) */
export const CHARACTER_RADIUS = 0.35;

/** p에 캐릭터(반지름 r)가 설 수 없는가: 맵 밖, 건물 벽 안, 연못 안 */
export function isBlocked(campus: Campus, p: Vec2, r = CHARACTER_RADIUS): boolean {
  if (Math.abs(p[0]) > CAMPUS_HALF - r || Math.abs(p[1]) > CAMPUS_HALF - r) return true;
  return campus.colliders.some((c) =>
    c.kind === 'box'
      ? p[0] > c.min[0] - r && p[0] < c.max[0] + r && p[1] > c.min[1] - r && p[1] < c.max[1] + r
      : Math.hypot(p[0] - c.center[0], p[1] - c.center[1]) < c.r + r,
  );
}

/**
 * from에서 to로 움직이려 할 때 실제로 갈 수 있는 곳.
 * 막히면 x만, 그다음 z만 움직여 벽을 따라 미끄러지고, 그래도 막히면 제자리.
 */
export function resolveMove(campus: Campus, from: Vec2, to: Vec2, r = CHARACTER_RADIUS): Vec2 {
  const clamped: Vec2 = [
    Math.max(-CAMPUS_HALF + r, Math.min(CAMPUS_HALF - r, to[0])),
    Math.max(-CAMPUS_HALF + r, Math.min(CAMPUS_HALF - r, to[1])),
  ];
  if (!isBlocked(campus, clamped, r)) return clamped;
  const slideX: Vec2 = [clamped[0], from[1]];
  if (!isBlocked(campus, slideX, r)) return slideX;
  const slideZ: Vec2 = [from[0], clamped[1]];
  if (!isBlocked(campus, slideZ, r)) return slideZ;
  return from;
}

/** 조종을 시작할 자리. 건물 안·연못 안이면 가장 가까운 길목 노드로 옮긴다 */
export function freeSpot(campus: Campus, p: Vec2): Vec2 {
  if (!isBlocked(campus, p)) return p;
  return campus.graph.nodes[nearestNode(campus, p)]!;
}
```

`apps/web/src/world/sim/input.ts`:

```ts
import type { Vec2 } from '@4this/shared';

/** 조종할 때 걷는 속도 (m/s). 자동 이동(1.5 m/s)보다 조금 빠르다 */
export const CONTROL_SPEED = 3;

const FORWARD = ['KeyW', 'ArrowUp'];
const BACK = ['KeyS', 'ArrowDown'];
const LEFT = ['KeyA', 'ArrowLeft'];
const RIGHT = ['KeyD', 'ArrowRight'];

export const CONTROL_KEYS: ReadonlySet<string> = new Set([...FORWARD, ...BACK, ...LEFT, ...RIGHT]);

/** 눌린 키(KeyboardEvent.code) → [오른쪽, 앞] 단위 벡터. 안 눌렸으면 [0, 0] */
export function keyDirection(keys: ReadonlySet<string>): Vec2 {
  const has = (codes: string[]) => codes.some((c) => keys.has(c));
  const right = (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0);
  const forward = (has(FORWARD) ? 1 : 0) - (has(BACK) ? 1 : 0);
  const len = Math.hypot(right, forward);
  return len === 0 ? [0, 0] : [right / len, forward / len];
}

/**
 * 화면 기준 입력을 바닥 좌표로. look은 카메라가 바라보는 방향(x, z).
 * 앞 = 카메라가 보는 쪽, 오른쪽 = 그 오른쪽.
 */
export function toWorld(input: Vec2, look: Vec2): Vec2 {
  const len = Math.hypot(look[0], look[1]) || 1;
  const fx = look[0] / len;
  const fz = look[1] / len;
  // 오른쪽 = 앞 방향을 위에서 봤을 때 시계 방향으로 90도
  const rx = -fz;
  const rz = fx;
  return [rx * input[0] + fx * input[1], rz * input[0] + fz * input[1]];
}

/** 초당 perSec번까지만 true. 서버 제한(초당 15회)을 넘지 않게 control:move를 거른다 */
export function createThrottle(perSec: number): (now: number) => boolean {
  const gap = 1000 / perSec;
  let last = -Infinity;
  return (now) => {
    if (now - last < gap) return false;
    last = now;
    return true;
  };
}
```

`apps/web/src/world/sim/remote.ts`:

```ts
import {
  WALK_SPEED_MPS,
  facingOf,
  nearestNode,
  pathLength,
  shortestPath,
  type Campus,
  type ControlMove,
  type Pose,
  type Vec2,
} from '@4this/shared';

/** 조종 중인 캐릭터의 이름표 */
export const CONTROL_STATUS = '🎮 조종 중';

/** 받은 조종 상태 하나. at은 받은 시각(Date.now) */
export type RemoteSample = ControlMove & { at: number };

/** 최근 두 상태. 10 Hz로 오니 둘 사이를 보간해 부드럽게 그린다 */
export interface RemoteTrack {
  prev: RemoteSample | null;
  last: RemoteSample;
}

export function pushSample(track: RemoteTrack | undefined, sample: RemoteSample): RemoteTrack {
  return { prev: track ? track.last : null, last: sample };
}

/** 바닥 위 조종 상태 → Pose */
export function controlPose(m: ControlMove): Pose {
  return {
    position: [m.x, 0, m.z],
    facing: m.facing,
    pose: m.moving ? 'walk' : 'idle',
    placeId: 'transit',
    floor: 1,
    status: CONTROL_STATUS,
    opacity: 1,
  };
}

/**
 * 한 박자 늦게 그리기: 마지막 상태를 받은 뒤 지난 시간만큼 prev → last로 옮겨 간다.
 * 두 상태 사이 간격(보통 100 ms)이 지나면 last에 닿는다.
 */
export function remotePose(track: RemoteTrack, now: number): Pose {
  const { prev, last } = track;
  if (!prev) return controlPose(last);
  const span = Math.max(1, last.at - prev.at);
  const k = Math.min(1, Math.max(0, (now - last.at) / span));
  return controlPose({
    x: prev.x + (last.x - prev.x) * k,
    z: prev.z + (last.z - prev.z) * k,
    facing: k < 1 ? prev.facing : last.facing,
    moving: last.moving,
  });
}

/** 조종이 풀린 뒤 placement 자리까지 걸어서 돌아가는 길 */
export interface ReturnWalk {
  start: number;
  pts: Vec2[];
  length: number;
  status: string;
}

/** from → 가장 가까운 노드 → (그래프 최단 경로) → 목표 근처 노드 → to */
export function planReturn(
  campus: Campus,
  from: Vec2,
  to: Vec2,
  start: number,
  status: string,
): ReturnWalk {
  const nodes = shortestPath(campus, nearestNode(campus, from), nearestNode(campus, to)).map(
    (id) => campus.graph.nodes[id]!,
  );
  const pts = [from, ...nodes, to].filter(
    (p, i, all) => i === 0 || p[0] !== all[i - 1]![0] || p[1] !== all[i - 1]![1],
  );
  return { start, pts, length: pathLength(pts), status };
}

/** 돌아가는 중이면 그 위치, 다 걸었으면 null (그때부터 placement가 그린다) */
export function sampleReturn(walk: ReturnWalk, now: number): Pose | null {
  const d = ((now - walk.start) / 1000) * WALK_SPEED_MPS;
  if (d >= walk.length || walk.pts.length < 2) return null;
  let rest = Math.max(0, d);
  for (let i = 1; i < walk.pts.length; i++) {
    const a = walk.pts[i - 1]!;
    const b = walk.pts[i]!;
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (rest <= seg || i === walk.pts.length - 1) {
      const k = seg > 0 ? Math.min(1, rest / seg) : 1;
      return {
        position: [a[0] + (b[0] - a[0]) * k, 0, a[1] + (b[1] - a[1]) * k],
        facing: facingOf(a, b),
        pose: 'walk',
        placeId: 'transit',
        floor: 1,
        status: walk.status,
        opacity: 1,
      };
    }
    rest -= seg;
  }
  return null;
}
```

- [ ] **Step 5: 통과·타입 확인**

Run: `npm test -w @4this/web && npm run typecheck -w @4this/web`
Expected: PASS — control 9개 추가, 타입 에러 0

> 테스트의 좌표(공학관 서쪽 벽 x=12, 연못 [-15,0], 노드 `plaza`·`eng-door`)는 cw#1의 `CAMPUS` 기준이다. hm이 좌표를 바꿨다면 같은 의미의 점(건물 안·연못 안·길 위)으로 숫자만 맞춘다.

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/world/sim
git commit -m "feat: 조종 충돌·입력 방향·스로틀·상태 보간·복귀 길 순수 함수"
```

---

### Task 2: 소켓 클라이언트와 실시간 스토어

**Files:**
- Create: `apps/web/src/api/socket.ts`, `apps/web/src/store/realtime.ts`
- Modify: `apps/web/src/world/sim/resolvePose.ts`, `apps/web/package.json`(의존성)
- Test: `apps/web/src/store/realtime.test.ts`

**Interfaces:**
- Consumes: `useWorld.syncClock/load/now/ensurePlan/focusMember`, `useSession`, `memberObjects`(cw#3), Task 1 전부, `SOCKET_LIMITS`, `sampleAt`
- Produces: `GameSocket`, `createSocket`, `useRealtime`, `myMemberId`, `EMOTE_MS`, 넓힌 `resolvePose`
- 이벤트 처리:

| 이벤트 | 처리 |
|---|---|
| `connect` / `disconnect` | `connection` ↔ `'connected'`/`'reconnecting'`. 끊기면 내 조종 해제(서버도 연결 끊김으로 푼다) |
| `time` | `useWorld.syncClock(serverTime)` |
| `presence` | 그대로 저장 |
| `world:changed` | `useWorld.load()` |
| `control:state` | 멤버마다 `remotes[id] = pushSample(…, 받은 시각)`, 복귀 걷기 취소. 내가 조종 중이면 내 상태는 무시 |
| `control:released` | 마지막 위치에서 placement 자리로 `planReturn`(자리가 건물 안이면 그 건물 문까지, 없으면 정문 밖). 나면 `controlling=false` |
| `emote` | `emotes[id] = { emoji, at: performance.now() }`, 3초 뒤 같은 것이면 지움 |
| 세션 바뀜 | `disconnect()` → `connect()` (새 쿠키) |

- [ ] **Step 1: 의존성 설치**

```bash
npm install socket.io-client@^4.8.4 -w @4this/web
```

- [ ] **Step 2: 실패하는 테스트 작성** — `apps/web/src/store/realtime.test.ts`

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CAMPUS, DEFAULT_LOOK, type Session } from '@4this/shared';
import type { GameSocket } from '../api/socket';
import { resolvePose } from '../world/sim/resolvePose';
import { CONTROL_STATUS } from '../world/sim/remote';
import { useRealtime } from './realtime';
import { useSession } from './session';
import { useWorld } from './world';

/** 서버 없이 이벤트를 주고받는 가짜 소켓 */
class FakeSocket {
  handlers = new Map<string, ((...args: unknown[]) => void)[]>();
  sent: [string, unknown][] = [];
  reconnects = 0;
  on(event: string, fn: (...args: unknown[]) => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), fn]);
    return this;
  }
  emit(event: string, arg?: unknown) {
    this.sent.push([event, arg]);
    return this;
  }
  connect() {
    this.reconnects++;
    return this;
  }
  disconnect() {
    return this;
  }
  removeAllListeners() {
    this.handlers.clear();
    return this;
  }
  /** 서버가 보낸 것처럼 */
  serverEmit(event: string, ...args: unknown[]) {
    for (const fn of this.handlers.get(event) ?? []) fn(...args);
  }
  sentOf(event: string) {
    return this.sent.filter(([e]) => e === event).map(([, a]) => a);
  }
}

const NOW = Date.parse('2026-10-21T14:35:00+09:00');
const me: Session = {
  kind: 'member',
  me: { id: 'me', username: '나', status: 'approved', look: DEFAULT_LOOK },
};

let sock: FakeSocket;
let disconnect: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  useWorld.setState(useWorld.getInitialState(), true);
  useRealtime.setState(useRealtime.getInitialState(), true);
  useSession.setState({ session: me, loading: false });
  useWorld.getState().setWorld({
    serverTime: NOW,
    members: ['me', 'you'].map((id) => ({
      id,
      username: id,
      look: DEFAULT_LOOK,
      schedules: [{ day: 2, start: '14:00', end: '16:00', kind: 'lecture1' }],
    })),
  });
  sock = new FakeSocket();
  disconnect = useRealtime.getState().connect(sock as unknown as GameSocket);
  sock.serverEmit('connect');
});

afterEach(() => {
  disconnect();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  useSession.setState({ session: { kind: 'guest' } });
});

describe('연결·시계·presence', () => {
  it('연결되면 connected, 끊기면 reconnecting', () => {
    expect(useRealtime.getState().connection).toBe('connected');
    sock.serverEmit('disconnect');
    expect(useRealtime.getState().connection).toBe('reconnecting');
  });

  it('time 이벤트로 시계를 서버에 맞춘다', () => {
    sock.serverEmit('time', { serverTime: NOW + 90_000 });
    expect(useWorld.getState().now()).toBe(NOW + 90_000);
  });

  it('presence를 담는다', () => {
    const presence = { members: [{ id: 'you', controlling: true }], spectators: 2 };
    sock.serverEmit('presence', presence);
    expect(useRealtime.getState().presence).toEqual(presence);
  });

  it('world:changed면 GET /api/world를 다시 부른다', () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ serverTime: NOW, members: [] })));
    vi.stubGlobal('fetch', fetchMock);
    sock.serverEmit('world:changed');
    expect(fetchMock).toHaveBeenCalledWith('/api/world', expect.anything());
  });

  it('로그인 상태가 바뀌면 새 쿠키로 다시 연결한다', () => {
    useSession.setState({ session: { kind: 'guest' } });
    expect(sock.reconnects).toBe(1);
  });
});

describe('다른 사람의 조종', () => {
  it('control:state를 받아 그 위치에 그리고, 풀리면 걸어서 자리로 돌아간다', () => {
    sock.serverEmit('control:state', [{ memberId: 'you', x: 0, z: 3, facing: 0, moving: true }]);
    expect(resolvePose('you', NOW)).toMatchObject({ position: [0, 0, 3], status: CONTROL_STATUS });

    sock.serverEmit('control:released', { memberId: 'you' });
    expect(useRealtime.getState().remotes['you']).toBeUndefined();
    vi.advanceTimersByTime(1000);
    const back = resolvePose('you', useWorld.getState().now())!;
    expect(back).toMatchObject({ pose: 'walk', status: '1학년 강의' });
    expect(Math.hypot(back.position[0], back.position[2] - 3)).toBeCloseTo(1.5);

    vi.advanceTimersByTime(120_000);
    expect(resolvePose('you', useWorld.getState().now())).toMatchObject({ placeId: 'eng-1f' });
  });

  it('이모지는 3초 동안 보인다', () => {
    sock.serverEmit('emote', { memberId: 'you', emoji: '👋', at: NOW });
    expect(useRealtime.getState().emotes['you']?.emoji).toBe('👋');
    vi.advanceTimersByTime(3000);
    expect(useRealtime.getState().emotes['you']).toBeUndefined();
  });
});

describe('내 조종', () => {
  it('시작하면 control:start와 시작 위치를 보내고 카메라가 나를 따라간다', () => {
    useRealtime.getState().startControl();
    expect(sock.sentOf('control:start')).toHaveLength(1);
    const [start] = sock.sentOf('control:move') as { x: number; z: number }[];
    // 내 캐릭터가 아직 화면에 없으면 정문에서 시작한다
    expect([start!.x, start!.z]).toEqual(CAMPUS.graph.nodes[CAMPUS.gateNode]);
    expect(useRealtime.getState().controlling).toBe(true);
    expect(useWorld.getState().focusedMember).toBe('me');
    expect(resolvePose('me', NOW)!.status).toBe(CONTROL_STATUS);
  });

  it('control:move는 초당 15회 이하, 같은 위치는 다시 보내지 않는다', () => {
    useRealtime.getState().startControl();
    sock.sent = [];
    for (let f = 0; f < 60; f++) {
      useRealtime.getState().move({ x: f * 0.05, z: 20, facing: 0, moving: true }, 1000 + f * 16.7);
    }
    const sent = sock.sentOf('control:move').length;
    expect(sent).toBeLessThanOrEqual(15);
    expect(sent).toBeGreaterThanOrEqual(13);

    sock.sent = [];
    for (let f = 0; f < 30; f++) {
      useRealtime.getState().move({ x: 1, z: 20, facing: 0, moving: false }, 3000 + f * 100);
    }
    expect(sock.sentOf('control:move')).toHaveLength(1);
  });

  it('그만두면 control:stop을 보내고 걸어서 자리로 돌아간다', () => {
    useRealtime.getState().startControl();
    useRealtime.getState().stopControl();
    expect(sock.sentOf('control:stop')).toHaveLength(1);
    expect(useRealtime.getState().controlling).toBe(false);
    expect(useRealtime.getState().returning['me']).toBeDefined();
  });

  it('서버가 조종을 풀면(60초 무입력) 조종 상태가 꺼진다', () => {
    useRealtime.getState().startControl();
    sock.serverEmit('control:released', { memberId: 'me' });
    expect(useRealtime.getState()).toMatchObject({ controlling: false, local: null });
    expect(useRealtime.getState().returning['me']).toBeDefined();
  });

  it('승인 안 된 멤버·연결 끊김이면 시작하지 않는다', () => {
    sock.serverEmit('disconnect');
    useRealtime.getState().startControl();
    expect(sock.sentOf('control:start')).toHaveLength(0);
  });

  it('이모지를 보낸다', () => {
    useRealtime.getState().sendEmote('🎉');
    expect(sock.sentOf('emote')).toEqual([{ emoji: '🎉' }]);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -w @4this/web -- realtime`
Expected: FAIL — `Failed to resolve import "../api/socket"` / `"./realtime"`

- [ ] **Step 4: 구현**

`apps/web/src/api/socket.ts`:

```ts
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@4this/shared';

/** 이벤트 타입이 붙은 Socket.IO 소켓 (shared/schema/socket.ts) */
export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * 같은 출처의 /socket.io에 연결한다. 세션 쿠키(sid)로 서버가 사용자를 알아본다.
 * 끊기면 socket.io가 알아서 다시 연결한다.
 */
export function createSocket(): GameSocket {
  return io({ withCredentials: true });
}
```

`apps/web/src/store/realtime.ts`:

```ts
import { create } from 'zustand';
import {
  CAMPUS,
  SOCKET_LIMITS,
  sampleAt,
  type ControlMove,
  type Emoji,
  type PlaceId,
  type Presence,
  type Vec2,
} from '@4this/shared';
import { createSocket, type GameSocket } from '../api/socket';
import type { ActiveEmote } from '../world/contracts';
import { freeSpot } from '../world/sim/collision';
import { createThrottle } from '../world/sim/input';
import { memberObjects } from '../world/sim/registry';
import { planReturn, pushSample, type RemoteTrack, type ReturnWalk } from '../world/sim/remote';
import { useSession } from './session';
import { useWorld } from './world';

/** 이모지 말풍선이 떠 있는 시간 */
export const EMOTE_MS = 3000;

export type ConnectionState = 'connected' | 'reconnecting';

export interface RealtimeState {
  connection: ConnectionState;
  presence: Presence;
  /** 다른 사람이 조종 중인 캐릭터의 최근 상태 (10 Hz) */
  remotes: Record<string, RemoteTrack>;
  /** 조종이 풀려 placement 자리로 걸어서 돌아가는 중 */
  returning: Record<string, ReturnWalk>;
  emotes: Record<string, ActiveEmote>;
  /** 내가 조종 중인가 */
  controlling: boolean;
  /** 조종 중인 내 캐릭터의 위치 (화면은 서버 응답을 기다리지 않고 이것을 그린다) */
  local: ControlMove | null;
  presenceCollapsed: boolean;
  boardOpen: boolean;

  /** 소켓을 연결하고 이벤트를 단다. 돌려준 함수를 부르면 끊는다 */
  connect: (socket?: GameSocket) => () => void;
  startControl: () => void;
  stopControl: () => void;
  /** 내 조종 위치를 갱신하고, 초당 15회 이하로 서버에 보낸다 */
  move: (m: ControlMove, nowMs: number) => void;
  sendEmote: (emoji: Emoji) => void;
  togglePresence: () => void;
  openBoard: () => void;
  closeBoard: () => void;
}

const EMPTY_PRESENCE: Presence = { members: [], spectators: 0 };

/** 좁은 화면(모바일)에서는 접속자 패널(하단 시트)을 접은 채로 시작한다 */
function startCollapsed(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 640px)').matches
    : false;
}

let socket: GameSocket | null = null;
let allowMove = createThrottle(SOCKET_LIMITS.movePerSec);
/** 마지막으로 서버에 보낸 위치. 같으면 다시 보내지 않는다 (가만히 있으면 60초 뒤 서버가 조종을 푼다) */
let lastSent: ControlMove | null = null;

const sameMove = (a: ControlMove | null, b: ControlMove) =>
  a !== null && a.x === b.x && a.z === b.z && a.facing === b.facing && a.moving === b.moving;

/** 로그인한 승인 멤버면 그 아이디 */
export function myMemberId(): string | null {
  const s = useSession.getState().session;
  return s.kind === 'member' && s.me.status === 'approved' ? s.me.id : null;
}

/**
 * placement 자리로 걸어 돌아가는 길. 자리가 건물 안이면 그 건물 문까지 걷고(그다음은 placement가
 * 자리로 옮긴다), 그날 캠퍼스에 없을 시각이면 정문 밖으로 걸어 나간다.
 */
function returnFrom(memberId: string, from: Vec2): ReturnWalk {
  const world = useWorld.getState();
  const t = world.now();
  const target = sampleAt(world.ensurePlan(), memberId, t);
  let to: Vec2 = CAMPUS.gateSpawn;
  if (target && target.placeId in CAMPUS.places) {
    const place = CAMPUS.places[target.placeId as PlaceId];
    to = CAMPUS.graph.nodes[CAMPUS.buildings[place.building].doorNode]!;
  } else if (target) {
    to = [target.position[0], target.position[2]];
  }
  return planReturn(CAMPUS, from, to, Date.now(), target?.status ?? '하교 중');
}

export const useRealtime = create<RealtimeState>()((set, get) => ({
  connection: 'reconnecting',
  presence: EMPTY_PRESENCE,
  remotes: {},
  returning: {},
  emotes: {},
  controlling: false,
  local: null,
  presenceCollapsed: startCollapsed(),
  boardOpen: false,

  connect: (given) => {
    const s = given ?? createSocket();
    socket = s;
    allowMove = createThrottle(SOCKET_LIMITS.movePerSec);
    lastSent = null;

    s.on('connect', () => set({ connection: 'connected' }));
    s.on('disconnect', () => set({ connection: 'reconnecting', controlling: false, local: null }));
    s.on('time', ({ serverTime }) => useWorld.getState().syncClock(serverTime));
    s.on('presence', (presence) => set({ presence }));
    s.on('world:changed', () => void useWorld.getState().load());
    s.on('control:state', (states) => {
      const me = myMemberId();
      const at = Date.now();
      set((st) => {
        const remotes = { ...st.remotes };
        const returning = { ...st.returning };
        for (const { memberId, ...m } of states) {
          if (memberId === me && st.controlling) continue;
          remotes[memberId] = pushSample(remotes[memberId], { ...m, at });
          delete returning[memberId];
        }
        return { remotes, returning };
      });
    });
    s.on('control:released', ({ memberId }) => {
      const st = get();
      const isMe = memberId === myMemberId();
      const last = st.remotes[memberId]?.last ?? (isMe ? st.local : null);
      const remotes = { ...st.remotes };
      delete remotes[memberId];
      const returning = { ...st.returning };
      if (last) returning[memberId] = returnFrom(memberId, [last.x, last.z]);
      set({
        remotes,
        returning,
        ...(isMe ? { controlling: false, local: null } : {}),
      });
    });
    s.on('emote', ({ memberId, emoji }) => {
      const emote: ActiveEmote = { emoji, at: performance.now() };
      set((st) => ({ emotes: { ...st.emotes, [memberId]: emote } }));
      setTimeout(() => {
        set((st) => {
          if (st.emotes[memberId] !== emote) return st;
          const emotes = { ...st.emotes };
          delete emotes[memberId];
          return { emotes };
        });
      }, EMOTE_MS);
    });

    // 로그인·로그아웃하면 새 쿠키로 다시 연결한다
    const unsub = useSession.subscribe((now, prev) => {
      if (now.session !== prev.session) {
        s.disconnect();
        s.connect();
      }
    });

    return () => {
      unsub();
      s.removeAllListeners();
      s.disconnect();
      if (socket === s) socket = null;
      set({ connection: 'reconnecting', controlling: false, local: null });
    };
  },

  startControl: () => {
    const me = myMemberId();
    if (!socket || !me || get().connection !== 'connected') return;
    const shown = memberObjects.get(me);
    const from: Vec2 = shown?.visible
      ? [shown.position.x, shown.position.z]
      : CAMPUS.graph.nodes[CAMPUS.gateNode]!;
    const [x, z] = freeSpot(CAMPUS, from);
    const local: ControlMove = { x, z, facing: Math.PI, moving: false };
    socket.emit('control:start');
    socket.emit('control:move', local);
    lastSent = local;
    const returning = { ...get().returning };
    delete returning[me];
    set({ controlling: true, local, returning });
    useWorld.getState().focusMember(me);
  },

  stopControl: () => {
    const me = myMemberId();
    const { local } = get();
    socket?.emit('control:stop');
    const returning = { ...get().returning };
    if (me && local) returning[me] = returnFrom(me, [local.x, local.z]);
    set({ controlling: false, local: null, returning });
  },

  move: (m, nowMs) => {
    if (!get().controlling) return;
    if (!sameMove(get().local, m)) set({ local: m });
    // 보내지 못한 마지막 위치는 다음 프레임에 다시 시도한다 (멈춤 신호가 빠지지 않게)
    if (!sameMove(lastSent, m) && allowMove(nowMs)) {
      socket?.emit('control:move', m);
      lastSent = m;
    }
  },

  sendEmote: (emoji) => {
    if (get().connection === 'connected') socket?.emit('emote', { emoji });
  },

  togglePresence: () => set((st) => ({ presenceCollapsed: !st.presenceCollapsed })),
  openBoard: () => set({ boardOpen: true }),
  closeBoard: () => set({ boardOpen: false }),
}));
```

`apps/web/src/world/sim/resolvePose.ts` 전체 (cw#3 판을 넓힌다):

```ts
import { sampleAt, type Pose } from '@4this/shared';
import { myMemberId, useRealtime } from '../../store/realtime';
import { useWorld } from '../../store/world';
import { controlPose, remotePose, sampleReturn } from './remote';

/**
 * 멤버가 시각 t에 보여야 할 모습. 매 프레임 MemberAvatar가 부른다. 우선순위:
 * 1) 내가 조종 중이면 내 로컬 위치 2) 다른 사람이 조종 중이면 받은 상태(보간)
 * 3) 조종이 풀려 걸어서 돌아가는 중이면 그 길 4) placement 결과
 */
export function resolvePose(memberId: string, t: number): Pose | null {
  const rt = useRealtime.getState();
  if (rt.controlling && rt.local && memberId === myMemberId()) return controlPose(rt.local);
  const wall = Date.now();
  const remote = rt.remotes[memberId];
  if (remote) return remotePose(remote, wall);
  const walk = rt.returning[memberId];
  if (walk) {
    const pose = sampleReturn(walk, wall);
    if (pose) return pose;
  }
  return sampleAt(useWorld.getState().ensurePlan(), memberId, t);
}
```

- [ ] **Step 5: 통과·타입 확인**

Run: `npm test -w @4this/web && npm run typecheck -w @4this/web`
Expected: PASS — realtime 13개 추가, 타입 에러 0

- [ ] **Step 6: 커밋**

```bash
git add apps/web/package.json package-lock.json apps/web/src/api apps/web/src/store apps/web/src/world/sim/resolvePose.ts
git commit -m "feat: Socket.IO 클라이언트·실시간 스토어(presence·조종·복귀·이모지·시계 보정)"
```

---

### Task 3: 오버레이 훅 나머지 채우기

**Files:**
- Modify: `apps/web/src/store/overlay.ts`
- Test: `apps/web/src/store/overlay.realtime.test.ts` (cw#3의 `overlay.test.ts`는 그대로 통과해야 한다)

**Interfaces:**
- Consumes: `useRealtime`(`useShallow`로 고른 값), `myMemberId`, `boardAt`, `sampleAt`, `CONTROL_STATUS`, `PresenceEntry`
- Produces: `useOverlayProps()` 전체 (위 Interfaces 참고)

- [ ] **Step 1: 실패하는 테스트 작성** — `apps/web/src/store/overlay.realtime.test.ts`

```ts
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOOK } from '@4this/shared';
import { useOverlayProps } from './overlay';
import { useRealtime } from './realtime';
import { useSession } from './session';
import { useWorld } from './world';

const WED_1410 = Date.parse('2026-10-21T14:10:00+09:00');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(WED_1410);
  useWorld.setState(useWorld.getInitialState(), true);
  useRealtime.setState(useRealtime.getInitialState(), true);
  useWorld.getState().setWorld({
    serverTime: WED_1410,
    members: [
      {
        id: 'a',
        username: '철수',
        look: DEFAULT_LOOK,
        schedules: [{ day: 2, start: '14:00', end: '16:00', kind: 'lecture2' }],
      },
      {
        id: 'b',
        username: '지우',
        look: { ...DEFAULT_LOOK, animal: 'duck' },
        schedules: [{ day: 2, start: '14:00', end: '15:00', kind: 'external', title: '알바' }],
      },
    ],
  });
  useSession.setState({
    session: {
      kind: 'member',
      me: { id: 'b', username: '지우', status: 'approved', look: DEFAULT_LOOK },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  useSession.setState({ session: { kind: 'guest' } });
});

describe('useOverlayProps (cw#4 범위)', () => {
  it('접속자 목록: 나를 맨 위에, 이름표 문구·조종 여부·구경 수', () => {
    useRealtime.setState({
      connection: 'connected',
      presence: {
        members: [
          { id: 'a', controlling: false },
          { id: 'b', controlling: true },
          { id: 'ghost', controlling: false },
        ],
        spectators: 2,
      },
    });
    const { result } = renderHook(() => useOverlayProps());
    expect(result.current.presence.entries).toEqual([
      expect.objectContaining({ id: 'b', isMe: true, controlling: true, status: '🎮 조종 중' }),
      expect.objectContaining({ id: 'a', isMe: false, status: '2학년 강의', username: '철수' }),
    ]);
    expect(result.current.presence.spectators).toBe(2);
    act(() => result.current.presence.onSelect('a'));
    expect(useWorld.getState().focusedMember).toBe('a');
    act(() => result.current.presence.onToggle());
    expect(result.current.presence.collapsed).toBe(true);
  });

  it('승인 멤버가 연결돼 있을 때만 조종·이모지를 쓸 수 있다', () => {
    const { result } = renderHook(() => useOverlayProps());
    expect(result.current.canControl).toBe(true);
    expect(result.current.connection.state).toBe('reconnecting');
    expect(result.current.control.disabled).toBe(true);
    expect(result.current.emoteBar.disabled).toBe(true);
    act(() => useRealtime.setState({ connection: 'connected' }));
    expect(result.current.control.disabled).toBe(false);
    expect(result.current.emoteBar.disabled).toBe(false);

    act(() => useSession.setState({ session: { kind: 'guest' } }));
    expect(result.current.canControl).toBe(false);
    expect(result.current.control.disabled).toBe(true);
  });

  it('게시판을 열면 외부 일정 목록', () => {
    const { result } = renderHook(() => useOverlayProps());
    expect(result.current.board).toBeNull();
    act(() => useRealtime.getState().openBoard());
    expect(result.current.board?.entries).toEqual([
      { memberId: 'b', username: '지우', title: '알바', until: '15:00' },
    ]);
    act(() => result.current.board!.onClose());
    expect(result.current.board).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/web -- overlay`
Expected: FAIL — `expected [] to deeply equal [ ObjectContaining{…}, … ]` (presence 항목이 아직 비어 있다) 외 2개

- [ ] **Step 3: 구현** — `apps/web/src/store/overlay.ts` 전체

```ts
import { useShallow } from 'zustand/react/shallow';
import { CAMPUS, boardAt, sampleAt } from '@4this/shared';
import type { BuildingPanelProps, OverlayProps, PresenceEntry } from '../ui/contracts';
import { formatClock, skyIconAt } from '../world/sim/labels';
import { peopleIn, snapshotAt } from '../world/sim/occupancy';
import { CONTROL_STATUS } from '../world/sim/remote';
import { useNow } from './clock';
import { myMemberId, useRealtime } from './realtime';
import { useSession } from './session';
import { useWorld } from './world';

/**
 * 오버레이에 넣을 실시간 데이터와 핸들러. th의 UiRoot가 부르고, th의 ui/overlay/* 컴포넌트에 나눠 준다.
 * 1초마다 다시 계산한다 (시계·이름표 문구).
 */
export function useOverlayProps(): OverlayProps {
  const t = useNow(1000);
  const members = useWorld((s) => s.members);
  const plan = useWorld((s) => s.plan);
  const focusedBuilding = useWorld((s) => s.focusedBuilding);
  const hiddenAboveFloor = useWorld((s) => s.hiddenAboveFloor);
  const focusBuilding = useWorld((s) => s.focusBuilding);
  const focusMember = useWorld((s) => s.focusMember);
  const setHiddenAboveFloor = useWorld((s) => s.setHiddenAboveFloor);
  // 조종 중에는 local이 매 프레임 바뀌므로 필요한 값만 골라 구독한다
  const rt = useRealtime(
    useShallow((s) => ({
      connection: s.connection,
      presence: s.presence,
      presenceCollapsed: s.presenceCollapsed,
      controlling: s.controlling,
      boardOpen: s.boardOpen,
      togglePresence: s.togglePresence,
      sendEmote: s.sendEmote,
      startControl: s.startControl,
      stopControl: s.stopControl,
      closeBoard: s.closeBoard,
    })),
  );
  useSession((s) => s.session); // 로그인 상태가 바뀌면 다시 렌더
  const me = myMemberId();
  const online = rt.connection === 'connected';

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

  const byId = new Map(members.map((m) => [m.id, m]));
  const entries: PresenceEntry[] = [];
  for (const p of rt.presence.members) {
    const m = byId.get(p.id);
    if (!m) continue; // 방금 승인돼 아직 world를 다시 받지 않은 멤버
    const pose = plan ? sampleAt(plan, m.id, t) : null;
    entries.push({
      id: m.id,
      username: m.username,
      look: m.look,
      status: p.controlling ? CONTROL_STATUS : (pose?.status ?? '캠퍼스 밖'),
      controlling: p.controlling,
      isMe: m.id === me,
    });
  }
  // 나를 맨 위에, 나머지는 이름 순
  entries.sort((a, b) =>
    a.isMe !== b.isMe ? (a.isMe ? -1 : 1) : a.username < b.username ? -1 : 1,
  );

  return {
    topBar: { clock: formatClock(t), skyIcon: skyIconAt(t) },
    presence: {
      entries,
      spectators: rt.presence.spectators,
      collapsed: rt.presenceCollapsed,
      onToggle: rt.togglePresence,
      onSelect: (id) => focusMember(id),
    },
    emoteBar: { disabled: !online || !me, onEmote: rt.sendEmote },
    control: {
      controlling: rt.controlling,
      disabled: !online || !me,
      onStart: rt.startControl,
      onStop: rt.stopControl,
    },
    connection: { state: rt.connection },
    board: rt.boardOpen ? { entries: plan ? boardAt(plan, t) : [], onClose: rt.closeBoard } : null,
    building,
    canControl: me !== null,
  };
}
```

- [ ] **Step 4: 통과·타입 확인**

Run: `npm test -w @4this/web && npm run typecheck -w @4this/web`
Expected: PASS — 58개

- [ ] **Step 5: 커밋**

```bash
git add apps/web/src/store
git commit -m "feat: 오버레이 접속자·조종·이모지·연결 배지·게시판 연결"
```

---

### Task 4: 3D 연결 — 조종 입력·게시판 클릭·이모지·window.__world

**Files:**
- Create: `apps/web/src/world/sim/ControlDriver.tsx`, `apps/web/src/world/sim/BoardHotspot.tsx`, `apps/web/src/world/sim/debug.ts`
- Modify: `apps/web/src/world/sim/MemberAvatar.tsx`, `apps/web/src/world/WorldCanvas.tsx`

**Interfaces:**
- Consumes: Task 1~3, `CAMPUS.boardPos`, `Character`의 `emote` prop
- Produces: `<ControlDriver />`(조종 중에만 바닥에 투명 판을 깔아 클릭·탭 지점을 받는다. 키 입력은 `input`·`textarea`에 쓰는 중이면 무시), `<BoardHotspot />`(게시판 자리 2×2×0.6 m 투명 상자, 누르면 `openBoard()`), `installWorldDebug()`, `WorldCanvas`가 마운트 시 `load()` + `useRealtime.connect()`

- [ ] **Step 1: 조종 입력** — `apps/web/src/world/sim/ControlDriver.tsx`

```tsx
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Vector3 } from 'three';
import { CAMPUS, CAMPUS_HALF, type Vec2 } from '@4this/shared';
import { useRealtime } from '../../store/realtime';
import { resolveMove } from './collision';
import { CONTROL_KEYS, CONTROL_SPEED, keyDirection, toWorld } from './input';

/** 입력 칸에 글을 쓰는 중이면 키를 가로채지 않는다 */
function isTyping(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/**
 * 내 캐릭터 조종 (§9): WASD·방향키는 카메라 기준으로 걷고, 바닥을 누르면(탭하면) 그 지점까지 걷는다.
 * 매 프레임 충돌을 풀어 로컬 위치를 옮기고, realtime.move가 초당 15회 이하로 서버에 보낸다.
 */
export function ControlDriver() {
  const controlling = useRealtime((s) => s.controlling);
  const camera = useThree((s) => s.camera);
  const keys = useRef(new Set<string>());
  const clickTarget = useRef<Vec2 | null>(null);
  const look = useRef(new Vector3());

  useEffect(() => {
    if (!controlling) return;
    const pressed = keys.current;
    const down = (e: KeyboardEvent) => {
      if (!CONTROL_KEYS.has(e.code) || isTyping(e.target)) return;
      e.preventDefault();
      pressed.add(e.code);
    };
    const up = (e: KeyboardEvent) => pressed.delete(e.code);
    const blur = () => pressed.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
      pressed.clear();
      clickTarget.current = null;
    };
  }, [controlling]);

  useFrame((_, dt) => {
    const rt = useRealtime.getState();
    const local = rt.local;
    if (!rt.controlling || !local) return;
    const pos: Vec2 = [local.x, local.z];

    let dir: Vec2 = [0, 0];
    const input = keyDirection(keys.current);
    if (input[0] !== 0 || input[1] !== 0) {
      camera.getWorldDirection(look.current);
      dir = toWorld(input, [look.current.x, look.current.z]);
      clickTarget.current = null;
    } else if (clickTarget.current) {
      const dx = clickTarget.current[0] - pos[0];
      const dz = clickTarget.current[1] - pos[1];
      const d = Math.hypot(dx, dz);
      if (d < 0.1) clickTarget.current = null;
      else dir = [dx / d, dz / d];
    }

    const moving = dir[0] !== 0 || dir[1] !== 0;
    const step = Math.min(CONTROL_SPEED * dt, 0.5);
    const next = moving
      ? resolveMove(CAMPUS, pos, [pos[0] + dir[0] * step, pos[1] + dir[1] * step])
      : pos;
    const stuck = moving && next[0] === pos[0] && next[1] === pos[1];
    if (stuck) clickTarget.current = null;
    rt.move(
      {
        x: next[0],
        z: next[1],
        facing: moving ? Math.atan2(dir[0], dir[1]) : local.facing,
        moving: moving && !stuck,
      },
      performance.now(),
    );
  });

  const onFloor = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    clickTarget.current = [e.point.x, e.point.z];
  };

  if (!controlling) return null;
  // 조종 중에만 바닥 전체를 덮는 투명한 판을 깔아 클릭·탭 지점을 받는다
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 0]} onPointerDown={onFloor}>
      <planeGeometry args={[CAMPUS_HALF * 2, CAMPUS_HALF * 2]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
```

- [ ] **Step 2: 게시판 클릭 영역** — `apps/web/src/world/sim/BoardHotspot.tsx`

게시판 모델은 hm의 `Campus`가 그린다. `CampusProps`에 게시판 클릭 콜백이 없으므로, 계약을 바꾸지 않고 sim이 같은 자리(`CAMPUS.boardPos`)에 보이지 않는 클릭 영역을 둔다.

```tsx
import type { ThreeEvent } from '@react-three/fiber';
import { CAMPUS } from '@4this/shared';
import { useRealtime } from '../../store/realtime';

/**
 * 정문 게시판 자리에 놓는 보이지 않는 클릭 영역. 누르면 게시판 패널을 연다.
 * (게시판 모델은 hm의 Campus가 그리고, 클릭은 sim이 받는다)
 */
export function BoardHotspot() {
  const openBoard = useRealtime((s) => s.openBoard);
  const [x, z] = CAMPUS.boardPos;
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    openBoard();
  };
  return (
    <mesh
      position={[x, 1, z]}
      onClick={onClick}
      onPointerOver={() => (document.body.style.cursor = 'pointer')}
      onPointerOut={() => (document.body.style.cursor = '')}
    >
      <boxGeometry args={[2, 2, 0.6]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}
```

- [ ] **Step 3: E2E 조회 창구** — `apps/web/src/world/sim/debug.ts`

```ts
import { useRealtime } from '../../store/realtime';
import { useWorld } from '../../store/world';
import { memberObjects } from './registry';

/** E2E·개발용 조회 창구. 3D 캔버스 안은 DOM이 없어서 Playwright가 이것으로 확인한다 */
export interface WorldDebug {
  /** 월드에 있는 멤버 아이디 */
  members: () => string[];
  /** 화면에 그려진 캐릭터 위치. 그려지지 않았으면 null */
  positionOf: (memberId: string) => { x: number; y: number; z: number; visible: boolean } | null;
  /** 조종 중인 멤버 아이디 (presence 기준) */
  controlling: () => string[];
  /** 지금 떠 있는 이모지 */
  emoteOf: (memberId: string) => string | null;
  /** 소켓 연결 상태 */
  connection: () => string;
}

declare global {
  interface Window {
    __world?: WorldDebug;
  }
}

/** 개발 서버이거나 VITE_E2E=1로 빌드했을 때만 window.__world를 단다 */
export function installWorldDebug(): void {
  if (!import.meta.env.DEV && import.meta.env.VITE_E2E !== '1') return;
  window.__world = {
    members: () => useWorld.getState().members.map((m) => m.id),
    positionOf: (id) => {
      const o = memberObjects.get(id);
      return o ? { x: o.position.x, y: o.position.y, z: o.position.z, visible: o.visible } : null;
    },
    controlling: () =>
      useRealtime
        .getState()
        .presence.members.filter((m) => m.controlling)
        .map((m) => m.id),
    emoteOf: (id) => useRealtime.getState().emotes[id]?.emoji ?? null,
    connection: () => useRealtime.getState().connection,
  };
}
```

- [ ] **Step 4: 이모지 연결** — `apps/web/src/world/sim/MemberAvatar.tsx` 전체

```tsx
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import type { Group } from 'three';
import { CAMPUS, type PublicMember } from '@4this/shared';
import { useRealtime } from '../../store/realtime';
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
  const emote = useRealtime((s) => s.emotes[member.id] ?? null);

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
      emote={emote}
      highlight={isMe}
      onClick={() => focusMember(member.id)}
    />
  );
}
```

- [ ] **Step 5: WorldCanvas** — `apps/web/src/world/WorldCanvas.tsx` 전체

```tsx
import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { useEffect, useState, type ReactNode } from 'react';
import { useRealtime } from '../store/realtime';
import { useWorld } from '../store/world';
import { Campus } from './campus/Campus';
import { BoardHotspot } from './sim/BoardHotspot';
import { OVERVIEW } from './sim/camera';
import { CameraRig } from './sim/CameraRig';
import { ControlDriver } from './sim/ControlDriver';
import { installWorldDebug } from './sim/debug';
import { Professor } from './sim/Professor';
import { SimMembers } from './sim/SimMembers';
import { TextFallback } from './sim/TextFallback';
import { useWorldTick } from './sim/useWorldTick';
import { hasWebGL } from './sim/webgl';

/** Canvas 안의 장면: 캠퍼스 + 멤버 + 교수님 + 게시판 클릭 영역 + 조종 + 카메라 */
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
      <BoardHotspot />
      <ControlDriver />
      <CameraRig />
    </>
  );
}

/**
 * 3D 월드 진입점. 마운트되면 GET /api/world를 부르고 소켓을 연결한다
 * (autoLoad=false면 둘 다 하지 않는다: 개발 픽스처용).
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
    installWorldDebug();
    if (!autoLoad) return;
    void useWorld.getState().load();
    return useRealtime.getState().connect();
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

- [ ] **Step 6: 타입·빌드·테스트 확인**

Run: `npm run typecheck -w @4this/web && npm test -w @4this/web && npm run build`
Expected: 타입 에러 0, 58개 통과, `✓ built`

- [ ] **Step 7: 손으로 확인 (서버 wj#3 이상 + 웹 dev)**

Run: `ADMIN_PASSWORD=admin SESSION_SECRET=dev-secret-0123456789abcdef0123 npm run dev` 후 브라우저 두 개(하나는 시크릿 창)로 http://localhost:5173
Expected:
- 승인된 멤버로 로그인한 창: `🎮 조종하기` → 카메라가 내 캐릭터로 가고, WASD·방향키(카메라 기준)로 걷는다. 건물 벽·연못·맵 끝에서 막히고 벽을 따라 미끄러진다. 바닥을 누르면 그 지점까지 걷는다
- 시크릿 창(구경꾼): 접속자 목록에 `🎮`, 그 캐릭터가 부드럽게 움직인다. 이모지 버튼 → 상대 창에 3초 말풍선
- `자동으로` → 그 자리에서 가장 가까운 길을 따라 시간표 자리로 걸어서 돌아간다
- 서버를 끄면 `재연결 중…` 배지, 캐릭터는 계속 시간표대로 움직이고 조종·이모지 버튼은 비활성. 서버를 켜면 다시 연결된다
- 정문 게시판을 누르면 외부 일정 패널
- 조종한 채로 60초 가만히 두면 서버가 풀고 캐릭터가 걸어서 돌아간다

- [ ] **Step 8: 커밋**

```bash
git add apps/web/src/world
git commit -m "feat: 키보드·클릭 조종, 정문 게시판 클릭, 이모지 말풍선, window.__world"
```

---

### Task 5: Playwright E2E와 CI 잡

**Files:**
- Create: `playwright.config.ts`, `e2e/env.ts`, `e2e/tsconfig.json`, `e2e/world.spec.ts`
- Modify: 루트 `package.json`, `eslint.config.js`, `.prettierignore`, `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: REST 경로(`/api/auth/signup`, `/api/me/schedules`, `/api/auth/admin`, `/api/admin/members/:id/approve`), th의 버튼 이름(`조종하기`, `자동으로`, 이모지 `👋`), 접속자 목록에 보이는 `username` 텍스트, `window.__world`
- 서버 전제(wj#4): `WEB_DIST`를 정적 서빙하고 `/api`·`/socket.io` 외 경로는 `index.html`. `npm run start -w @4this/server`가 `PORT`·`DB_PATH`·`ADMIN_PASSWORD`·`SESSION_SECRET`를 읽는다

- [ ] **Step 1: 의존성 설치**

```bash
npm install -D @playwright/test@^1.64.1
npx playwright install chromium
```

- [ ] **Step 2: 스크립트·무시 목록**

루트 `package.json`의 `scripts`에서 두 줄을 바꾸고 한 줄을 더한다(old → new):

```json
    "typecheck": "npm run typecheck --workspaces --if-present",
    "build": "npm run build -w @4this/web"
```
→
```json
    "typecheck": "npm run typecheck --workspaces --if-present && tsc -p e2e",
    "build": "npm run build -w @4this/web",
    "e2e": "playwright test"
```

`eslint.config.js`의 `ignores` 줄(old → new):

```js
  { ignores: ['**/dist/**', '**/node_modules/**', 'docs/prototype/**', 'coverage/**'] },
```
→
```js
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'docs/prototype/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
```

`.prettierignore` 끝에 두 줄을 붙인다(다른 사람이 더한 줄은 그대로 둔다). `.gitignore`가 있으면 같은 두 줄을 거기에도 붙인다:

```
playwright-report
test-results
```

- [ ] **Step 3: 설정과 테스트 작성**

`e2e/env.ts`:

```ts
/** E2E 서버 설정. playwright.config.ts와 테스트가 같은 값을 쓴다 */
export const E2E_PORT = Number(process.env.E2E_PORT ?? 8080);
export const ADMIN_PASSWORD = 'e2e-admin-password';
export const SESSION_SECRET = 'e2e-session-secret-0123456789abcdef';
```

`e2e/tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": {
    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "types": ["node", "vite/client"]
  },
  "include": [".", "../playwright.config.ts"]
}
```

`playwright.config.ts`:

```ts
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { ADMIN_PASSWORD, E2E_PORT, SESSION_SECRET } from './e2e/env';

/**
 * E2E: 웹을 VITE_E2E=1로 빌드하고(window.__world 노출), 서버가 그 빌드를 정적 서빙한다(wj#4).
 * DB는 실행마다 새 임시 파일이라 테스트끼리 섞이지 않는다.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: 'retain-on-failure',
    // CI에는 GPU가 없어 소프트웨어 WebGL을 쓴다
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start -w @4this/server',
    url: `http://localhost:${E2E_PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      VITE_E2E: '1',
      WEB_DIST: resolve('apps/web/dist'),
      ADMIN_PASSWORD,
      SESSION_SECRET,
      DB_PATH: join(tmpdir(), `4this-e2e-${Date.now()}.db`),
      PORT: String(E2E_PORT),
      NODE_ENV: 'test',
    },
  },
});
```

`e2e/world.spec.ts` (지금 시각이 KST 06:05–23:30이면 지금 진행 중인 1시간 강의를 넣어 "캐릭터 등장"까지 확인하고, 그 밖의 시각이면 그 확인만 건너뛴다 — 조종을 시작하면 시각과 상관없이 캐릭터가 정문에 나타난다):

```ts
import { expect, test, type Page } from '@playwright/test';
import type { WorldDebug } from '../apps/web/src/world/sim/debug';
import { ADMIN_PASSWORD } from './env';

declare global {
  interface Window {
    __world?: WorldDebug;
  }
}

const KST = 9 * 60 * 60 * 1000;

/** 지금(KST) 진행 중인 1시간짜리 강의. 06:05 이전·23:30 이후면 넣을 수 없어 null */
function lectureNow(): { day: number; start: string; end: string; kind: 'lecture1' } | null {
  const kst = new Date(Date.now() + KST);
  const min = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  if (min < 6 * 60 + 5 || min >= 23 * 60 + 30) return null;
  const start = Math.floor(min / 30) * 30;
  const hhmm = (m: number) =>
    `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  return {
    day: (kst.getUTCDay() + 6) % 7,
    start: hhmm(start),
    end: hhmm(start + 60),
    kind: 'lecture1',
  };
}

/** 구경하는 페이지에서 멤버 캐릭터의 화면 위치 */
const positionOf = (page: Page, id: string) =>
  page.evaluate((id) => window.__world!.positionOf(id), id);
const emoteOf = (page: Page, id: string) => page.evaluate((id) => window.__world!.emoteOf(id), id);

test('가입 → 관리자 승인 → 캐릭터 등장 → 조종 → 다른 브라우저에서 움직임·이모지 확인', async ({
  browser,
}) => {
  const username = `e2e${Date.now() % 1_000_000}`;

  // 1) 가입 (이 컨텍스트에 세션 쿠키가 생긴다)
  const player = await browser.newContext();
  const page = await player.newPage();
  const signup = await page.request.post('/api/auth/signup', {
    data: { username, password: 'pw123456' },
  });
  expect(signup.ok()).toBeTruthy();
  const { me } = (await signup.json()) as { me: { id: string; status: string } };
  expect(me.status).toBe('pending');
  const lecture = lectureNow();
  if (lecture) {
    const put = await page.request.put('/api/me/schedules', { data: { items: [lecture] } });
    expect(put.ok()).toBeTruthy();
  }

  // 2) 관리자 로그인 → 승인
  const admin = await browser.newContext();
  expect(
    (await admin.request.post('/api/auth/admin', { data: { password: ADMIN_PASSWORD } })).ok(),
  ).toBeTruthy();
  expect((await admin.request.post(`/api/admin/members/${me.id}/approve`)).ok()).toBeTruthy();

  // 3) 월드에 등장: 접속자 목록에 이름이 보이고, 소켓이 연결된다
  await page.goto('/');
  await page.waitForFunction(() => window.__world?.connection() === 'connected');
  await expect(page.getByText(username).first()).toBeVisible();
  await page.waitForFunction((id) => window.__world?.members().includes(id), me.id);
  if (lecture) {
    // 지금 강의 중이니 placement가 강의실에 앉힌다
    await expect.poll(() => positionOf(page, me.id).then((p) => p?.visible ?? false)).toBe(true);
  }

  // 4) 두 번째 브라우저(로그인 안 한 구경꾼)
  const viewer = await browser.newContext();
  const vpage = await viewer.newPage();
  await vpage.goto('/');
  await vpage.waitForFunction((id) => window.__world?.members().includes(id), me.id);

  // 5) 조종 시작 → 구경꾼 화면에서도 조종 중으로 보인다
  await page.getByRole('button', { name: /조종하기/ }).click();
  await vpage.waitForFunction((id) => window.__world?.controlling().includes(id), me.id);
  await expect.poll(() => positionOf(vpage, me.id).then((p) => p?.visible ?? false)).toBe(true);
  const before = (await positionOf(vpage, me.id))!;

  // 6) W를 1.5초 누르면 구경꾼 화면의 위치도 바뀐다
  await page.keyboard.down('w');
  await page.waitForTimeout(1500);
  await page.keyboard.up('w');
  await expect
    .poll(async () => {
      const after = (await positionOf(vpage, me.id))!;
      return Math.hypot(after.x - before.x, after.z - before.z);
    })
    .toBeGreaterThan(1);

  // 7) 이모지가 상대에게 보인다
  await page.getByRole('button', { name: '👋' }).click();
  await expect.poll(() => emoteOf(vpage, me.id)).toBe('👋');

  // 8) 자동으로 돌아가면 조종 표시가 사라진다
  await page.getByRole('button', { name: /자동으로/ }).click();
  await vpage.waitForFunction((id) => !window.__world?.controlling().includes(id), me.id);

  await Promise.all([player.close(), admin.close(), viewer.close()]);
});
```

- [ ] **Step 4: 목록·타입 확인**

Run: `npm run typecheck && npx playwright test --list`
Expected: 타입 에러 0, `Total: 1 test in 1 file`

- [ ] **Step 5: E2E 실행 (wj#4까지 머지된 main을 merge한 상태)**

Run: `npm run e2e`
Expected: `1 passed`. 실패하면 `npx playwright show-report`로 trace를 본다. 자주 나는 원인:
- `조종하기`/`자동으로` 버튼 이름이 다르면 th#4의 `ControlButton` 문구에 맞춘다(계약은 문구를 고정하지 않았다)
- 8080을 다른 프로세스가 쓰면 `E2E_PORT=8090 npm run e2e`

- [ ] **Step 6: CI 잡 추가** — `.github/workflows/ci.yml`의 `jobs:` 아래 `check` 잡 다음에 붙인다

```yaml

  e2e:
    runs-on: ubuntu-latest
    needs: check
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
      - name: 실패하면 리포트 올리기
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report
          retention-days: 7
```

- [ ] **Step 7: 전체 검사**

Run: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
Expected: 모두 통과 — shared 71개, web 58개(+ th·hm·wj가 더한 테스트)

- [ ] **Step 8: 커밋**

```bash
git add package.json package-lock.json eslint.config.js .prettierignore playwright.config.ts e2e .github/workflows/ci.yml
git add .gitignore 2>/dev/null || true
git commit -m "test: 가입→승인→조종→두 번째 브라우저 확인 Playwright E2E와 CI 잡"
```

---

### Task 6: PR과 마무리

- [ ] **Step 1: 최신 main 반영 후 전체 검사 + E2E**

```bash
git fetch origin && git merge origin/main
npm install
npm run typecheck && npm run lint && npm run format:check && npm test && npm run build && npm run e2e
```

Expected: 모두 통과

- [ ] **Step 2: push·PR**

```bash
git push origin cw
gh pr create --base main --head cw --title "[cw#4] 실시간 클라이언트 + E2E" --body-file .github/pull_request_template.md
```

PR 본문: 두 브라우저로 조종하는 화면 녹화(또는 스크린샷 2장), E2E 결과. 리뷰어 wj(소켓 동작 가정 확인)와 th(오버레이 연결 확인). 머지 방식 **Create a merge commit**.

- [ ] **Step 3: 브랜치 보호에 e2e 추가 (저장소 관리자)**

Settings → Branches → `main` → Required status checks에 `ci / e2e`를 더한다.

- [ ] **Step 4: 머지 후 알림**

단톡방: "cw#4 머지됨 — 16개 PR 완료. `docker compose up -d` 후 http://localhost:8080 에서 가입→승인→조종 시나리오를 손으로도 확인해 주세요(개요의 완성 기준)."

---

## Self-Review

- **스펙 커버리지:** §8.3 이벤트 전부(`presence`·`world:changed`·`control:start/stop/move`·`control:state`·`control:released`·`emote`·`time`, Task 2) · 초당 15회 스로틀(Task 1·2) · 60초 무입력(같은 위치 재전송 안 함, 서버가 풂 → `released` 처리, Task 2) · "placement로 걸어서 복귀"(Task 1 `planReturn`, Task 2) · §5.1 조종 충돌(건물 벽·연못·맵 경계, Task 1) · §9 키보드·바닥 클릭·탭, 조종 중 카메라 추적(`focusMember`), `자동으로` 해제, 접속자 패널·이름 클릭 → 캐릭터, 조종·이모지 바는 승인 멤버만(Task 3·4) · §6.3 이모지 말풍선 3초(Task 2·4) · §10 소켓 끊김 배지·월드 계속·조종/이모지 비활성·시계 보정(Task 2·3) · §11 E2E "가입 → 승인 → 등장 → 조종 → 두 번째 브라우저"(Task 5) · CI(Task 5).
- **플레이스홀더:** 없음.
- **계약 일치:** `OverlayProps`·`PresenceEntry`·`ActiveEmote`·`CharacterProps.emote`·소켓 이벤트 타입은 cw#1 그대로. `CampusProps`에 게시판 클릭을 더하지 않고 `BoardHotspot`으로 해결했다.
- **검증 범위:** 순수 로직·스토어·오버레이 훅은 vitest, 3D 연결은 타입체크·빌드·손 확인, 서버와 맞물린 동작은 E2E(wj#3·wj#4 필요).
