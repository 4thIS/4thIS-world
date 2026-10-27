# [wj#1] 서버 뼈대와 인증 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**담당:** 이우진 · 브랜치 `wj` · 웨이브 1 · **선행:** cw#1

**Goal:** cw#1의 최소 Fastify 서버를 설정·SQLite·세션 쿠키·가입·로그인·로그아웃·관리자 로그인·시도 제한까지 갖춘 서버 뼈대로 키운다.

**Architecture:** `buildApp({ config, db })`가 쿠키·시도 제한 플러그인을 붙이고, `/api` 라우트 묶음에 `onRequest` 훅을 달아 쿠키 `sid` → `sessions` → `request.auth`(guest/member/admin)를 채운다. DB는 better-sqlite3 동기 API, 마이그레이션은 `PRAGMA user_version`으로 센다. 테스트는 `:memory:` DB + `app.inject()`로 listen 없이 돈다.

**Tech Stack:** Node 24 · TypeScript ~5.9.3 · Fastify ^5.12.7 · @fastify/cookie ^11.1.3 · @fastify/rate-limit ^11.2.1 · better-sqlite3 ^13.0.3 (+ @types/better-sqlite3 ^9.6.0) · bcryptjs ^3.0.3 · nanoid ^6.0.2 · zod ^4.6.7(shared) · vitest ^5.0.5 · tsx ^4.23.15

**설계 문서:** `docs/superpowers/specs/2026-10-21-4this-world-design.md` §8.1(데이터), §8.2(인증 줄), §8.4(보안·운영), §11(서버 REST 테스트)

**계약 기준:** `docs/superpowers/plans/2026-10-21-cw1-foundation.md` — `API`, `SessionSchema`, `MeSchema`, `SignupRequestSchema`, `LoginRequestSchema`, `AdminLoginRequestSchema`, `ApiErrorSchema`, `ERROR_CODES`, `randomLook()`

## Global Constraints

개요(`2026-10-21-00-overview.md`)의 공통 규칙:

- Node `>=24`, npm workspaces, `package-lock.json` 커밋. TypeScript는 `~5.9.3` 고정.
- 모든 패키지는 ESM. `@4this/shared`는 빌드하지 않고 TS 소스를 바로 import한다.
- 공용 타입·스키마·경로·이벤트는 **`@4this/shared`에서만** 가져온다. 같은 타입을 다른 곳에 다시 정의하지 않는다.
- 시각은 KST, `packages/shared/src/time.ts`만 쓴다.
- 코드 스타일: Prettier(작은따옴표, 세미콜론, 100자). 주석과 사용자 문구는 한국어.
- 커밋: `feat:`/`fix:`/`chore:`/`test:`/`docs:` + 한국어 설명. PR 제목: `[wj#1] 서버 뼈대와 인증`.
- 남의 소유 파일(스펙 §12.2, `.github/CODEOWNERS`)은 고치지 않는다. wj 소유: `apps/server/**`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `docs/deploy.md`.

이 PR 고유 제약 (팀 공통 결정 그대로):

- 환경변수: `PORT`(기본 8080), `DB_PATH`(기본 `./data/world.db`, 폴더 자동 생성), `ADMIN_PASSWORD`(필수), `SESSION_SECRET`(필수, 32자 이상 권장), `WEB_DIST`(wj#4에서 사용), `NODE_ENV`(`production`이면 쿠키 `secure`). 추가로 `TRUST_PROXY`(선택, `1`이면 프록시 헤더로 IP 판단 — wj#4 nginx용).
- `ADMIN_PASSWORD`·`SESSION_SECRET`이 없으면 서버가 시작하지 않는다(스펙 §8.4). 메시지는 한국어.
- 세션 쿠키 이름 `sid`, httpOnly, sameSite=lax, 30일, `SESSION_SECRET`으로 서명. 값은 서버가 만든 무작위 토큰(32바이트 base64url)이고 `sessions` 테이블에 저장한다.
- 앱 시그니처: `buildApp(opts: { config: Config; db: Db }): FastifyInstance` (`Db` = better-sqlite3 `Database`). `app.events`(Node `EventEmitter`)를 데코레이트한다. wj#2가 `world:changed`를 내고 wj#3가 받는다.
- 오류 응답은 모두 shared `ApiErrorSchema` 모양 `{ error, message, detail? }`. 요청 검증은 shared zod 스키마로 `safeParse`(fastify 타입 프로바이더는 쓰지 않는다). 검증 실패 = 400 `invalid`, `detail`에 zod 이슈 배열.
- 비밀번호는 bcryptjs cost 10. 로그인·관리자 로그인은 IP당 분당 5회(`@fastify/rate-limit` 라우트 옵션), 넘으면 429 `rate_limited`.
- REST 경로는 shared `API` 상수만 쓴다. 웹 클라이언트(`apps/web/src/api/endpoints.ts`)가 기대하는 응답: signup·login·admin → `Session`, logout → `{ ok: true }`.

## File Structure

```
apps/server/
├─ package.json                 의존성 추가 (better-sqlite3, @fastify/cookie, @fastify/rate-limit, bcryptjs, nanoid)
└─ src/
    ├─ config.ts                환경변수 → Config, 필수 값 검사
    ├─ db.ts                    openDb(path): WAL·외래키·마이그레이션(user_version)
    ├─ errors.ts                HttpError, parse(schema, value), ApiErrorSchema 모양 오류 처리기
    ├─ members.ts               members 테이블 읽기/쓰기, MemberRow → Me
    ├─ auth/password.ts         bcrypt 해시·비교, 시간 일정 문자열 비교
    ├─ auth/session.ts          세션 토큰 생성·조회·쿠키, Auth 타입, requireMember/requireAdmin
    ├─ routes/auth.ts           /api/auth/* (session, signup, login, logout, admin)
    ├─ app.ts                   buildApp({ config, db }) — 플러그인·세션 훅·라우트 등록
    ├─ main.ts                  loadConfig → openDb → buildApp → listen, SIGTERM/SIGINT 정리
    ├─ testing.ts               테스트 도우미 (메모리 DB 앱, sid 쿠키 꺼내기)
    └─ *.test.ts                config · db · app · auth/session · routes/auth
```

책임 나누기: DB 접근은 `members.ts`(나중에 `schedules.ts`)에만, 쿠키·세션은 `auth/session.ts`에만 둔다. 라우트 파일은 검증 → 저장소 함수 호출 → 응답만 한다.

---

### Task 1: 의존성과 설정 (`config.ts`)

**Files:**

- Modify: `apps/server/package.json` (의존성), `package-lock.json`
- Create: `apps/server/src/config.ts`
- Test: `apps/server/src/config.test.ts`

**Interfaces:**

- Consumes: 없음 (cw#1의 `apps/server` 패키지)
- Produces:
  - `interface Config { port: number; dbPath: string; adminPassword: string; sessionSecret: string; webDist: string | null; production: boolean; trustProxy: boolean }`
  - `loadConfig(env?: Record<string, string | undefined>): Config` — 기본 인자 `process.env`. `ADMIN_PASSWORD`·`SESSION_SECRET`이 없거나 공백이면 `Error('<KEY> 환경변수가 필요합니다. .env.example을 참고해 설정하세요.')`, `PORT`가 0~65535 정수가 아니면 `Error('PORT 값이 올바르지 않습니다: …')`

- [x] **Step 1: 브랜치를 최신 main에 맞춘다**

Run: `git fetch origin && git checkout wj && git merge origin/main`

Expected: cw#1이 들어온 상태 (`apps/server/src/app.ts`에 `buildApp()`과 health 라우트)

- [x] **Step 2: 서버 의존성 설치**

```bash
npm install -w @4this/server better-sqlite3@^13.0.3 @fastify/cookie@^11.1.3 @fastify/rate-limit@^11.2.1 bcryptjs@^3.0.3 nanoid@^6.0.2
npm install -w @4this/server -D @types/better-sqlite3@^9.6.0
```

Expected: 설치 성공. better-sqlite3 13은 주요 플랫폼 바이너리(prebuilds)를 패키지에 담아 와서 컴파일하지 않는다.

설치 후 `apps/server/package.json`이 이렇게 되어야 한다:

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
    "tsx": "^4.23.15"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^9.6.0"
  }
}
```

개발 중 생기는 DB 폴더(`apps/server/data/`)와 `*.db`는 루트 `.gitignore`(`data/`, `*.db`, `*.db-*`)가 이미 막는다.

- [x] **Step 3: 실패하는 테스트 작성**

`apps/server/src/config.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

const base = { ADMIN_PASSWORD: 'admin-pass', SESSION_SECRET: 'x'.repeat(32) };

describe('loadConfig', () => {
  it('필수 값만 있으면 기본값을 채운다', () => {
    expect(loadConfig(base)).toEqual({
      port: 8080,
      dbPath: './data/world.db',
      adminPassword: 'admin-pass',
      sessionSecret: 'x'.repeat(32),
      webDist: null,
      production: false,
      trustProxy: false,
    });
  });

  it('ADMIN_PASSWORD가 없으면 시작하지 않는다', () => {
    expect(() => loadConfig({ SESSION_SECRET: 's' })).toThrow(
      'ADMIN_PASSWORD 환경변수가 필요합니다',
    );
  });

  it('SESSION_SECRET이 없거나 빈 값이면 시작하지 않는다', () => {
    expect(() => loadConfig({ ADMIN_PASSWORD: 'a' })).toThrow(
      'SESSION_SECRET 환경변수가 필요합니다',
    );
    expect(() => loadConfig({ ADMIN_PASSWORD: 'a', SESSION_SECRET: '  ' })).toThrow(
      'SESSION_SECRET 환경변수가 필요합니다',
    );
  });

  it('나머지 값을 읽는다', () => {
    const config = loadConfig({
      ...base,
      PORT: '9000',
      DB_PATH: '/data/world.db',
      WEB_DIST: '/app/apps/web/dist',
      NODE_ENV: 'production',
      TRUST_PROXY: '1',
    });
    expect(config).toMatchObject({
      port: 9000,
      dbPath: '/data/world.db',
      webDist: '/app/apps/web/dist',
      production: true,
      trustProxy: true,
    });
  });

  it('PORT가 숫자가 아니면 실패한다', () => {
    expect(() => loadConfig({ ...base, PORT: 'abc' })).toThrow('PORT 값이 올바르지 않습니다');
  });
});
```

- [x] **Step 4: 실패 확인**

Run: `npm test -w @4this/server -- src/config.test.ts`

Expected: FAIL — `Cannot find module './config' imported from …`

- [x] **Step 5: 구현**

`apps/server/src/config.ts`:

```ts
/** 서버 설정. 모든 값은 환경변수에서 읽는다 (팀 공통 결정 참고) */
export interface Config {
  port: number;
  /** SQLite 파일 경로. ':memory:'면 메모리 DB */
  dbPath: string;
  adminPassword: string;
  sessionSecret: string;
  /** 웹 빌드 폴더. null이면 정적 서빙을 하지 않는다 (wj#4) */
  webDist: string | null;
  /** NODE_ENV=production이면 쿠키에 secure를 붙인다 */
  production: boolean;
  /** 리버스 프록시 뒤에서 X-Forwarded-For로 IP를 읽을지 (TRUST_PROXY=1) */
  trustProxy: boolean;
}

type Env = Record<string, string | undefined>;

function required(env: Env, key: string): string {
  const value = env[key]?.trim();
  if (!value) {
    throw new Error(`${key} 환경변수가 필요합니다. .env.example을 참고해 설정하세요.`);
  }
  return value;
}

export function loadConfig(env: Env = process.env): Config {
  const adminPassword = required(env, 'ADMIN_PASSWORD');
  const sessionSecret = required(env, 'SESSION_SECRET');
  const port = Number(env.PORT ?? 8080);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`PORT 값이 올바르지 않습니다: ${env.PORT}`);
  }
  return {
    port,
    dbPath: env.DB_PATH?.trim() || './data/world.db',
    adminPassword,
    sessionSecret,
    webDist: env.WEB_DIST?.trim() || null,
    production: env.NODE_ENV === 'production',
    trustProxy: env.TRUST_PROXY === '1' || env.TRUST_PROXY === 'true',
  };
}
```

- [x] **Step 6: 통과 확인**

Run: `npm test -w @4this/server -- src/config.test.ts`

Expected: PASS 5개

Run: `npm run typecheck -w @4this/server`

Expected: 타입 에러 0

- [x] **Step 7: 커밋**

```bash
git add apps/server/package.json apps/server/src/config.ts apps/server/src/config.test.ts package-lock.json
git commit -m "feat: 서버 설정 로드와 필수 환경변수 검사"
```

---

### Task 2: SQLite 연결과 마이그레이션 (`db.ts`)

**Files:**

- Create: `apps/server/src/db.ts`
- Test: `apps/server/src/db.test.ts`

**Interfaces:**

- Consumes: 없음
- Produces:
  - `type Db = Database.Database` (better-sqlite3)
  - `MIGRATIONS: readonly string[]` — 0번이 스펙 §8.1의 4개 테이블. 다음 PR은 **뒤에 붙이기만** 한다
  - `migrate(db: Db): void`, `openDb(path: string): Db` — `':memory:'`면 폴더를 만들지 않는다. WAL, `foreign_keys = ON`, `busy_timeout = 5000`
  - 테이블: `members(id, username UNIQUE COLLATE NOCASE, password_hash, status CHECK, look JSON, created_at)`, `schedules(id, member_id → members ON DELETE CASCADE, day, "start", "end", kind, title)`, `sessions(id, member_id → members ON DELETE CASCADE, is_admin, expires_at)`, `settings(key, value)`

- [x] **Step 1: 실패하는 테스트 작성**

`apps/server/src/db.test.ts`:

```ts
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MIGRATIONS, openDb } from './db';

describe('openDb', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('메모리 DB에 스펙 §8.1 테이블을 만든다', () => {
    const db = openDb(':memory:');
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .pluck()
      .all();
    expect(tables).toEqual(['members', 'schedules', 'sessions', 'settings']);
    expect(db.pragma('user_version', { simple: true })).toBe(MIGRATIONS.length);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    db.close();
  });

  it('파일 DB는 폴더를 만들고 WAL로 연다. 다시 열어도 마이그레이션이 두 번 돌지 않는다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'world-db-'));
    dirs.push(dir);
    const path = join(dir, 'nested', 'world.db');
    const db = openDb(path);
    expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
    db.prepare("INSERT INTO members VALUES ('m1', '철수', 'h', 'pending', '{}', 1)").run();
    db.close();

    const again = openDb(path);
    expect(again.prepare('SELECT count(*) FROM members').pluck().get()).toBe(1);
    again.close();
  });

  it('멤버를 지우면 시간표와 세션도 지워진다', () => {
    const db = openDb(':memory:');
    db.prepare("INSERT INTO members VALUES ('m1', '철수', 'h', 'approved', '{}', 1)").run();
    db.prepare(
      "INSERT INTO schedules VALUES ('s1', 'm1', 0, '09:00', '10:00', 'lecture1', NULL)",
    ).run();
    db.prepare("INSERT INTO sessions VALUES ('t1', 'm1', 0, 99)").run();
    db.prepare("DELETE FROM members WHERE id = 'm1'").run();
    expect(db.prepare('SELECT count(*) FROM schedules').pluck().get()).toBe(0);
    expect(db.prepare('SELECT count(*) FROM sessions').pluck().get()).toBe(0);
    db.close();
  });

  it('아이디는 대소문자를 가리지 않고 중복을 막는다', () => {
    const db = openDb(':memory:');
    db.prepare("INSERT INTO members VALUES ('m1', 'Kim', 'h', 'pending', '{}', 1)").run();
    expect(() =>
      db.prepare("INSERT INTO members VALUES ('m2', 'kim', 'h', 'pending', '{}', 1)").run(),
    ).toThrow(/UNIQUE/);
    db.close();
  });
});
```

- [x] **Step 2: 실패 확인**

Run: `npm test -w @4this/server -- src/db.test.ts`

Expected: FAIL — `Cannot find module './db' imported from …`

- [x] **Step 3: 구현**

`start`·`end`는 SQL 키워드와 헷갈리지 않게 큰따옴표로 감싼다. 아이디는 `COLLATE NOCASE`라서 `Kim`과 `kim`을 같은 아이디로 본다. 세션·시간표는 멤버를 지우면 같이 지워진다(탈퇴·관리자 삭제가 단순해진다).

`apps/server/src/db.ts`:

```ts
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

export type Db = Database.Database;

/**
 * 마이그레이션 목록. 순서대로 한 번씩만 실행하고, 실행한 개수를 PRAGMA user_version에 적는다.
 * 이미 머지된 항목은 고치지 말고 새 항목을 뒤에 붙인다.
 */
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE members (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    look          TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  );
  CREATE TABLE schedules (
    id        TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    day       INTEGER NOT NULL,
    "start"   TEXT NOT NULL,
    "end"     TEXT NOT NULL,
    kind      TEXT NOT NULL,
    title     TEXT
  );
  CREATE INDEX schedules_member ON schedules(member_id);
  CREATE TABLE sessions (
    id         TEXT PRIMARY KEY,
    member_id  TEXT REFERENCES members(id) ON DELETE CASCADE,
    is_admin   INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX sessions_member ON sessions(member_id);
  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
];

export function migrate(db: Db): void {
  const current = db.pragma('user_version', { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]!);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}

/** DB를 열고 마이그레이션까지 끝낸다. ':memory:'는 테스트용 메모리 DB */
export function openDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  return db;
}
```

- [x] **Step 4: 통과 확인**

Run: `npm test -w @4this/server -- src/db.test.ts`

Expected: PASS 4개

- [x] **Step 5: 커밋**

```bash
git add apps/server/src/db.ts apps/server/src/db.test.ts
git commit -m "feat: SQLite 연결과 스키마 마이그레이션"
```

---

### Task 3: 오류 형식·세션 미들웨어·`buildApp({ config, db })`

**Files:**

- Create: `apps/server/src/errors.ts`, `apps/server/src/members.ts`, `apps/server/src/auth/session.ts`, `apps/server/src/routes/auth.ts`(세션 조회만), `apps/server/src/testing.ts`
- Modify: `apps/server/src/app.ts` (전체 교체), `apps/server/src/app.test.ts` (전체 교체), `apps/server/src/main.ts` (전체 교체)
- Test: `apps/server/src/app.test.ts`, `apps/server/src/auth/session.test.ts`

**Interfaces:**

- Consumes: `Config`, `loadConfig` (Task 1), `Db`, `openDb` (Task 2), shared `API`, `ApiErrorBody`, `ApiErrorCode`, `Session`, `Me`, `Look`, `LookSchema`, `MemberStatus`
- Produces:
  - `errors.ts`: `class HttpError(statusCode: number, code: ApiErrorCode, message: string, detail?: unknown)`, `unauthorized(message?)` 401, `forbidden(message?)` 403, `notFound(message?)` 404, `parse<S extends z.ZodType>(schema: S, value: unknown): z.infer<S>` (실패 시 400 `invalid` + `detail` = zod issues), `registerErrorHandlers(app)` — HttpError·429(`rate_limited`)·기타 4xx(`invalid`)·5xx·404(`not_found`)를 `ApiErrorSchema` 모양으로
  - `members.ts`: `interface MemberRow { id; username; password_hash; status: MemberStatus; look: string(JSON); created_at }`, `getMember(db, id)`, `getMemberByUsername(db, username)`, `insertMember(db, { id, username, passwordHash, look, createdAt }): MemberRow`(status `pending`), `parseLook(row): Look`, `toMe(row): Me`, `isUniqueViolation(error): boolean`
  - `auth/session.ts`: `SESSION_COOKIE = 'sid'`, `SESSION_TTL_MS`(30일), `type Auth = { kind: 'guest' } | { kind: 'member'; sessionId; member: MemberRow } | { kind: 'admin'; sessionId }`, `GUEST`, `createSession(db, { memberId } | { admin: true }, now?): string`, `deleteSession(db, id)`, `resolveSession(db, token: string | null, now?): Auth` (만료 줄 삭제), `readSessionToken(request): string | null`, `setSessionCookie(reply, token, config)`, `clearSessionCookie(reply)`, `toSession(auth): Session`, `requireMember(request): MemberRow` (401), `requireAdmin(request): void` (guest 401 / member 403)
  - `app.ts`: `buildApp({ config, db }: AppOptions): FastifyInstance`, `type ServerEvents = { 'world:changed': [] }`, Fastify 타입 확장 `app.config`, `app.db`, `app.events: EventEmitter<ServerEvents>`, `request.auth: Auth`
  - `testing.ts`: `testConfig(overrides?)`, `makeTestApp(overrides?): Promise<TestApp>` (`{ app, db, config, close }`), `sidCookie(res): string` (`'sid=<값>'`)
  - `main.ts`: `loadConfig()` → `openDb(config.dbPath)` → `buildApp({ config, db })` → `listen`. SIGTERM·SIGINT를 받으면 `app.close()` → `db.close()` → 종료 코드 0 (wj#4의 `docker stop`이 이것을 쓴다)

- [x] **Step 1: 실패하는 테스트 작성**

`buildApp`이 이제 `{ config, db }`를 받는다. cw#1의 `app.test.ts`를 바꾼다:

`apps/server/src/app.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API, ApiErrorSchema } from '@4this/shared';
import { makeTestApp, type TestApp } from './testing';

describe('buildApp', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(() => t.close());

  it('health 응답', async () => {
    const res = await t.app.inject({ method: 'GET', url: API.health });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('없는 경로는 ApiErrorSchema 모양의 404', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
    expect(ApiErrorSchema.parse(res.json()).error).toBe('not_found');
  });

  it('events 이미터가 붙어 있다', () => {
    let called = 0;
    t.app.events.on('world:changed', () => called++);
    t.app.events.emit('world:changed');
    expect(called).toBe(1);
  });
});
```

세션 미들웨어 테스트. 토큰은 `app.signCookie()`로 서명해서 보낸다:

`apps/server/src/auth/session.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API, randomLook } from '@4this/shared';
import { insertMember } from '../members';
import { makeTestApp, type TestApp } from '../testing';
import { createSession, SESSION_TTL_MS } from './session';

describe('세션 미들웨어', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(() => t.close());

  /** 서명한 sid 쿠키로 GET /api/auth/session */
  const sessionWith = async (token?: string) => {
    const headers = token ? { cookie: `sid=${t.app.signCookie(token)}` } : {};
    const res = await t.app.inject({ method: 'GET', url: API.session, headers });
    return res.json();
  };

  it('쿠키가 없으면 guest', async () => {
    expect(await sessionWith()).toEqual({ kind: 'guest' });
  });

  it('서명이 틀린 쿠키는 guest', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: API.session,
      headers: { cookie: 'sid=forged.value' },
    });
    expect(res.json()).toEqual({ kind: 'guest' });
  });

  it('관리자 세션', async () => {
    expect(await sessionWith(createSession(t.db, { admin: true }))).toEqual({ kind: 'admin' });
  });

  it('멤버 세션은 Me를 담는다', async () => {
    const look = randomLook();
    insertMember(t.db, { id: 'm1', username: '철수', passwordHash: 'x', look, createdAt: 1 });
    expect(await sessionWith(createSession(t.db, { memberId: 'm1' }))).toEqual({
      kind: 'member',
      me: { id: 'm1', username: '철수', status: 'pending', look },
    });
  });

  it('만료된 세션은 guest이고 줄을 지운다', async () => {
    const now = Date.now();
    const token = createSession(t.db, { admin: true }, now - SESSION_TTL_MS - 1);
    expect(await sessionWith(token)).toEqual({ kind: 'guest' });
    expect(t.db.prepare('SELECT count(*) FROM sessions').pluck().get()).toBe(0);
  });
});
```

- [x] **Step 2: 실패 확인**

Run: `npm test -w @4this/server -- src/app.test.ts src/auth/session.test.ts`

Expected: FAIL — `Cannot find module './testing' imported from …`

- [x] **Step 3: 오류 헬퍼 구현**

모든 오류는 `ApiErrorSchema`(`{ error, message, detail? }`) 모양이다. Fastify가 내는 오류(깨진 JSON 400, 시도 제한 429)도 여기서 바꾼다. `ERROR_CODES`에 서버 오류용 코드가 없어서 500은 `invalid` + "서버 오류" 문구로 보낸다(최종 보고의 계약 제안 참고).

`apps/server/src/errors.ts`:

```ts
import type { FastifyError, FastifyInstance } from 'fastify';
import type { z } from 'zod';
import type { ApiErrorBody, ApiErrorCode } from '@4this/shared';

/** 라우트에서 throw하면 ApiErrorSchema 모양으로 응답한다 */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const unauthorized = (message = '로그인이 필요합니다') =>
  new HttpError(401, 'unauthorized', message);
export const forbidden = (message = '권한이 없습니다') => new HttpError(403, 'forbidden', message);
export const notFound = (message = '찾을 수 없습니다') => new HttpError(404, 'not_found', message);

/** shared zod 스키마로 검사한다. 실패하면 400 invalid, detail에 zod 이슈 목록 */
export function parse<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, 'invalid', '입력값이 올바르지 않습니다', result.error.issues);
  }
  return result.data;
}

function body(code: ApiErrorCode, message: string, detail?: unknown): ApiErrorBody {
  return detail === undefined ? { error: code, message } : { error: code, message, detail };
}

/** 모든 오류와 404를 ApiErrorSchema 모양으로 바꾼다 */
export function registerErrorHandlers(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | HttpError, request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send(body(error.code, error.message, error.detail));
    }
    const status = error.statusCode ?? 500;
    if (status === 429) {
      return reply.status(429).send(body('rate_limited', '잠시 후 다시 시도하세요'));
    }
    if (status >= 400 && status < 500) {
      return reply.status(status).send(body('invalid', error.message));
    }
    request.log.error(error);
    return reply.status(500).send(body('invalid', '서버 오류가 발생했습니다'));
  });
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(body('not_found', `${request.method} ${request.url} 경로가 없습니다`));
  });
}
```

- [x] **Step 4: 멤버 저장소 구현**

`apps/server/src/members.ts`:

```ts
import { LookSchema, type Look, type Me, type MemberStatus } from '@4this/shared';
import type { Db } from './db';

/** members 테이블 한 줄 */
export interface MemberRow {
  id: string;
  username: string;
  password_hash: string;
  status: MemberStatus;
  look: string;
  created_at: number;
}

export function getMember(db: Db, id: string): MemberRow | undefined {
  return db.prepare('SELECT * FROM members WHERE id = ?').get(id) as MemberRow | undefined;
}

export function getMemberByUsername(db: Db, username: string): MemberRow | undefined {
  return db.prepare('SELECT * FROM members WHERE username = ?').get(username) as
    MemberRow | undefined;
}

export function insertMember(
  db: Db,
  m: { id: string; username: string; passwordHash: string; look: Look; createdAt: number },
): MemberRow {
  db.prepare(
    `INSERT INTO members (id, username, password_hash, status, look, created_at)
     VALUES (?, ?, ?, 'pending', ?, ?)`,
  ).run(m.id, m.username, m.passwordHash, JSON.stringify(m.look), m.createdAt);
  return getMember(db, m.id)!;
}

export function parseLook(row: MemberRow): Look {
  return LookSchema.parse(JSON.parse(row.look));
}

export function toMe(row: MemberRow): Me {
  return { id: row.id, username: row.username, status: row.status, look: parseLook(row) };
}

/** SQLite UNIQUE 제약 위반인지 (아이디 중복 경쟁 상태 대비) */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as { code: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}
```

- [x] **Step 5: 세션 구현**

쿠키 값은 `@fastify/cookie`가 `SESSION_SECRET`으로 서명한다(`signed: true`). 서명이 틀리면 `readSessionToken`이 `null`을 돌려서 guest가 된다. 거절(`rejected`)·대기(`pending`) 멤버도 `member`로 보고, 승인 여부는 각 라우트가 `member.status`로 판단한다.

`apps/server/src/auth/session.ts`:

```ts
import { randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Session } from '@4this/shared';
import type { Config } from '../config';
import type { Db } from '../db';
import { forbidden, unauthorized } from '../errors';
import { getMember, toMe, type MemberRow } from '../members';

export const SESSION_COOKIE = 'sid';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** 요청을 보낸 사람 */
export type Auth =
  | { kind: 'guest' }
  | { kind: 'member'; sessionId: string; member: MemberRow }
  | { kind: 'admin'; sessionId: string };

export const GUEST: Auth = { kind: 'guest' };

interface SessionRow {
  id: string;
  member_id: string | null;
  is_admin: number;
  expires_at: number;
}

/** 무작위 토큰을 만들어 sessions에 저장하고 돌려준다 */
export function createSession(
  db: Db,
  owner: { memberId: string } | { admin: true },
  now = Date.now(),
): string {
  const id = randomBytes(32).toString('base64url');
  const memberId = 'memberId' in owner ? owner.memberId : null;
  db.prepare('INSERT INTO sessions (id, member_id, is_admin, expires_at) VALUES (?, ?, ?, ?)').run(
    id,
    memberId,
    memberId === null ? 1 : 0,
    now + SESSION_TTL_MS,
  );
  return id;
}

export function deleteSession(db: Db, id: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

/** 세션 토큰 → 사용자. 만료됐거나 없으면 guest (만료된 줄은 지운다) */
export function resolveSession(db: Db, id: string | null, now = Date.now()): Auth {
  if (!id) return GUEST;
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRow | undefined;
  if (!row) return GUEST;
  if (row.expires_at <= now) {
    deleteSession(db, id);
    return GUEST;
  }
  if (row.is_admin) return { kind: 'admin', sessionId: row.id };
  const member = row.member_id ? getMember(db, row.member_id) : undefined;
  return member ? { kind: 'member', sessionId: row.id, member } : GUEST;
}

/** 서명된 sid 쿠키 값 → 세션 토큰. 위조됐으면 null */
export function readSessionToken(request: FastifyRequest): string | null {
  const raw = request.cookies[SESSION_COOKIE];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  return unsigned.valid ? unsigned.value : null;
}

export function setSessionCookie(reply: FastifyReply, token: string, config: Config): void {
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.production,
    signed: true,
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function toSession(auth: Auth): Session {
  if (auth.kind === 'member') return { kind: 'member', me: toMe(auth.member) };
  if (auth.kind === 'admin') return { kind: 'admin' };
  return { kind: 'guest' };
}

/** 로그인한 멤버만 (상태 무관: 승인 대기·거절도 자기 정보는 본다) */
export function requireMember(request: FastifyRequest): MemberRow {
  if (request.auth.kind !== 'member') throw unauthorized();
  return request.auth.member;
}

/** 관리자만 */
export function requireAdmin(request: FastifyRequest): void {
  if (request.auth.kind === 'guest') throw unauthorized('관리자 로그인이 필요합니다');
  if (request.auth.kind !== 'admin') throw forbidden('관리자만 할 수 있습니다');
}
```

- [x] **Step 6: 앱 조립**

`decorateRequest`는 Fastify 5에서 객체 기본값을 받지 않으므로 이름만 등록하고 훅에서 채운다. 세션 훅과 라우트는 `app.register(async (api) => …)` 안에 둔다. 다음 Task에서 채울 인증 라우트 파일은 세션 조회만 먼저 만든다:

`apps/server/src/routes/auth.ts`:

```ts
import type { FastifyInstance } from 'fastify';
import { API } from '@4this/shared';
import { toSession } from '../auth/session';

/** 인증 라우트. 다음 Task에서 가입·로그인·로그아웃·관리자 로그인을 더한다 */
export function registerAuthRoutes(app: FastifyInstance): void {
  app.get(API.session, async (request) => toSession(request.auth));
}
```

`apps/server/src/app.ts` — 전체 교체:

```ts
import { EventEmitter } from 'node:events';
import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { API } from '@4this/shared';
import { readSessionToken, resolveSession, type Auth } from './auth/session';
import type { Config } from './config';
import type { Db } from './db';
import { registerErrorHandlers } from './errors';
import { registerAuthRoutes } from './routes/auth';

/** 서버 안에서 주고받는 이벤트. wj#3의 소켓 계층이 world:changed를 받아 브로드캐스트한다 */
export type ServerEvents = { 'world:changed': [] };

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    db: Db;
    events: EventEmitter<ServerEvents>;
  }
  interface FastifyRequest {
    auth: Auth;
  }
}

export interface AppOptions {
  config: Config;
  db: Db;
}

/** 서버 앱을 만든다. 테스트는 listen 없이 app.inject()로 부른다 */
export function buildApp({ config, db }: AppOptions): FastifyInstance {
  const app = Fastify({ logger: false, trustProxy: config.trustProxy });
  app.decorate('config', config);
  app.decorate('db', db);
  app.decorate('events', new EventEmitter<ServerEvents>());
  // 객체는 기본값으로 못 넣는다(Fastify 5). 자리만 잡고 onRequest 훅에서 채운다
  app.decorateRequest('auth');

  registerErrorHandlers(app);
  app.register(fastifyCookie, { secret: config.sessionSecret });
  app.register(fastifyRateLimit, { global: false });

  app.register(async (api) => {
    // 쿠키 sid → sessions → member/admin. 없거나 만료면 guest
    api.addHook('onRequest', async (request) => {
      request.auth = resolveSession(db, readSessionToken(request));
    });
    api.get(API.health, async () => ({ ok: true }));
    registerAuthRoutes(api);
  });

  return app;
}
```

`apps/server/src/testing.ts`:

```ts
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
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

/** 메모리 DB로 앱을 만든다 */
export async function makeTestApp(overrides: Partial<Config> = {}): Promise<TestApp> {
  const config = testConfig(overrides);
  const db = openDb(':memory:');
  const app = buildApp({ config, db });
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
```

- [x] **Step 7: 진입점을 새 시그니처에 맞춘다**

`buildApp`이 설정·DB를 받으므로 `main.ts`도 바꾼다. 종료 신호를 받으면 요청을 마무리하고 DB를 닫는다:

`apps/server/src/main.ts` — 전체 교체:

```ts
import { buildApp } from './app';
import { loadConfig } from './config';
import { openDb } from './db';

const config = loadConfig();
if (config.sessionSecret.length < 32) {
  console.warn('SESSION_SECRET은 32자 이상을 권장합니다.');
}
const db = openDb(config.dbPath);
const app = buildApp({ config, db });

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

- [x] **Step 8: 통과 확인**

Run: `npm test -w @4this/server`

Expected: PASS 17개 (config 5, db 4, app 3, auth/session 5)

Run: `npm run typecheck -w @4this/server`

Expected: 타입 에러 0

- [x] **Step 9: 커밋**

```bash
git add apps/server/src
git commit -m "feat: 오류 형식, 세션 미들웨어, buildApp(config, db)"
```

---

### Task 4: 가입·로그인·로그아웃·관리자 로그인·시도 제한

**Files:**

- Create: `apps/server/src/auth/password.ts`, `apps/server/src/routes/auth.test.ts`
- Modify: `apps/server/src/routes/auth.ts` (전체 교체), `apps/server/src/app.test.ts` (깨진 JSON 테스트 추가)

**Interfaces:**

- Consumes: Task 3 전부, shared `SignupRequestSchema`, `LoginRequestSchema`, `AdminLoginRequestSchema`, `randomLook()`
- Produces (REST, 경로는 shared `API`):
  - `GET API.session` → `Session`
  - `POST API.signup` `{ username, password }` → 200 `Session`(member, status `pending`, 생김새 `randomLook()`), 쿠키 발급. 아이디 중복(대소문자 무시) 409 `username_taken`, 형식 오류 400 `invalid`
  - `POST API.login` `{ username, password }` → 200 `Session`. 틀리면 401 `unauthorized`. 거절된 멤버도 로그인되고 `me.status`가 `rejected`
  - `POST API.logout` → `{ ok: true }`, 세션 줄 삭제 + 쿠키 지움
  - `POST API.adminLogin` `{ password }` → 200 `{ kind: 'admin' }`. 틀리면 401 `unauthorized`
  - login·adminLogin: IP당 분당 5회, 6번째부터 429 `rate_limited`
  - `auth/password.ts`: `hashPassword(pw): Promise<string>`(bcrypt cost 10), `verifyPassword(pw, hash): Promise<boolean>`, `burnPasswordCheck(pw): Promise<void>`(없는 아이디도 같은 시간), `safeEqual(a, b): boolean`(sha256 후 `timingSafeEqual`)

- [x] **Step 1: 실패하는 테스트 작성**

`apps/server/src/routes/auth.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API, ApiErrorSchema, LookSchema, SessionSchema } from '@4this/shared';
import { makeTestApp, sidCookie, type TestApp } from '../testing';

describe('인증 라우트', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(() => t.close());

  const signup = (username = '철수', password = 'secret1') =>
    t.app.inject({ method: 'POST', url: API.signup, payload: { username, password } });
  const login = (username: string, password: string) =>
    t.app.inject({ method: 'POST', url: API.login, payload: { username, password } });
  const session = (cookie?: string) =>
    t.app.inject({ method: 'GET', url: API.session, headers: cookie ? { cookie } : {} });
  const errorCode = (res: { json: () => unknown }) => ApiErrorSchema.parse(res.json()).error;

  it('쿠키가 없으면 guest', async () => {
    const res = await session();
    expect(res.json()).toEqual({ kind: 'guest' });
  });

  it('가입하면 pending 멤버로 바로 로그인된다', async () => {
    const res = await signup();
    expect(res.statusCode).toBe(200);
    const body = SessionSchema.parse(res.json());
    expect(body.kind).toBe('member');
    if (body.kind !== 'member') return;
    expect(body.me.username).toBe('철수');
    expect(body.me.status).toBe('pending');
    expect(LookSchema.safeParse(body.me.look).success).toBe(true);

    const cookie = res.cookies.find((c) => c.name === 'sid')!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');
    expect(cookie.maxAge).toBe(30 * 24 * 60 * 60);

    const again = await session(sidCookie(res));
    expect(again.json()).toEqual(body);
    // 비밀번호는 bcrypt 해시로만 저장한다
    const hash = t.db.prepare('SELECT password_hash FROM members').pluck().get() as string;
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('잘못된 입력은 400 invalid + zod 이슈', async () => {
    const res = await signup('철', '123');
    expect(res.statusCode).toBe(400);
    const body = ApiErrorSchema.parse(res.json());
    expect(body.error).toBe('invalid');
    expect(Array.isArray(body.detail)).toBe(true);
  });

  it('같은 아이디(대소문자 무시)로 가입하면 409 username_taken', async () => {
    await signup('Kim');
    const res = await signup('kim');
    expect(res.statusCode).toBe(409);
    expect(errorCode(res)).toBe('username_taken');
  });

  it('로그인 성공/실패', async () => {
    await signup('철수', 'secret1');
    const ok = await login('철수', 'secret1');
    expect(ok.statusCode).toBe(200);
    expect(SessionSchema.parse(ok.json()).kind).toBe('member');
    expect((await session(sidCookie(ok))).json().kind).toBe('member');

    const wrong = await login('철수', 'nope!!');
    expect(wrong.statusCode).toBe(401);
    expect(errorCode(wrong)).toBe('unauthorized');

    const missing = await login('영희', 'secret1');
    expect(missing.statusCode).toBe(401);
    expect(errorCode(missing)).toBe('unauthorized');
  });

  it('거절된 멤버도 로그인은 되고 상태가 보인다', async () => {
    await signup('철수', 'secret1');
    t.db.prepare("UPDATE members SET status = 'rejected'").run();
    const res = await login('철수', 'secret1');
    const body = SessionSchema.parse(res.json());
    expect(body.kind === 'member' && body.me.status).toBe('rejected');
  });

  it('로그아웃하면 세션이 사라진다', async () => {
    const cookie = sidCookie(await signup());
    const res = await t.app.inject({ method: 'POST', url: API.logout, headers: { cookie } });
    expect(res.json()).toEqual({ ok: true });
    expect(t.db.prepare('SELECT count(*) FROM sessions').pluck().get()).toBe(0);
    expect((await session(cookie)).json()).toEqual({ kind: 'guest' });
  });

  it('위조한 쿠키나 만료된 세션은 guest', async () => {
    const cookie = sidCookie(await signup());
    expect((await session('sid=forged.value')).json()).toEqual({ kind: 'guest' });
    t.db.prepare('UPDATE sessions SET expires_at = 0').run();
    expect((await session(cookie)).json()).toEqual({ kind: 'guest' });
    expect(t.db.prepare('SELECT count(*) FROM sessions').pluck().get()).toBe(0);
  });

  it('관리자 로그인', async () => {
    const wrong = await t.app.inject({
      method: 'POST',
      url: API.adminLogin,
      payload: { password: 'nope' },
    });
    expect(wrong.statusCode).toBe(401);
    expect(errorCode(wrong)).toBe('unauthorized');

    const ok = await t.app.inject({
      method: 'POST',
      url: API.adminLogin,
      payload: { password: 'admin-pass' },
    });
    expect(ok.json()).toEqual({ kind: 'admin' });
    expect((await session(sidCookie(ok))).json()).toEqual({ kind: 'admin' });
  });

  it('로그인은 IP당 분당 5회까지, 6번째는 429 rate_limited', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await login('철수', 'secret1')).statusCode).toBe(401);
    }
    const res = await login('철수', 'secret1');
    expect(res.statusCode).toBe(429);
    expect(errorCode(res)).toBe('rate_limited');
  });

  it('관리자 로그인도 IP당 분당 5회', async () => {
    const tryAdmin = () =>
      t.app.inject({ method: 'POST', url: API.adminLogin, payload: { password: 'x' } });
    for (let i = 0; i < 5; i++) expect((await tryAdmin()).statusCode).toBe(401);
    expect((await tryAdmin()).statusCode).toBe(429);
  });

  it('프로덕션에서는 쿠키에 Secure가 붙는다', async () => {
    const prod = await makeTestApp({ production: true });
    const res = await prod.app.inject({
      method: 'POST',
      url: API.signup,
      payload: { username: '철수', password: 'secret1' },
    });
    expect(res.cookies.find((c) => c.name === 'sid')!.secure).toBe(true);
    await prod.close();
  });
});
```

`app.test.ts`에 깨진 JSON 테스트를 넣는다(로그인 라우트가 있어야 404가 아니라 400이 된다). 고친 뒤 파일 전체:

`apps/server/src/app.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API, ApiErrorSchema } from '@4this/shared';
import { makeTestApp, type TestApp } from './testing';

describe('buildApp', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(() => t.close());

  it('health 응답', async () => {
    const res = await t.app.inject({ method: 'GET', url: API.health });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('없는 경로는 ApiErrorSchema 모양의 404', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
    expect(ApiErrorSchema.parse(res.json()).error).toBe('not_found');
  });

  it('JSON이 깨지면 400 invalid', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: API.login,
      headers: { 'content-type': 'application/json' },
      payload: '{oops',
    });
    expect(res.statusCode).toBe(400);
    expect(ApiErrorSchema.parse(res.json()).error).toBe('invalid');
  });

  it('events 이미터가 붙어 있다', () => {
    let called = 0;
    t.app.events.on('world:changed', () => called++);
    t.app.events.emit('world:changed');
    expect(called).toBe(1);
  });
});
```

- [x] **Step 2: 실패 확인**

Run: `npm test -w @4this/server -- src/routes/auth.test.ts src/app.test.ts`

Expected: FAIL — 가입·로그인 테스트가 `expected 404 to be 200`, 깨진 JSON 테스트가 `expected 404 to be 400`

- [x] **Step 3: 비밀번호 도우미 구현**

`apps/server/src/auth/password.ts`:

```ts
import { createHash, timingSafeEqual } from 'node:crypto';
import { compare, hash } from 'bcryptjs';

const COST = 10;

export function hashPassword(password: string): Promise<string> {
  return hash(password, COST);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

/** 없는 아이디로 로그인할 때도 같은 시간이 걸리도록 비교할 가짜 해시 */
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hash('dummy-password', COST);
  await compare(password, await dummyHash);
}

/** 길이와 상관없이 일정한 시간에 두 문자열을 비교한다 (ADMIN_PASSWORD) */
export function safeEqual(a: string, b: string): boolean {
  const da = createHash('sha256').update(a).digest();
  const db = createHash('sha256').update(b).digest();
  return timingSafeEqual(da, db);
}
```

- [x] **Step 4: 인증 라우트 구현**

시도 제한은 `@fastify/rate-limit`을 `global: false`로 붙여 두었으므로(Task 3 `app.ts`) 라우트 옵션 `config.rateLimit`으로 켠다. 제한에 걸리면 플러그인이 429 오류를 던지고, `registerErrorHandlers`가 `rate_limited`로 바꾼다. 로그인한 상태에서 다시 가입·로그인하면 이전 세션 줄을 지운다.

`apps/server/src/routes/auth.ts` — 전체 교체:

```ts
import { nanoid } from 'nanoid';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  AdminLoginRequestSchema,
  API,
  LoginRequestSchema,
  randomLook,
  SignupRequestSchema,
} from '@4this/shared';
import { burnPasswordCheck, hashPassword, safeEqual, verifyPassword } from '../auth/password';
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  setSessionCookie,
  toSession,
} from '../auth/session';
import { HttpError, parse } from '../errors';
import { getMemberByUsername, insertMember, isUniqueViolation } from '../members';

/** 로그인·관리자 로그인: IP당 분당 5회 */
const LOGIN_LIMIT = { rateLimit: { max: 5, timeWindow: '1 minute' } };

const usernameTaken = () => new HttpError(409, 'username_taken', '이미 있는 아이디입니다');
const wrongLogin = () => new HttpError(401, 'unauthorized', '아이디 또는 비밀번호가 틀렸습니다');

export function registerAuthRoutes(app: FastifyInstance): void {
  const { db, config } = app;

  /** 이미 로그인돼 있으면 그 세션을 지운다 (계정 전환·로그아웃) */
  const dropCurrent = (request: FastifyRequest) => {
    if (request.auth.kind !== 'guest') deleteSession(db, request.auth.sessionId);
  };

  app.get(API.session, async (request) => toSession(request.auth));

  app.post(API.signup, async (request, reply) => {
    const { username, password } = parse(SignupRequestSchema, request.body);
    if (getMemberByUsername(db, username)) throw usernameTaken();
    const passwordHash = await hashPassword(password);
    let member;
    try {
      member = insertMember(db, {
        id: nanoid(),
        username,
        passwordHash,
        look: randomLook(),
        createdAt: Date.now(),
      });
    } catch (error) {
      // 해시를 만드는 사이에 같은 아이디가 먼저 들어온 경우
      if (isUniqueViolation(error)) throw usernameTaken();
      throw error;
    }
    dropCurrent(request);
    const sessionId = createSession(db, { memberId: member.id });
    setSessionCookie(reply, sessionId, config);
    return toSession({ kind: 'member', sessionId, member });
  });

  app.post(API.login, { config: LOGIN_LIMIT }, async (request, reply) => {
    const { username, password } = parse(LoginRequestSchema, request.body);
    const member = getMemberByUsername(db, username);
    if (!member) {
      await burnPasswordCheck(password);
      throw wrongLogin();
    }
    if (!(await verifyPassword(password, member.password_hash))) throw wrongLogin();
    dropCurrent(request);
    const sessionId = createSession(db, { memberId: member.id });
    setSessionCookie(reply, sessionId, config);
    return toSession({ kind: 'member', sessionId, member });
  });

  app.post(API.logout, async (request, reply) => {
    dropCurrent(request);
    clearSessionCookie(reply);
    return { ok: true as const };
  });

  app.post(API.adminLogin, { config: LOGIN_LIMIT }, async (request, reply) => {
    const { password } = parse(AdminLoginRequestSchema, request.body);
    if (!safeEqual(password, config.adminPassword)) {
      throw new HttpError(401, 'unauthorized', '관리자 비밀번호가 틀렸습니다');
    }
    dropCurrent(request);
    const sessionId = createSession(db, { admin: true });
    setSessionCookie(reply, sessionId, config);
    return toSession({ kind: 'admin', sessionId });
  });
}
```

- [x] **Step 5: 통과 확인**

Run: `npm test -w @4this/server`

Expected: PASS 30개 (config 5, db 4, app 4, auth/session 5, routes/auth 12)

- [x] **Step 6: 커밋**

```bash
git add apps/server/src
git commit -m "feat: 가입·로그인·로그아웃·관리자 로그인과 시도 제한"
```

---

### Task 5: 실제 실행 확인, 전체 검사와 PR

**Files:**

- 없음 (실행 확인·검사·push·PR)

**Interfaces:**

- Consumes: Task 1~4
- Produces: `[wj#1] 서버 뼈대와 인증` PR. th#2(가입·로그인 화면)와 wj#2가 이 PR을 기다린다

- [x] **Step 1: 필수 환경변수 없이 실행 → 시작하지 않는지 확인**

Run: `npm run start -w @4this/server`

Expected: `Error: ADMIN_PASSWORD 환경변수가 필요합니다. .env.example을 참고해 설정하세요.`로 바로 종료

- [x] **Step 2: 실제로 띄워서 가입까지 확인**

```bash
cd apps/server
ADMIN_PASSWORD=admin-pass SESSION_SECRET=dev-secret-dev-secret-dev-secret-00 npx tsx src/main.ts
```

Expected: `4thIS-world server on :8080 (db: ./data/world.db)`. `apps/server/data/world.db`가 생긴다

다른 터미널에서:

```bash
curl -s http://localhost:8080/api/health
curl -si -X POST http://localhost:8080/api/auth/signup -H 'content-type: application/json' -d '{"username":"철수","password":"secret1"}'
```

Expected: `{"ok":true}`, 그리고 `set-cookie: sid=…; Max-Age=2592000; Path=/; HttpOnly; SameSite=Lax`와 `{"kind":"member","me":{…,"status":"pending",…}}`

서버 터미널에서 Ctrl+C → `SIGINT 받음, 서버를 닫습니다`가 찍히고 종료되는지 본다. 끝나면 `apps/server/data/`를 지워도 된다(루트 `.gitignore`의 `data/`라 커밋되지 않는다).

- [x] **Step 3: 전체 검사**

Run: `npm run format && npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`

Expected: 모두 통과 (shared 23개, server 30개, web 5개)

Run: `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`

- [x] **Step 4: push와 PR**

```bash
git push -u origin wj
gh pr create --base main --head wj --title "[wj#1] 서버 뼈대와 인증" --body-file .github/pull_request_template.md
```

PR 본문에 적을 것:

- `buildApp()` 시그니처가 `buildApp({ config, db })`로 바뀌었다 (cw#1 계약대로).
- 실행하려면 `ADMIN_PASSWORD`·`SESSION_SECRET`이 필요하다. 루트 `npm run dev`도 마찬가지라서, 개발할 때는 셸에서 `export ADMIN_PASSWORD=… SESSION_SECRET=…` 후 실행한다(`.env.example`은 wj#4에서 추가).
- 오류 응답 표: 400 `invalid`, 401 `unauthorized`, 409 `username_taken`, 429 `rate_limited`.

리뷰어로 th(가입·로그인 화면을 붙인다)와 cw를 지정한다. 머지는 **Create a merge commit**.

- [ ] **Step 5: 머지 후 알림**

머지되면 단톡방에 "wj#1 머지됨 — 가입/로그인/관리자 로그인 API 사용 가능. 개발 서버는 `ADMIN_PASSWORD`, `SESSION_SECRET` 환경변수 필요"를 알린다. th는 th#2 PR 전에 `git merge origin/main` 한다.

---

## Self-Review

- 스펙 §8.1: 4개 테이블(Task 2) — `members`(UNIQUE username, bcrypt 해시, status, look JSON, created_at), `schedules`(멤버 삭제 시 CASCADE), `sessions`, `settings`. ✔
- 스펙 §8.2 인증 줄: `GET /auth/session`, `POST /auth/signup`(pending + 바로 세션), `POST /auth/login`·`/logout`(httpOnly 쿠키 30일), `POST /auth/admin`(ADMIN_PASSWORD). ✔ 나머지 줄은 wj#2.
- 스펙 §8.4: 필수 환경변수(Task 1, 실행 확인 Task 5), 시도 제한 IP당 분당 5회(Task 4), 쿠키 httpOnly·lax·production secure(Task 3·4 테스트). ✔
- 스펙 §11 서버 REST: 필수 환경변수 테스트(Task 1), 가입→세션(Task 4). 승인 흐름·권한 표·겹침·백업은 wj#2.
- 계약: 경로는 `API.*`, 응답은 `SessionSchema`·`ApiErrorSchema`로 테스트에서 직접 `parse`해 확인한다. 웹 `api.signup/login/adminLogin`(Session), `api.logout`(`{ ok: true }`)과 맞다.
- 플레이스홀더 없음. 테스트 개수는 실제 실행 결과다.
