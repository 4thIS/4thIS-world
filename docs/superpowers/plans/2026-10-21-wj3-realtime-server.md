# [wj#3] Socket.IO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**담당:** 이우진 · 브랜치 `wj` · 웨이브 3 · **선행:** wj#2

**Goal:** 스펙 §8.3의 실시간 계층 — 접속 시 `time`, `presence`(멤버 탭 합치기·구경꾼 수·조종 표시), 조종권(마지막 탭)·이동 중계 10 Hz·60초 해제, 이모지, 횟수 제한, `world:changed` 브로드캐스트와 승인 취소 시 구경꾼 강등 — 을 Fastify 서버에 붙인다.

**Architecture:** 상태와 규칙은 소켓을 모르는 순수 클래스 `RealtimeHub`(`src/realtime-hub.ts`)에 두고 `now()`를 주입받는다 — vitest fake timers로 시간을 움직여 단위 테스트한다. `attachRealtime(app, opts)`(`src/realtime.ts`)는 Socket.IO 서버를 `app.server`에 붙여 이벤트를 허브에 연결하고, 100 ms 타이머로 묶음 전송·무입력 해제를 돌리며, `app.events`의 `world:changed`를 받아 소켓마다 세션을 다시 확인한 뒤 전체에 알린다. 통합 테스트는 실제 포트(0)에 socket.io-client로 붙고 `now`를 테스트가 쥔 시계로 바꿔 끼운다.

**Tech Stack:** socket.io ^4.8.4 · socket.io-client ^4.8.4(devDependency, 테스트용) · Fastify ^5.12.7 · @fastify/cookie ^11.1.3(`app.parseCookie`·`app.unsignCookie`) · vitest ^5.0.5

**설계 문서:** `docs/superpowers/specs/2026-10-21-4this-world-design.md` §8.3, §11(실시간: presence 집계, 마지막 탭 조종권, 60초 해제, 이모지·이동 횟수 제한, `world:changed`)

**계약 기준:** `docs/superpowers/plans/2026-10-21-cw1-foundation.md` — `packages/shared/src/schema/socket.ts`의 `ServerToClientEvents`, `ClientToServerEvents`, `Presence`, `ControlMove`, `ControlMoveSchema`, `ControlState`, `EmoteRequestSchema`, `EmoteEvent`, `EMOJIS`, `SOCKET_LIMITS { movePerSec: 15, emotePerSec: 1, controlIdleMs: 60_000, stateHz: 10 }`. cw#4의 클라이언트는 `io({ withCredentials: true })`(같은 출처, 기본 경로 `/socket.io`)로 붙는다.

## Global Constraints

개요의 공통 규칙:

- Node `>=24`, npm workspaces, `package-lock.json` 커밋. TypeScript는 `~5.9.3` 고정.
- 모든 패키지는 ESM. 공용 타입·이벤트·제한값은 **`@4this/shared`에서만** 가져온다(`SOCKET_LIMITS`의 숫자를 서버에 다시 쓰지 않는다).
- 좌표계: 단위 m, 캠퍼스 x·z ∈ [-25, 25], `facing` = `rotation.y`.
- 코드 스타일: Prettier(작은따옴표, 세미콜론, 100자). 주석과 사용자 문구는 한국어.
- 커밋: `feat:`/`test:`… + 한국어 설명. PR 제목: `[wj#3] Socket.IO`.
- 남의 소유 파일은 고치지 않는다. wj 소유: `apps/server/**`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `docs/deploy.md`.

이 PR 고유 제약 (스펙 §8.3):

- 사용자 판별: 연결할 때 쿠키 `sid`(wj#1의 서명 쿠키)를 `resolveSession`으로 확인한다. **승인된 멤버만 멤버**, 나머지(쿠키 없음·대기·거절·관리자)는 구경꾼.
- 연결 즉시 그 소켓에 `time { serverTime }`과 `presence`를 보낸다. `presence`는 바뀔 때만 전체에 보낸다. 멤버는 탭이 여러 개여도 한 번, `controlling`은 그 멤버의 조종권이 있는지.
- 조종권은 멤버당 하나, **마지막으로 `control:start`를 보낸 소켓**이 가진다. `control:move`는 조종권을 가진 소켓만, `ControlMoveSchema` 검증, 소켓당 초당 15회 초과분은 버리고, x·z는 ±25로 자른다. 숫자가 아니면 버린다.
- `control:state`: 100 ms(10 Hz)마다 바뀐 것이 있을 때만, 조종 중인 멤버 전체의 마지막 위치 배열.
- `control:released { memberId }`: `control:stop`(조종권 가진 소켓), 60초 무입력(`control:start`나 마지막으로 받아들인 `control:move`부터), 조종 소켓 끊김, 승인 취소·삭제로 강등될 때.
- `emote`: 승인 멤버만, 멤버당 초당 1회(탭을 합쳐서), `EmoteRequestSchema` 검증, 전체(보낸 사람 포함)에 `EmoteEvent { memberId, emoji, at: 서버 시각 }`.
- `app.events`의 `world:changed`(wj#2) → 소켓마다 세션을 다시 확인해 승인/강등을 반영하고(조종 중이면 `control:released`), 바뀐 `presence`와 `world:changed`를 전체에 보낸다.
- 접속자 정보는 메모리에만 둔다(프로세스 1개). 같은 출처라 CORS 설정은 하지 않는다.
- 시간 의존 로직은 주입한 `now()`만 쓴다. 타이머 주기는 옵션 `tickMs`(기본 `1000 / SOCKET_LIMITS.stateHz`).

## cw#4(실시간 클라이언트·E2E)와 맞춘 동작

- 연결되면 서버가 **바로** `time`과 `presence`를 보낸다(클라이언트가 요청하지 않는다).
- `control:state` 묶음에는 조종하는 **본인도** 들어간다(`io.emit` 전체 전송).
- `emote`는 보낸 사람에게도 돌아온다(전체 브로드캐스트) — 클라이언트는 자기 말풍선도 이 이벤트로 띄운다.
- 클라이언트는 같은 위치를 다시 보내지 않으므로, 60초 무입력 해제는 **서버 타이머**(100 ms 주기 `expireIdle`)가 맡는다. 가만히 서 있으면 60초 뒤 `control:released`가 오고 placement로 걸어서 돌아간다.

## File Structure

```
apps/server/
├─ package.json             socket.io, socket.io-client(dev) 추가
└─ src/
    ├─ realtime-hub.ts       RealtimeHub — 접속자·조종권·횟수 제한·무입력 해제 (순수 로직)
    ├─ realtime-hub.test.ts  fake timers 단위 테스트
    ├─ realtime.ts           attachRealtime(app, opts) — Socket.IO 연결, 타이머, world:changed
    ├─ realtime.test.ts      실제 포트 + socket.io-client 통합 테스트
    ├─ testing.ts            (수정) makeTestApp에 beforeReady 훅
    └─ main.ts               (수정) attachRealtime(app)
```

---

### Task 1: 실시간 상태 규칙 (`RealtimeHub`)

**Files:**

- Modify: `apps/server/package.json` (의존성), `package-lock.json`
- Create: `apps/server/src/realtime-hub.ts`
- Test: `apps/server/src/realtime-hub.test.ts`

**Interfaces:**

- Consumes: shared `SOCKET_LIMITS`, `ControlMove`, `ControlState`, `Emoji`, `EmoteEvent`, `Presence`
- Produces: `MAP_HALF = 25`, `class RealtimeHub`:
  - `constructor(now: () => number = Date.now)`
  - `connect(socketId: string, memberId: string | null): void` — `null` = 구경꾼
  - `disconnect(socketId): string | null` — 조종 중이던 소켓이면 풀린 memberId
  - `setMember(socketId, memberId | null): string | null` — 승인/강등 반영, 풀린 memberId
  - `memberOf(socketId): string | null`, `socketIds(): string[]`
  - `presence(): Presence` — 멤버 id 정렬, `controlling`
  - `startControl(socketId): boolean` — 멤버 소켓만, 같은 멤버의 이전 조종을 넘겨받는다(마지막 위치 유지)
  - `stopControl(socketId): string | null`
  - `move(socketId, m: ControlMove): boolean` — 조종권 소켓만, 1초 창에 `movePerSec`회, ±`MAP_HALF`로 자름
  - `emote(socketId, emoji: Emoji): EmoteEvent | null` — 멤버당 `1000 / emotePerSec` ms 간격
  - `flushStates(): ControlState[] | null` — 바뀐 게 없으면 `null`
  - `expireIdle(): string[]` — `controlIdleMs` 동안 입력 없던 멤버들

- [x] **Step 1: 브랜치 갱신**

Run: `git fetch origin && git checkout wj && git merge origin/main`

Expected: wj#2가 머지된 main과 합쳐진다

- [x] **Step 2: 의존성 설치**

```bash
npm install -w @4this/server socket.io@^4.8.4
npm install -w @4this/server -D socket.io-client@^4.8.4
```

Expected: 설치 성공

설치 후 `apps/server/package.json`:

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
    "@fastify/cookie": "^11.1.3",
    "@fastify/rate-limit": "^11.2.1",
    "bcryptjs": "^3.0.3",
    "better-sqlite3": "^13.0.3",
    "fastify": "^5.12.7",
    "nanoid": "^6.0.2",
    "socket.io": "^4.8.4",
    "tsx": "^4.23.15"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^9.6.0",
    "socket.io-client": "^4.8.4"
  }
}
```

- [x] **Step 3: 실패하는 테스트 작성**

`vi.useFakeTimers()` + `vi.setSystemTime()`으로 `Date.now`를 고정하고 `vi.advanceTimersByTime()`으로 시간을 움직인다. 허브는 기본 `now = Date.now`라 가짜 시계를 그대로 따른다.

`apps/server/src/realtime-hub.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SOCKET_LIMITS } from '@4this/shared';
import { RealtimeHub } from './realtime-hub';

const move = (x = 1, z = 2) => ({ x, z, facing: 0.5, moving: true });

describe('RealtimeHub', () => {
  let hub: RealtimeHub;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
    hub = new RealtimeHub(); // 기본 now = Date.now (가짜 타이머가 움직인다)
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('presence: 멤버는 탭이 여러 개여도 한 번, 나머지는 구경꾼 수', () => {
    hub.connect('s1', 'm1');
    hub.connect('s2', 'm1');
    hub.connect('s3', 'm2');
    hub.connect('g1', null);
    hub.connect('g2', null);
    expect(hub.presence()).toEqual({
      members: [
        { id: 'm1', controlling: false },
        { id: 'm2', controlling: false },
      ],
      spectators: 2,
    });
    hub.disconnect('s1');
    expect(hub.presence().members.map((m) => m.id)).toEqual(['m1', 'm2']);
    hub.disconnect('s2');
    expect(hub.presence().members.map((m) => m.id)).toEqual(['m2']);
  });

  it('구경꾼은 조종을 시작할 수 없다', () => {
    hub.connect('g1', null);
    expect(hub.startControl('g1')).toBe(false);
    expect(hub.move('g1', move())).toBe(false);
  });

  it('마지막으로 start한 탭이 조종권을 갖는다', () => {
    hub.connect('s1', 'm1');
    hub.connect('s2', 'm1');
    expect(hub.startControl('s1')).toBe(true);
    expect(hub.presence().members).toEqual([{ id: 'm1', controlling: true }]);
    expect(hub.startControl('s2')).toBe(true);
    expect(hub.move('s1', move())).toBe(false);
    expect(hub.move('s2', move())).toBe(true);
    // 조종권이 없는 탭이 끊겨도 조종은 유지된다
    expect(hub.disconnect('s1')).toBeNull();
    expect(hub.presence().members).toEqual([{ id: 'm1', controlling: true }]);
    // 조종 중인 탭이 끊기면 풀린다
    expect(hub.disconnect('s2')).toBe('m1');
  });

  it('control:stop은 조종권을 가진 소켓만 풀 수 있다', () => {
    hub.connect('s1', 'm1');
    hub.connect('s2', 'm1');
    hub.startControl('s2');
    expect(hub.stopControl('s1')).toBeNull();
    expect(hub.stopControl('s2')).toBe('m1');
    expect(hub.presence().members).toEqual([{ id: 'm1', controlling: false }]);
  });

  it('이동은 맵 범위 ±25로 자르고, 바뀐 것이 있을 때만 묶음을 낸다', () => {
    hub.connect('s1', 'm1');
    hub.startControl('s1');
    expect(hub.flushStates()).toBeNull();
    hub.move('s1', move(40, -99));
    expect(hub.flushStates()).toEqual([
      { memberId: 'm1', x: 25, z: -25, facing: 0.5, moving: true },
    ]);
    expect(hub.flushStates()).toBeNull();
  });

  it('숫자가 아닌 좌표는 버린다', () => {
    hub.connect('s1', 'm1');
    hub.startControl('s1');
    expect(hub.move('s1', { x: Number.NaN, z: 0, facing: 0, moving: false })).toBe(false);
  });

  it('이동은 소켓당 초당 15회까지, 1초가 지나면 다시 받는다', () => {
    hub.connect('s1', 'm1');
    hub.startControl('s1');
    const results = Array.from({ length: 20 }, () => hub.move('s1', move()));
    expect(results.filter(Boolean)).toHaveLength(SOCKET_LIMITS.movePerSec);
    vi.advanceTimersByTime(1000);
    expect(hub.move('s1', move())).toBe(true);
  });

  it('60초 동안 입력이 없으면 조종이 풀린다', () => {
    hub.connect('s1', 'm1');
    hub.startControl('s1');
    vi.advanceTimersByTime(30_000);
    hub.move('s1', move());
    vi.advanceTimersByTime(59_999);
    expect(hub.expireIdle()).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(hub.expireIdle()).toEqual(['m1']);
    expect(hub.presence().members).toEqual([{ id: 'm1', controlling: false }]);
    // 풀린 멤버는 묶음에서 빠진다
    expect(hub.flushStates()).toEqual([]);
  });

  it('이모지는 멤버당 초당 1회, 서버 시각을 붙인다', () => {
    hub.connect('s1', 'm1');
    hub.connect('s2', 'm1');
    hub.connect('g1', null);
    expect(hub.emote('g1', '👋')).toBeNull();
    expect(hub.emote('s1', '👋')).toEqual({ memberId: 'm1', emoji: '👋', at: Date.now() });
    // 다른 탭이어도 같은 멤버면 막힌다
    expect(hub.emote('s2', '❤️')).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(hub.emote('s2', '❤️')?.emoji).toBe('❤️');
  });

  it('승인 취소되면 구경꾼으로 바뀌고 조종이 풀린다', () => {
    hub.connect('s1', 'm1');
    hub.startControl('s1');
    expect(hub.setMember('s1', null)).toBe('m1');
    expect(hub.presence()).toEqual({ members: [], spectators: 1 });
    expect(hub.startControl('s1')).toBe(false);
  });
});
```

- [x] **Step 4: 실패 확인**

Run: `npm test -w @4this/server -- src/realtime-hub.test.ts`

Expected: FAIL — `Cannot find module './realtime-hub' imported from …`

- [x] **Step 5: 구현**

조종권은 `memberId → { socketId, lastInput, state }` 맵 하나로 표현한다. "마지막 탭이 갖는다"는 `startControl`이 덮어쓰는 것으로, "조종 소켓이 끊기면 해제"는 `releaseBySocket`으로 처리한다. 이동 제한은 소켓마다 1초 창을 둔다(창이 지나면 카운트를 0으로).

`apps/server/src/realtime-hub.ts`:

```ts
import {
  SOCKET_LIMITS,
  type ControlMove,
  type ControlState,
  type Emoji,
  type EmoteEvent,
  type Presence,
} from '@4this/shared';

/** 캠퍼스 범위 (Global Constraints: x·z ∈ [-25, 25]) */
export const MAP_HALF = 25;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Conn {
  /** 승인된 멤버면 id, 아니면 null(구경꾼) */
  memberId: string | null;
  /** control:move 횟수 제한용 1초 창 */
  moveWindowStart: number;
  moveCount: number;
}

interface Control {
  socketId: string;
  lastInput: number;
  state: ControlState | null;
}

/**
 * 접속자·조종권·횟수 제한 상태. 소켓을 모르는 순수 로직이라 now()만 바꿔 가며 테스트한다.
 * 모든 정보는 메모리에만 있다 (스펙 §8.3: 프로세스 1개).
 */
export class RealtimeHub {
  private conns = new Map<string, Conn>();
  /** memberId → 조종 정보. 멤버당 하나, 마지막으로 start한 소켓이 가진다 */
  private controls = new Map<string, Control>();
  private lastEmote = new Map<string, number>();
  private dirty = false;

  constructor(private readonly now: () => number = Date.now) {}

  connect(socketId: string, memberId: string | null): void {
    this.conns.set(socketId, { memberId, moveWindowStart: 0, moveCount: 0 });
  }

  /** 연결 끊김. 그 소켓이 조종 중이었으면 풀린 memberId */
  disconnect(socketId: string): string | null {
    const released = this.releaseBySocket(socketId);
    this.conns.delete(socketId);
    return released;
  }

  /** 세션이 바뀌었을 때(승인·승인 취소·삭제) 소켓의 사용자를 바꾼다. 풀린 조종이 있으면 memberId */
  setMember(socketId: string, memberId: string | null): string | null {
    const conn = this.conns.get(socketId);
    if (!conn || conn.memberId === memberId) return null;
    const released = this.releaseBySocket(socketId);
    conn.memberId = memberId;
    return released;
  }

  memberOf(socketId: string): string | null {
    return this.conns.get(socketId)?.memberId ?? null;
  }

  socketIds(): string[] {
    return [...this.conns.keys()];
  }

  presence(): Presence {
    const members = new Set<string>();
    let spectators = 0;
    for (const conn of this.conns.values()) {
      if (conn.memberId) members.add(conn.memberId);
      else spectators++;
    }
    return {
      members: [...members].sort().map((id) => ({ id, controlling: this.controls.has(id) })),
      spectators,
    };
  }

  /** 조종 시작. 승인 멤버 소켓만 된다. 같은 멤버의 다른 탭이 갖고 있었으면 넘겨받는다 */
  startControl(socketId: string): boolean {
    const memberId = this.memberOf(socketId);
    if (!memberId) return false;
    const prev = this.controls.get(memberId);
    this.controls.set(memberId, {
      socketId,
      lastInput: this.now(),
      state: prev?.state ?? null,
    });
    return true;
  }

  /** control:stop. 이 소켓이 조종권을 가졌으면 풀린 memberId */
  stopControl(socketId: string): string | null {
    return this.releaseBySocket(socketId);
  }

  /** 이동 입력. 조종권이 있는 소켓만, 초당 movePerSec회까지. 받아들였으면 true */
  move(socketId: string, m: ControlMove): boolean {
    const conn = this.conns.get(socketId);
    const memberId = conn?.memberId;
    if (!conn || !memberId) return false;
    const control = this.controls.get(memberId);
    if (!control || control.socketId !== socketId) return false;
    if (![m.x, m.z, m.facing].every(Number.isFinite)) return false;

    const t = this.now();
    if (t - conn.moveWindowStart >= 1000) {
      conn.moveWindowStart = t;
      conn.moveCount = 0;
    }
    if (conn.moveCount >= SOCKET_LIMITS.movePerSec) return false;
    conn.moveCount++;

    control.lastInput = t;
    control.state = {
      memberId,
      x: clamp(m.x, -MAP_HALF, MAP_HALF),
      z: clamp(m.z, -MAP_HALF, MAP_HALF),
      facing: m.facing,
      moving: m.moving,
    };
    this.dirty = true;
    return true;
  }

  /** 이모지. 승인 멤버만, 멤버당 초당 emotePerSec회. 보낼 이벤트 또는 null */
  emote(socketId: string, emoji: Emoji): EmoteEvent | null {
    const memberId = this.memberOf(socketId);
    if (!memberId) return null;
    const t = this.now();
    const last = this.lastEmote.get(memberId);
    if (last !== undefined && t - last < 1000 / SOCKET_LIMITS.emotePerSec) return null;
    this.lastEmote.set(memberId, t);
    return { memberId, emoji, at: t };
  }

  /** 10 Hz마다 부른다. 지난번 이후 바뀐 게 있으면 조종 중인 멤버 전체 위치, 없으면 null */
  flushStates(): ControlState[] | null {
    if (!this.dirty) return null;
    this.dirty = false;
    return [...this.controls.values()]
      .map((c) => c.state)
      .filter((s): s is ControlState => s !== null);
  }

  /** controlIdleMs 동안 입력이 없던 조종을 푼다. 풀린 memberId 목록 */
  expireIdle(): string[] {
    const t = this.now();
    const released: string[] = [];
    for (const [memberId, control] of this.controls) {
      if (t - control.lastInput >= SOCKET_LIMITS.controlIdleMs) {
        this.controls.delete(memberId);
        released.push(memberId);
      }
    }
    if (released.length > 0) this.dirty = true;
    return released;
  }

  private releaseBySocket(socketId: string): string | null {
    for (const [memberId, control] of this.controls) {
      if (control.socketId === socketId) {
        this.controls.delete(memberId);
        this.dirty = true;
        return memberId;
      }
    }
    return null;
  }
}
```

- [x] **Step 6: 통과 확인**

Run: `npm test -w @4this/server -- src/realtime-hub.test.ts`

Expected: PASS 10개

Run: `npm run typecheck -w @4this/server`

Expected: 타입 에러 0

- [x] **Step 7: 커밋**

```bash
git add apps/server/package.json apps/server/src/realtime-hub.ts apps/server/src/realtime-hub.test.ts package-lock.json
git commit -m "feat: 실시간 접속자·조종권·횟수 제한 규칙"
```

---

### Task 2: Socket.IO 연결 (`attachRealtime`)과 통합 테스트

**Files:**

- Create: `apps/server/src/realtime.ts`
- Modify: `apps/server/src/testing.ts` (`makeTestApp`에 `beforeReady`)
- Test: `apps/server/src/realtime.test.ts`

**Interfaces:**

- Consumes: `RealtimeHub` (Task 1), `resolveSession(db, token, now)`, `SESSION_COOKIE` (wj#1), `app.events` `'world:changed'` (wj#2가 냄), `app.parseCookie(header)`, `app.unsignCookie(value)` (@fastify/cookie), shared `ControlMoveSchema`, `EmoteRequestSchema`, `SOCKET_LIMITS`, `ClientToServerEvents`, `ServerToClientEvents`
- Produces:
  - `type WorldServer = Server<ClientToServerEvents, ServerToClientEvents>`
  - `interface RealtimeOptions { now?: () => number; tickMs?: number }`
  - `attachRealtime(app: FastifyInstance, opts?: RealtimeOptions): WorldServer` — **`app.ready()`/`listen()` 전에** 부른다(`preClose` 훅을 등록하므로). 앱을 닫으면 타이머·소켓·엔진을 정리한다
  - `testing.ts`: `makeTestApp(overrides?, beforeReady?: (app: FastifyInstance) => void)`

- [x] **Step 1: 테스트 도우미 수정**

`attachRealtime`은 `preClose` 훅을 등록하므로 `app.ready()` 전에 불려야 한다. `makeTestApp`에 그 자리를 만든다. 고친 뒤 파일 전체:

`apps/server/src/testing.ts`:

```ts
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { API, SessionSchema } from '@4this/shared';
import { buildApp } from './app';
import type { Config } from './config';
import { openDb, type Db } from './db';

/** 테스트 전용 설정 */
export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    port: 0,
    dbPath: ':memory:',
    adminPassword: 'admin-pass',
    sessionSecret: 'test-secret-test-secret-test-secret',
    webDist: null,
    production: false,
    trustProxy: false,
    ...overrides,
  };
}

export interface TestApp {
  app: FastifyInstance;
  db: Db;
  config: Config;
  close: () => Promise<void>;
}

/** 메모리 DB로 앱을 만든다. beforeReady에서 훅·플러그인을 더 붙일 수 있다 (예: attachRealtime) */
export async function makeTestApp(
  overrides: Partial<Config> = {},
  beforeReady?: (app: FastifyInstance) => void,
): Promise<TestApp> {
  const config = testConfig(overrides);
  const db = openDb(':memory:');
  const app = buildApp({ config, db });
  beforeReady?.(app);
  await app.ready();
  return {
    app,
    db,
    config,
    close: async () => {
      await app.close();
      db.close();
    },
  };
}

/** 응답의 Set-Cookie에서 sid를 꺼내 다음 요청의 cookie 헤더로 쓴다 */
export function sidCookie(res: LightMyRequestResponse): string {
  const cookie = res.cookies.find((c) => c.name === 'sid');
  if (!cookie) throw new Error('sid 쿠키가 없습니다');
  return `sid=${cookie.value}`;
}

export interface TestMember {
  id: string;
  cookie: string;
}

/** 가입하고 { id, cookie }를 돌려준다. approve면 DB에서 바로 승인한다 */
export async function signupAs(
  t: TestApp,
  username: string,
  { password = 'secret1', approve = false } = {},
): Promise<TestMember> {
  const res = await t.app.inject({
    method: 'POST',
    url: API.signup,
    payload: { username, password },
  });
  const session = SessionSchema.parse(res.json());
  if (session.kind !== 'member') throw new Error('가입 실패');
  if (approve)
    t.db.prepare("UPDATE members SET status = 'approved' WHERE id = ?").run(session.me.id);
  return { id: session.me.id, cookie: sidCookie(res) };
}

/** 관리자 로그인 쿠키 */
export async function adminCookie(t: TestApp): Promise<string> {
  const res = await t.app.inject({
    method: 'POST',
    url: API.adminLogin,
    payload: { password: t.config.adminPassword },
  });
  return sidCookie(res);
}

/** world:changed가 몇 번 났는지 센다 */
export function countWorldChanged(t: TestApp): () => number {
  let count = 0;
  t.app.events.on('world:changed', () => count++);
  return () => count;
}
```

- [x] **Step 2: 실패하는 통합 테스트 작성**

테스트마다 앱을 포트 0에 띄우고 `transports: ['websocket']`, `extraHeaders: { cookie }`로 접속한다. 서버 시계 `clock`은 테스트가 직접 올린다(60초를 기다리지 않는다). 타이머 주기는 20 ms로 줄인다. 같은 1초 안에 보낸 이동은 시계를 움직이지 않으므로 정확히 15개만 받아들여진다.

`apps/server/src/realtime.test.ts`:

```ts
import type { AddressInfo } from 'node:net';
import { io as connectClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  API,
  type ClientToServerEvents,
  type ControlState,
  type EmoteEvent,
  type Presence,
  type ServerToClientEvents,
} from '@4this/shared';
import { attachRealtime } from './realtime';
import { adminCookie, makeTestApp, signupAs, type TestApp } from './testing';

type Client = ClientSocket<ServerToClientEvents, ClientToServerEvents>;

/** 받은 이벤트를 모두 적어 두는 테스트 클라이언트 */
interface Recorder {
  socket: Client;
  times: number[];
  presence: Presence[];
  states: ControlState[][];
  released: string[];
  emotes: EmoteEvent[];
  worldChanged: number;
}

async function waitFor(check: () => boolean, ms = 2000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('시간 초과');
    await new Promise((r) => setTimeout(r, 10));
  }
}

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));
const last = <T>(list: T[]): T | undefined => list[list.length - 1];

describe('실시간 (Socket.IO 통합)', () => {
  let t: TestApp;
  let url: string;
  let clock: number;
  const clients: Client[] = [];

  beforeEach(async () => {
    clock = Date.now();
    t = await makeTestApp({}, (app) => {
      attachRealtime(app, { now: () => clock, tickMs: 20 });
    });
    await t.app.listen({ port: 0, host: '127.0.0.1' });
    url = `http://127.0.0.1:${(t.app.server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    for (const c of clients.splice(0)) c.disconnect();
    await t.close();
  });

  async function connect(cookie?: string): Promise<Recorder> {
    const socket: Client = connectClient(url, {
      transports: ['websocket'],
      extraHeaders: cookie ? { cookie } : {},
      forceNew: true,
    });
    clients.push(socket);
    const rec: Recorder = {
      socket,
      times: [],
      presence: [],
      states: [],
      released: [],
      emotes: [],
      worldChanged: 0,
    };
    socket.on('time', (p) => rec.times.push(p.serverTime));
    socket.on('presence', (p) => rec.presence.push(p));
    socket.on('control:state', (s) => rec.states.push(s));
    socket.on('control:released', (p) => rec.released.push(p.memberId));
    socket.on('emote', (e) => rec.emotes.push(e));
    socket.on('world:changed', () => rec.worldChanged++);
    await waitFor(() => rec.presence.length > 0 && rec.times.length > 0);
    return rec;
  }

  it('접속하면 서버 시각과 접속자를 받는다. 멤버는 탭 수와 상관없이 한 번', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    const pending = await signupAs(t, '대기');
    const guest = await connect();
    expect(guest.times).toEqual([clock]);

    await connect(a.cookie);
    await connect(a.cookie);
    await connect(pending.cookie);
    await waitFor(() => last(guest.presence)?.spectators === 2);
    expect(last(guest.presence)).toEqual({
      members: [{ id: a.id, controlling: false }],
      spectators: 2,
    });
  });

  it('마지막으로 control:start한 탭만 움직일 수 있고, 모두가 10 Hz 묶음을 받는다', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    const guest = await connect();
    const tab1 = await connect(a.cookie);
    const tab2 = await connect(a.cookie);

    tab1.socket.emit('control:start');
    tab2.socket.emit('control:start');
    await waitFor(() => last(guest.presence)?.members[0]?.controlling === true);

    tab1.socket.emit('control:move', { x: 5, z: 5, facing: 0, moving: true });
    tab2.socket.emit('control:move', { x: 1, z: 2, facing: 1.5, moving: true });
    await waitFor(() => guest.states.length > 0);
    expect(last(guest.states)).toEqual([{ memberId: a.id, x: 1, z: 2, facing: 1.5, moving: true }]);

    // 조종 중인 탭이 끊기면 풀린다
    tab2.socket.disconnect();
    await waitFor(() => guest.released.includes(a.id));
    await waitFor(() => last(guest.presence)?.members[0]?.controlling === false);
  });

  it('구경꾼과 승인 대기 멤버는 조종할 수 없다', async () => {
    const pending = await signupAs(t, '대기');
    const watcher = await connect();
    const p = await connect(pending.cookie);
    p.socket.emit('control:start');
    p.socket.emit('control:move', { x: 1, z: 1, facing: 0, moving: true });
    await pause(100);
    expect(watcher.states).toEqual([]);
  });

  it('이동은 초당 15회만 받고 맵 범위 ±25로 자른다', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    const guest = await connect();
    const me = await connect(a.cookie);
    me.socket.emit('control:start');
    for (let i = 0; i < 30; i++) {
      me.socket.emit('control:move', { x: i, z: 0, facing: 0, moving: true });
    }
    await pause(150);
    // 같은 1초 안이라 0~14만 받아들여진다
    expect(last(guest.states)?.[0]?.x).toBe(14);

    clock += 1000;
    me.socket.emit('control:move', { x: 100, z: -100, facing: 0, moving: false });
    await waitFor(() => last(guest.states)?.[0]?.x === 25);
    expect(last(guest.states)?.[0]).toMatchObject({ x: 25, z: -25, moving: false });
  });

  it('60초 무입력이면 control:released', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    const guest = await connect();
    const me = await connect(a.cookie);
    me.socket.emit('control:start');
    me.socket.emit('control:move', { x: 1, z: 1, facing: 0, moving: true });
    await waitFor(() => guest.states.length > 0);

    clock += 59_000;
    await pause(80);
    expect(guest.released).toEqual([]);
    clock += 1_000;
    await waitFor(() => guest.released.includes(a.id));
    await waitFor(() => last(guest.presence)?.members[0]?.controlling === false);
  });

  it('control:stop으로 해제한다', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    const guest = await connect();
    const me = await connect(a.cookie);
    me.socket.emit('control:start');
    await waitFor(() => last(guest.presence)?.members[0]?.controlling === true);
    me.socket.emit('control:stop');
    await waitFor(() => guest.released.includes(a.id));
  });

  it('이모지는 멤버당 초당 1회, 모두에게 서버 시각과 함께 간다', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    const guest = await connect();
    const me = await connect(a.cookie);
    me.socket.emit('emote', { emoji: '👋' });
    me.socket.emit('emote', { emoji: '❤️' });
    me.socket.emit('emote', { emoji: '🎉' });
    await waitFor(() => guest.emotes.length > 0);
    await pause(100);
    expect(guest.emotes).toEqual([{ memberId: a.id, emoji: '👋', at: clock }]);
    expect(me.emotes).toHaveLength(1);

    clock += 1000;
    me.socket.emit('emote', { emoji: '☕' });
    await waitFor(() => guest.emotes.length === 2);
    // 정해진 8종이 아니면 버린다
    clock += 1000;
    me.socket.emit('emote', { emoji: '💩' } as never);
    await pause(100);
    expect(guest.emotes).toHaveLength(2);
  });

  it('구경꾼의 이모지는 버린다', async () => {
    const guest = await connect();
    guest.socket.emit('emote', { emoji: '👋' });
    await pause(100);
    expect(guest.emotes).toEqual([]);
  });

  it('승인되면 world:changed를 모두가 받고, 그 소켓은 멤버가 된다', async () => {
    const pending = await signupAs(t, '대기');
    const guest = await connect();
    const p = await connect(pending.cookie);
    await waitFor(() => last(guest.presence)?.spectators === 2);

    const admin = await adminCookie(t);
    await t.app.inject({
      method: 'POST',
      url: API.adminApprove(pending.id),
      headers: { cookie: admin },
    });
    await waitFor(() => guest.worldChanged === 1 && p.worldChanged === 1);
    await waitFor(() => last(guest.presence)?.members.length === 1);
    expect(last(guest.presence)).toEqual({
      members: [{ id: pending.id, controlling: false }],
      spectators: 1,
    });
  });

  it('승인 취소·삭제된 멤버 소켓은 구경꾼으로 강등되고 조종이 풀린다', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    const guest = await connect();
    const me = await connect(a.cookie);
    me.socket.emit('control:start');
    await waitFor(() => last(guest.presence)?.members[0]?.controlling === true);

    const admin = await adminCookie(t);
    await t.app.inject({ method: 'POST', url: API.adminReject(a.id), headers: { cookie: admin } });
    await waitFor(() => guest.released.includes(a.id));
    await waitFor(() => last(guest.presence)?.spectators === 2);
    expect(last(guest.presence)?.members).toEqual([]);

    // 강등된 소켓은 더 이상 조종을 시작할 수 없다
    me.socket.emit('control:start');
    await pause(80);
    expect(last(guest.presence)?.members).toEqual([]);
  });

  it('시간표가 바뀌면 world:changed', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    const guest = await connect();
    await t.app.inject({
      method: 'PUT',
      url: API.mySchedules,
      headers: { cookie: a.cookie },
      payload: { items: [{ day: 0, start: '09:00', end: '10:00', kind: 'lecture1' }] },
    });
    await waitFor(() => guest.worldChanged === 1);
  });
});
```

- [x] **Step 3: 실패 확인**

Run: `npm test -w @4this/server -- src/realtime.test.ts`

Expected: FAIL — `Cannot find module './realtime' imported from …`

- [x] **Step 4: 구현**

포인트:

- 쿠키는 `socket.handshake.headers.cookie`를 `app.parseCookie`로 읽고 `app.unsignCookie`로 서명을 확인한다. 소켓마다 토큰을 기억해 두었다가 `world:changed` 때 `resolveSession`을 다시 부른다 — 승인되면 멤버로 올라가고, 거절·삭제·로그아웃이면 구경꾼으로 내려간다.
- `presence`는 직렬화해서 지난번과 다를 때만 전체에 보낸다. 같은 멤버의 두 번째 탭처럼 바뀐 게 없으면 새 소켓에만 보낸다.
- 정리는 `preClose`에서 한다: 타이머 해제 → 이벤트 구독 해제 → 소켓 끊기 → 엔진 닫기. (`io.close()`는 http 서버까지 닫아서 Fastify의 close와 겹치므로 쓰지 않는다.)

`apps/server/src/realtime.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { Server, type Socket } from 'socket.io';
import {
  ControlMoveSchema,
  EmoteRequestSchema,
  SOCKET_LIMITS,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@4this/shared';
import { resolveSession, SESSION_COOKIE } from './auth/session';
import { RealtimeHub } from './realtime-hub';

export type WorldServer = Server<ClientToServerEvents, ServerToClientEvents>;
type WorldSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export interface RealtimeOptions {
  /** 서버 시각. 테스트에서 바꿔 끼운다 */
  now?: () => number;
  /** control:state 묶음·무입력 검사 주기 (기본 1000 / stateHz = 100ms) */
  tickMs?: number;
}

/**
 * Socket.IO를 Fastify의 http 서버에 붙인다. app.listen() 전에 부른다.
 * 같은 출처라 CORS 설정은 없다. 경로는 기본값 /socket.io.
 */
export function attachRealtime(app: FastifyInstance, opts: RealtimeOptions = {}): WorldServer {
  const now = opts.now ?? Date.now;
  const tickMs = opts.tickMs ?? 1000 / SOCKET_LIMITS.stateHz;
  const hub = new RealtimeHub(now);
  const io: WorldServer = new Server(app.server, { serveClient: false });
  /** 소켓 id → 세션 토큰 (world:changed 때 다시 확인한다) */
  const tokens = new Map<string, string | null>();

  /** 쿠키 sid → 세션 토큰 */
  const tokenOf = (socket: WorldSocket): string | null => {
    const header = socket.handshake.headers.cookie;
    if (!header) return null;
    const raw = app.parseCookie(header)[SESSION_COOKIE];
    if (!raw) return null;
    const unsigned = app.unsignCookie(raw);
    return unsigned.valid ? unsigned.value : null;
  };

  /** 승인된 멤버면 id, 아니면 null(구경꾼) */
  const approvedMemberId = (token: string | null): string | null => {
    const auth = resolveSession(app.db, token, now());
    return auth.kind === 'member' && auth.member.status === 'approved' ? auth.member.id : null;
  };

  /** 접속자가 지난번과 달라졌을 때만 모두에게 보낸다. 보냈으면 true */
  let lastPresence = '';
  const sendPresence = (): boolean => {
    const presence = hub.presence();
    const key = JSON.stringify(presence);
    if (key === lastPresence) return false;
    lastPresence = key;
    io.emit('presence', presence);
    return true;
  };

  const released = (memberId: string | null) => {
    if (memberId) io.emit('control:released', { memberId });
  };

  io.on('connection', (socket) => {
    const token = tokenOf(socket);
    tokens.set(socket.id, token);
    hub.connect(socket.id, approvedMemberId(token));
    socket.emit('time', { serverTime: now() });
    // 변동이 없어도(예: 같은 멤버의 두 번째 탭) 새로 들어온 소켓은 지금 접속자를 받아야 한다
    if (!sendPresence()) socket.emit('presence', hub.presence());

    socket.on('control:start', () => {
      if (hub.startControl(socket.id)) sendPresence();
    });

    socket.on('control:stop', () => {
      const memberId = hub.stopControl(socket.id);
      released(memberId);
      if (memberId) sendPresence();
    });

    socket.on('control:move', (payload) => {
      const parsed = ControlMoveSchema.safeParse(payload);
      if (parsed.success) hub.move(socket.id, parsed.data);
    });

    socket.on('emote', (payload) => {
      const parsed = EmoteRequestSchema.safeParse(payload);
      if (!parsed.success) return;
      const event = hub.emote(socket.id, parsed.data.emoji);
      if (event) io.emit('emote', event);
    });

    socket.on('disconnect', () => {
      tokens.delete(socket.id);
      released(hub.disconnect(socket.id));
      sendPresence();
    });
  });

  // 10 Hz: 바뀐 위치 묶음 전송 + 60초 무입력 해제
  const timer = setInterval(() => {
    const idle = hub.expireIdle();
    for (const memberId of idle) released(memberId);
    if (idle.length > 0) sendPresence();
    const states = hub.flushStates();
    if (states) io.emit('control:state', states);
  }, tickMs);

  // 시간표·생김새·승인이 바뀌면 모두에게 알리고, 소켓마다 승인 상태를 다시 확인한다
  const onWorldChanged = () => {
    for (const socketId of hub.socketIds()) {
      released(hub.setMember(socketId, approvedMemberId(tokens.get(socketId) ?? null)));
    }
    sendPresence();
    io.emit('world:changed');
  };
  app.events.on('world:changed', onWorldChanged);

  app.addHook('preClose', async () => {
    clearInterval(timer);
    app.events.off('world:changed', onWorldChanged);
    io.disconnectSockets(true);
    io.engine.close();
  });

  return io;
}
```

- [x] **Step 5: 통과 확인**

Run: `npm test -w @4this/server -- src/realtime.test.ts`

Expected: PASS 11개 (2~3초)

Run: `npm test -w @4this/server`

Expected: PASS 123개

- [x] **Step 6: 커밋**

```bash
git add apps/server/src
git commit -m "feat: Socket.IO presence·조종·이모지·world:changed"
```

---

### Task 3: 서버에 연결, 실제 확인, 전체 검사와 PR

**Files:**

- Modify: `apps/server/src/main.ts`

**Interfaces:**

- Consumes: `attachRealtime(app)` (Task 2)
- Produces: `npm run dev`(웹 :5173 → `/socket.io` 프록시 → 서버 :8080)에서 소켓이 붙는 서버. `[wj#3] Socket.IO` PR — cw#4(실시간 클라이언트)가 기다린다

- [x] **Step 1: 진입점 수정**

`buildApp` 바로 다음, `listen` 전에 붙인다. 고친 뒤 파일 전체:

`apps/server/src/main.ts`:

```ts
import { buildApp } from './app';
import { loadConfig } from './config';
import { openDb } from './db';
import { attachRealtime } from './realtime';

const config = loadConfig();
if (config.sessionSecret.length < 32) {
  console.warn('SESSION_SECRET은 32자 이상을 권장합니다.');
}
const db = openDb(config.dbPath);
const app = buildApp({ config, db });
attachRealtime(app);

let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  console.log(`${signal} 받음, 서버를 닫습니다`);
  try {
    await app.close();
  } finally {
    db.close();
  }
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ port: config.port, host: '0.0.0.0' });
console.log(`4thIS-world server on :${config.port} (db: ${config.dbPath})`);
```

- [x] **Step 2: 타입 검사**

Run: `npm run typecheck -w @4this/server`

Expected: 타입 에러 0

- [x] **Step 3: 실제 서버에 붙어 보기**

```bash
cd apps/server
ADMIN_PASSWORD=admin-pass SESSION_SECRET=dev-secret-dev-secret-dev-secret-00 npx tsx src/main.ts
```

Expected: `4thIS-world server on :8080`

다른 터미널에서 `apps/server` 폴더에 임시 스크립트를 만들어 실행한다(끝나면 지운다):

`apps/server/probe.mjs` (임시, 커밋하지 않는다):

```js
import { io } from 'socket.io-client';

const socket = io('http://localhost:8080');
socket.on('time', (p) => console.log('time', p));
socket.on('presence', (p) => {
  console.log('presence', JSON.stringify(p));
  socket.disconnect();
});
```

Run: `cd apps/server && node probe.mjs && rm probe.mjs`

Expected: `time { serverTime: … }` 다음 `presence {"members":[],"spectators":1}`

- [x] **Step 4: 전체 검사**

Run: `npm run format && npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`

Expected: 모두 통과 (shared 23개, server 123개, web 5개)

Run: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`

- [x] **Step 5: push와 PR**

```bash
git push origin wj
gh pr create --base main --head wj --title "[wj#3] Socket.IO" --body-file .github/pull_request_template.md
```

PR 본문에 적을 것 (cw#4가 클라이언트를 붙일 때 필요):

- 접속하면 `time`과 `presence`를 바로 받는다. 승인 멤버가 아니면 `control:*`·`emote`는 조용히 무시된다(오류 이벤트 없음).
- `control:state`는 조종 중인 **모든** 멤버의 마지막 위치 배열이다. 배열에서 빠진 멤버는 `control:released`도 같이 온다.
- 이동은 초당 15회까지, 이모지는 멤버당 초당 1회. 넘친 것은 버린다.
- 승인·거절·삭제·시간표 변경 시 `world:changed` → `GET /api/world` 다시 받기.

cw를 리뷰어로 지정한다. 머지는 **Create a merge commit**.

- [ ] **Step 6: 머지 후 알림**

단톡방: "wj#3 머지됨 — Socket.IO 서버 사용 가능 (`io({ withCredentials: true })`). cw#4 시작 가능".

---

## Self-Review

- 스펙 §8.3 표: `presence`(변동 시, 멤버 1회·구경꾼 수·controlling), `world:changed`, `control:start`·`stop`(승인 본인만), `control:move`(15회·범위 자름), `control:state`(10 Hz 묶음), `control:released`(60초·해제·끊김), `emote`(멤버당 초당 1회), `time`(접속 시) — 모두 Task 1·2. ✔
- "조종권은 멤버당 하나, 마지막 `control:start` 소켓" — 허브 테스트 `마지막으로 start한 탭이 조종권을 갖는다` + 통합 테스트. ✔
- "접속자 정보는 메모리에만" — `RealtimeHub` 인스턴스 상태뿐, DB에 쓰지 않는다. ✔
- 스펙 §11 실시간: presence 집계, 마지막 탭 조종권, 60초 해제, 이모지·이동 횟수 제한, `world:changed` — 통합 테스트 11개가 각각 덮는다. 시간 의존은 fake timers(허브)와 주입 시계(통합). ✔
- 승인 취소/삭제 강등: 허브 `setMember` + 통합 테스트 `승인 취소·삭제된 멤버 소켓은 구경꾼으로 강등되고 조종이 풀린다`. ✔
- 계약: 이벤트 이름·페이로드는 shared `ServerToClientEvents`/`ClientToServerEvents` 타입으로 서버(`Server<…>`)와 테스트 클라이언트(`Socket<…>`) 모두 타입 검사된다.
- 플레이스홀더 없음. 테스트 개수는 실제 실행 결과다.
