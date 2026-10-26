# [th#2] 가입·로그인·꾸미기 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**담당:** 김태희 · 브랜치 `th` · 웨이브 2 · 선행 th#1, wj#1

**Goal:** `UiRoot`를 채우기 시작한다: 오른쪽 위 로그인/가입 버튼(게스트) 또는 내 메뉴, 승인 대기 배너, 모달 시스템, 로그인·가입·관리자 로그인 모달, 3D 미리보기가 도는 캐릭터 꾸미기 화면. 가입 성공 → 꾸미기(랜덤 조합으로 시작) 흐름까지.

**Architecture:** 화면 이동은 라우터 없이 th 소유 zustand 스토어 `useUi`(`screen`, `onboarding`)로 한다. `ScreenHost`가 `screen` 값에 맞는 모달 하나를 그린다. 서버 호출은 cw#1의 `api.*`만 쓰고, 세션은 `useSession.setSession`으로 넣는다. 입력 검증은 shared zod 스키마(`SignupRequestSchema` 등)로 하고, 에러 코드는 `errors.ts`가 한국어로 바꾼다. 서버 없이도 개발·테스트할 수 있게 `ui/testing/mockApi.ts`가 fetch를 가짜 서버로 바꾼다.

**Tech Stack:** React 19.3 · zustand 5 · zod 4 · @react-three/fiber 9 (미리보기) · vitest 5 · @testing-library/react 16 · jsdom

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
- RTL 테스트는 vitest `globals`를 쓰지 않으므로 자동 정리가 없다. 컴포넌트 테스트 파일마다 `afterEach(cleanup)`(또는 `cleanup()`을 부르는 afterEach)를 둔다. `fetch`는 `ui/testing/mockApi.ts`의 `mockApi()`로 바꿔 끼우고 `afterEach`에서 `vi.unstubAllGlobals()`로 되돌린다.
- 화면 이동은 라이브러리 없이 `apps/web/src/ui/store.ts`의 `useUi`(zustand) `screen` 값 하나로 한다.
- 에러 문구: `username_taken` → "이미 쓰고 있는 이름이에요…", `unauthorized` → 로그인 "이름 또는 비밀번호가 맞지 않아요." / 관리자 "관리자 비밀번호가 맞지 않아요.", `rate_limited` → "시도가 너무 많아요. 1분 뒤에 다시 해 주세요."
- 3D 미리보기(`LookPreview`)는 jsdom에서 그릴 수 없으므로 테스트에서 `vi.mock`으로 바꾼다.
- 승인 대기 멤버도 꾸미기·시간표는 할 수 있다(스펙 §8.2).

## File Structure

```
apps/web/src/ui/
├─ store.ts · store.test.ts          useUi: screen / onboarding / open / close
├─ errors.ts · errors.test.ts        errorMessage(err, context), fieldErrors(issues)
├─ ui.css                            공통 스타일(버튼·모달·폼·칩·메뉴·배너·꾸미기)
├─ common/Modal.tsx                  카드 모달 (Esc·바깥 클릭으로 닫기, role=dialog)
├─ testing/mockApi.ts                테스트용 가짜 서버 + 픽스처(ME_PENDING, ME_APPROVED)
├─ auth/LoginForm.tsx · SignupForm.tsx · AdminLoginForm.tsx · auth.test.tsx
├─ customize/CustomizeScreen.tsx · LookChips.tsx · LookPreview.tsx · customize.test.tsx
├─ account/AccountMenu.tsx · PendingBanner.tsx
├─ ScreenHost.tsx                    screen → 모달
├─ UiRoot.tsx                        (교체) 뿌리
└─ UiRoot.test.tsx                   메뉴·모달·가입 흐름
```

---

### Task 1: UI 스토어와 에러 문구

**Files:**

- Create: `apps/web/src/ui/store.ts`, `apps/web/src/ui/errors.ts`
- Test: `apps/web/src/ui/store.test.ts`, `apps/web/src/ui/errors.test.ts`

**Interfaces:**

- Consumes: `ApiError` (`api/http.ts`), `ApiErrorCode`, `SignupRequestSchema` (`@4this/shared`)
- Produces:
  - `type Screen = 'login' | 'signup' | 'adminLogin' | 'customize'` (th#3이 `'schedule'`, th#4가 `'admin'`을 더한다)
  - `useUi` — `{ screen: Screen | null; onboarding: boolean; open(screen, opts?: { onboarding?: boolean }); close() }`. `open`은 `onboarding`을 넘기지 않으면 false로 되돌린다
  - `type ErrorContext = 'login' | 'admin' | 'other'`, `errorMessage(err: unknown, context?): string`, `fieldErrors(issues): Record<string, string>`

- [x] **Step 1: 브랜치 준비**

```bash
git fetch origin && git checkout th && git merge origin/main
npm install
```

- [x] **Step 2: 실패하는 테스트 작성**

`apps/web/src/ui/store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { useUi } from './store';

beforeEach(() => useUi.getState().close());

describe('useUi', () => {
  it('화면을 열고 닫는다', () => {
    useUi.getState().open('login');
    expect(useUi.getState()).toMatchObject({ screen: 'login', onboarding: false });
    useUi.getState().close();
    expect(useUi.getState().screen).toBeNull();
  });

  it('가입 흐름 표시는 다음 화면을 열 때 넘겨야 유지된다', () => {
    useUi.getState().open('customize', { onboarding: true });
    expect(useUi.getState().onboarding).toBe(true);
    useUi.getState().open('login');
    expect(useUi.getState().onboarding).toBe(false);
  });
});
```

`apps/web/src/ui/errors.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SignupRequestSchema } from '@4this/shared';
import { ApiError } from '../api/http';
import { errorMessage, fieldErrors } from './errors';

describe('errorMessage', () => {
  it('에러 코드를 한국어 문구로 바꾼다', () => {
    expect(errorMessage(new ApiError(409, 'username_taken', 'x'))).toContain('이미 쓰고 있는 이름');
    expect(errorMessage(new ApiError(429, 'rate_limited', 'x'))).toContain('1분 뒤');
  });

  it('unauthorized는 어디서 났는지에 따라 다르다', () => {
    const err = new ApiError(401, 'unauthorized', 'x');
    expect(errorMessage(err, 'login')).toBe('이름 또는 비밀번호가 맞지 않아요.');
    expect(errorMessage(err, 'admin')).toBe('관리자 비밀번호가 맞지 않아요.');
    expect(errorMessage(err)).toBe('로그인이 필요해요.');
  });

  it('네트워크 에러는 연결 문구', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toContain('서버에 연결할 수 없어요');
  });
});

describe('fieldErrors', () => {
  it('필드마다 첫 메시지만 남긴다', () => {
    const r = SignupRequestSchema.safeParse({ username: '철', password: '1' });
    expect(r.success).toBe(false);
    expect(fieldErrors(r.error!.issues)).toEqual({ username: '2자 이상', password: '6자 이상' });
  });
});
```

- [x] **Step 3: 실패 확인**

Run: `npm test -w @4this/web -- src/ui`
Expected: FAIL — `Failed to resolve import "./store"` / `"./errors"`

- [x] **Step 4: 구현**

`apps/web/src/ui/store.ts`:

```ts
import { create } from 'zustand';

/** 월드 위에 뜨는 화면. 라우터 없이 이 값 하나로 고른다 */
export type Screen = 'login' | 'signup' | 'adminLogin' | 'customize';

interface UiState {
  /** 지금 열린 화면. null이면 월드만 보인다 */
  screen: Screen | null;
  /** 가입 직후 흐름(가입 → 꾸미기 → 시간표) 중이면 true */
  onboarding: boolean;
  open: (screen: Screen, opts?: { onboarding?: boolean }) => void;
  close: () => void;
}

export const useUi = create<UiState>()((set) => ({
  screen: null,
  onboarding: false,
  open: (screen, opts) => set({ screen, onboarding: opts?.onboarding ?? false }),
  close: () => set({ screen: null, onboarding: false }),
}));
```

`apps/web/src/ui/errors.ts`:

```ts
import type { ApiErrorCode } from '@4this/shared';
import { ApiError } from '../api/http';

/** 어떤 요청에서 난 에러인지. unauthorized 문구가 달라진다 */
export type ErrorContext = 'login' | 'admin' | 'other';

const MESSAGES: Record<ApiErrorCode, string> = {
  invalid: '입력값을 다시 확인해 주세요.',
  unauthorized: '로그인이 필요해요.',
  forbidden: '권한이 없어요.',
  not_found: '찾을 수 없어요.',
  username_taken: '이미 쓰고 있는 이름이에요. 다른 이름을 골라 주세요.',
  overlap: '겹치는 일정이 있어요.',
  rate_limited: '시도가 너무 많아요. 1분 뒤에 다시 해 주세요.',
};

/** API 에러 → 화면에 보여 줄 한국어 문구 */
export function errorMessage(err: unknown, context: ErrorContext = 'other'): string {
  if (!(err instanceof ApiError)) return '서버에 연결할 수 없어요. 잠시 뒤 다시 해 주세요.';
  if (err.code === 'unauthorized' && context === 'login')
    return '이름 또는 비밀번호가 맞지 않아요.';
  if (err.code === 'unauthorized' && context === 'admin') return '관리자 비밀번호가 맞지 않아요.';
  return MESSAGES[err.code];
}

interface IssueLike {
  path: readonly PropertyKey[];
  message: string;
}

/** zod 검증 실패 → { 필드: 첫 번째 메시지 } */
export function fieldErrors(issues: readonly IssueLike[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    out[key] ??= issue.message;
  }
  return out;
}
```

- [x] **Step 5: 통과 확인**

Run: `npm test -w @4this/web -- src/ui`
Expected: PASS — store 2개, errors 4개

- [x] **Step 6: 커밋**

```bash
git add apps/web/src/ui/store.ts apps/web/src/ui/store.test.ts apps/web/src/ui/errors.ts apps/web/src/ui/errors.test.ts
git commit -m "feat: UI 화면 스토어와 에러 문구"
```

---

### Task 2: 로그인·가입·관리자 로그인 모달

**Files:**

- Create: `apps/web/src/ui/ui.css`, `apps/web/src/ui/common/Modal.tsx`, `apps/web/src/ui/testing/mockApi.ts`
- Create: `apps/web/src/ui/auth/LoginForm.tsx`, `apps/web/src/ui/auth/SignupForm.tsx`, `apps/web/src/ui/auth/AdminLoginForm.tsx`
- Test: `apps/web/src/ui/auth/auth.test.tsx`

**Interfaces:**

- Consumes: Task 1 전부, `api.login/signup/adminLogin`, `useSession`, `SignupRequestSchema`
- Produces:
  - `Modal({ title, onClose, children, wide? })` — `role="dialog"`, 제목으로 이름 붙음, `닫기` 버튼, Esc
  - `mockApi(routes: Record<'METHOD /api/...', Reply | (body) => Reply>): { calls; fetchMock }`, `apiError(status, code, message?)`, `ME_PENDING`, `ME_APPROVED`
  - `LoginForm()`, `SignupForm()`, `AdminLoginForm()` — 각자 `useUi`로 닫거나 다음 화면을 연다. 가입 성공 → `open('customize', { onboarding: true })`

`ui.css`는 이 PR 전체가 쓰는 공통 스타일이다(꾸미기 레이아웃 포함). `UiRoot`가 import한다(Task 4).

- [x] **Step 1: 공통 스타일·모달·가짜 서버 작성**

`apps/web/src/ui/ui.css`:

```css
/* 화면 UI 공통: 월드 위 레이어, 버튼, 모달, 폼, 칩, 메뉴, 배너. 값은 tokens.css를 쓴다 */

.ui-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 50;
  font-family: var(--font);
  color: var(--ink);
}

.ui-root > * {
  pointer-events: auto;
}

.ui-card {
  background: var(--card);
  backdrop-filter: blur(8px);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}

/* 버튼 */
.ui-btn {
  border: none;
  border-radius: 999px;
  padding: 8px 16px;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
  background: #f4ecfa;
  cursor: pointer;
  transition:
    background 0.15s,
    transform 0.15s;
}

.ui-btn:hover:not(:disabled) {
  background: #ece1f7;
}

.ui-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.ui-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.ui-btn--primary {
  background: var(--pink);
  color: #fff;
  box-shadow: 0 4px 12px rgba(255, 179, 199, 0.5);
}

.ui-btn--primary:hover:not(:disabled) {
  background: #ffa0b8;
}

.ui-btn--danger {
  background: var(--danger);
  color: #fff;
}

.ui-btn--danger:hover:not(:disabled) {
  background: #ff7a93;
}

.ui-btn--ghost {
  background: transparent;
}

.ui-btn--small {
  padding: 4px 10px;
  font-size: 12px;
}

.ui-link {
  border: none;
  background: none;
  padding: 0;
  font: inherit;
  font-size: 13px;
  color: var(--ink-soft);
  text-decoration: underline;
  cursor: pointer;
}

.ui-icon-btn {
  border: none;
  background: #f4ecfa;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;
}

/* 오른쪽 위 계정 메뉴 */
.ui-top-right {
  position: absolute;
  top: 14px;
  right: 16px;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.ui-menu {
  position: relative;
}

.ui-menu__list {
  position: absolute;
  right: 0;
  top: calc(100% + 6px);
  min-width: 170px;
  padding: 6px;
  margin: 0;
  list-style: none;
  background: #fff;
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow);
}

.ui-menu__item {
  display: block;
  width: 100%;
  border: none;
  background: none;
  text-align: left;
  padding: 9px 12px;
  border-radius: 8px;
  font: inherit;
  font-size: 14px;
  color: var(--ink);
  cursor: pointer;
}

.ui-menu__item:hover {
  background: #f8f1fc;
}

/* 승인 대기 배너 */
.ui-banner {
  position: absolute;
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  max-width: calc(100% - 32px);
  padding: 8px 18px;
  border-radius: 999px;
  background: var(--lemon);
  font-size: 13px;
  font-weight: 600;
  box-shadow: var(--shadow);
  text-align: center;
}

.ui-banner--rejected {
  background: #ffd6de;
}

/* 모달 */
.ui-backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(91, 77, 107, 0.18);
  animation: ui-fade 0.15s ease-out;
}

.ui-modal {
  width: min(380px, 100%);
  max-height: calc(100vh - 32px);
  overflow: auto;
  padding: 20px 22px 22px;
  background: #fffafd;
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 50px rgba(150, 110, 150, 0.3);
  animation: ui-pop 0.18s ease-out;
}

.ui-modal--wide {
  width: min(960px, 100%);
}

.ui-modal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.ui-modal__head h2 {
  margin: 0;
  font-size: 18px;
}

@keyframes ui-fade {
  from {
    opacity: 0;
  }
}

@keyframes ui-pop {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}

/* 폼 */
.ui-form {
  display: grid;
  gap: 12px;
}

.ui-field {
  display: grid;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
}

.ui-input,
.ui-select {
  width: 100%;
  padding: 9px 12px;
  border: 2px solid #efe4f6;
  border-radius: var(--radius-sm);
  background: #fff;
  font: inherit;
  font-size: 14px;
  font-weight: 400;
  color: var(--ink);
  outline: none;
}

.ui-input:focus,
.ui-select:focus {
  border-color: var(--lavender);
}

.ui-field__error {
  font-size: 12px;
  font-weight: 400;
  color: #e0607e;
}

.ui-alert {
  margin: 0;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: #ffe4ea;
  color: #c24766;
  font-size: 13px;
}

.ui-note {
  margin: 0;
  font-size: 13px;
  color: var(--ink-soft);
}

.ui-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.ui-row--end {
  justify-content: flex-end;
}

.ui-row--between {
  justify-content: space-between;
}

/* 칩 */
.ui-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: none;
}

.ui-chips legend {
  width: 100%;
  margin-bottom: 6px;
  padding: 0;
  font-size: 13px;
  font-weight: 700;
}

.ui-chip {
  border: none;
  padding: 6px 12px;
  border-radius: 999px;
  background: #f4ecfa;
  color: var(--ink);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}

.ui-chip:hover {
  background: #ece1f7;
}

.ui-chip[aria-pressed='true'] {
  background: var(--lavender);
  color: #fff;
  box-shadow: 0 3px 10px rgba(181, 165, 238, 0.5);
}

.ui-swatch {
  width: 28px;
  height: 28px;
  padding: 0;
  border-radius: 50%;
  border: 3px solid #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.15);
  cursor: pointer;
}

.ui-swatch[aria-pressed='true'] {
  outline: 3px solid var(--lavender);
}

/* 꾸미기 */
.ui-customize {
  display: grid;
  grid-template-columns: 300px 1fr;
  gap: 20px;
  align-items: start;
}

.ui-preview {
  height: 320px;
  border-radius: var(--radius);
  background: linear-gradient(#fdf3f8, #f6e9f6);
  overflow: hidden;
}

@media (max-width: 639px) {
  .ui-customize {
    grid-template-columns: 1fr;
  }

  .ui-preview {
    height: 220px;
  }

  .ui-banner {
    top: 58px;
    border-radius: var(--radius-sm);
  }
}
```

`apps/web/src/ui/common/Modal.tsx`:

```tsx
import { useEffect, useId, type ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** 시간표·관리자처럼 넓은 화면 */
  wide?: boolean;
}

/** 월드 위에 뜨는 카드 모달. 바깥을 누르거나 Esc로 닫는다 */
export function Modal({ title, onClose, children, wide = false }: ModalProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="ui-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={wide ? 'ui-modal ui-modal--wide' : 'ui-modal'}
      >
        <header className="ui-modal__head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="ui-icon-btn" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
```

`apps/web/src/ui/testing/mockApi.ts`:

```ts
import { vi } from 'vitest';
import type { Me } from '@4this/shared';

/**
 * 테스트용 가짜 서버. 서버(wj)가 없어도 화면을 만들고 검증할 수 있게
 * `'METHOD /api/경로'` → 응답을 정해 fetch를 바꿔 끼운다.
 */
type Reply = { status?: number; body: unknown };
type Route = Reply | ((body: unknown) => Reply);

export interface ApiCall {
  method: string;
  url: string;
  body: unknown;
}

export function mockApi(routes: Record<string, Route>) {
  const calls: ApiCall[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url, body });
    const route = routes[`${method} ${url}`];
    if (!route) {
      return new Response(JSON.stringify({ error: 'not_found', message: '목 없음' }), {
        status: 404,
      });
    }
    const reply = typeof route === 'function' ? route(body) : route;
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

/** 에러 응답 본문 */
export const apiError = (status: number, error: string, message = error): Reply => ({
  status,
  body: { error, message },
});

export const ME_PENDING: Me = {
  id: 'm1',
  username: '철수',
  status: 'pending',
  look: { animal: 'dog', color: 'default', head: 'none', eyes: 'none', neck: 'none' },
};

export const ME_APPROVED: Me = { ...ME_PENDING, status: 'approved' };
```

- [x] **Step 2: 실패하는 테스트 작성**

`apps/web/src/ui/auth/auth.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '../../store/session';
import { useUi } from '../store';
import { apiError, ME_PENDING, mockApi } from '../testing/mockApi';
import { AdminLoginForm } from './AdminLoginForm';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

beforeEach(() => {
  useSession.setState({ session: { kind: 'guest' }, loading: false });
  useUi.getState().close();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('SignupForm', () => {
  it('입력이 틀리면 서버에 보내지 않고 필드 아래에 알려 준다', () => {
    const { calls } = mockApi({});
    render(<SignupForm />);
    type(/^이름/, '철');
    type(/^비밀번호 \(/, '123');
    type('비밀번호 확인', '456');
    fireEvent.click(screen.getByRole('button', { name: '가입하고 캐릭터 꾸미기' }));
    expect(screen.getByText('2자 이상')).toBeTruthy();
    expect(screen.getByText('6자 이상')).toBeTruthy();
    expect(screen.getByText('비밀번호가 서로 달라요')).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it('성공하면 세션을 넣고 꾸미기 화면(가입 흐름)을 연다', async () => {
    const { calls } = mockApi({
      'POST /api/auth/signup': { body: { kind: 'member', me: ME_PENDING } },
    });
    render(<SignupForm />);
    type(/^이름/, '철수');
    type(/^비밀번호 \(/, '123456');
    type('비밀번호 확인', '123456');
    fireEvent.click(screen.getByRole('button', { name: '가입하고 캐릭터 꾸미기' }));
    await vi.waitFor(() => expect(useUi.getState().screen).toBe('customize'));
    expect(useUi.getState().onboarding).toBe(true);
    expect(useSession.getState().session).toEqual({ kind: 'member', me: ME_PENDING });
    expect(calls[0]).toMatchObject({ body: { username: '철수', password: '123456' } });
  });

  it('이미 있는 이름이면 한국어로 알려 준다', async () => {
    mockApi({ 'POST /api/auth/signup': apiError(409, 'username_taken') });
    render(<SignupForm />);
    type(/^이름/, '철수');
    type(/^비밀번호 \(/, '123456');
    type('비밀번호 확인', '123456');
    fireEvent.click(screen.getByRole('button', { name: '가입하고 캐릭터 꾸미기' }));
    expect((await screen.findByRole('alert')).textContent).toContain('이미 쓰고 있는 이름');
  });
});

describe('LoginForm', () => {
  it('비어 있으면 안내만 한다', () => {
    const { calls } = mockApi({});
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(screen.getByRole('alert').textContent).toBe('이름과 비밀번호를 입력해 주세요.');
    expect(calls).toHaveLength(0);
  });

  it('성공하면 세션을 넣고 닫는다', async () => {
    mockApi({ 'POST /api/auth/login': { body: { kind: 'member', me: ME_PENDING } } });
    useUi.getState().open('login');
    render(<LoginForm />);
    type('이름', ' 철수 ');
    type('비밀번호', '123456');
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    await vi.waitFor(() => expect(useUi.getState().screen).toBeNull());
    expect(useSession.getState().session.kind).toBe('member');
  });

  it('틀리거나 너무 많이 시도하면 알려 준다', async () => {
    mockApi({ 'POST /api/auth/login': apiError(401, 'unauthorized') });
    render(<LoginForm />);
    type('이름', '철수');
    type('비밀번호', 'wrong!');
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      '이름 또는 비밀번호가 맞지 않아요.',
    );

    mockApi({ 'POST /api/auth/login': apiError(429, 'rate_limited') });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    await vi.waitFor(() => expect(screen.getByRole('alert').textContent).toContain('1분 뒤'));
  });

  it('가입·관리자 로그인으로 옮겨 간다', () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: '관리자 로그인' }));
    expect(useUi.getState().screen).toBe('adminLogin');
    fireEvent.click(screen.getByRole('button', { name: /가입하기/ }));
    expect(useUi.getState().screen).toBe('signup');
  });
});

describe('AdminLoginForm', () => {
  it('성공하면 관리자 세션', async () => {
    const { calls } = mockApi({ 'POST /api/auth/admin': { body: { kind: 'admin' } } });
    render(<AdminLoginForm />);
    type('관리자 비밀번호', 'secret');
    fireEvent.click(screen.getByRole('button', { name: '관리자로 들어가기' }));
    await vi.waitFor(() => expect(useSession.getState().session).toEqual({ kind: 'admin' }));
    expect(calls[0]?.body).toEqual({ password: 'secret' });
  });

  it('틀리면 관리자 문구', async () => {
    mockApi({ 'POST /api/auth/admin': apiError(401, 'unauthorized') });
    render(<AdminLoginForm />);
    type('관리자 비밀번호', 'nope');
    fireEvent.click(screen.getByRole('button', { name: '관리자로 들어가기' }));
    expect((await screen.findByRole('alert')).textContent).toBe('관리자 비밀번호가 맞지 않아요.');
  });
});
```

- [x] **Step 3: 실패 확인**

Run: `npm test -w @4this/web -- auth`
Expected: FAIL — `Failed to resolve import "./AdminLoginForm"`

- [x] **Step 4: 구현**

`apps/web/src/ui/auth/LoginForm.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { Modal } from '../common/Modal';
import { errorMessage } from '../errors';
import { useUi } from '../store';

/** 로그인 모달 */
export function LoginForm() {
  const { open, close } = useUi();
  const setSession = useSession((s) => s.setSession);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('이름과 비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setSession(await api.login({ username: username.trim(), password }));
      close();
    } catch (err) {
      setError(errorMessage(err, 'login'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="로그인" onClose={close}>
      <form className="ui-form" onSubmit={submit} noValidate>
        <label className="ui-field">
          이름
          <input
            className="ui-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label className="ui-field">
          비밀번호
          <input
            className="ui-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p className="ui-alert" role="alert">
            {error}
          </p>
        )}
        <button className="ui-btn ui-btn--primary" type="submit" disabled={busy}>
          {busy ? '들어가는 중…' : '로그인'}
        </button>
        <div className="ui-row ui-row--between">
          <button type="button" className="ui-link" onClick={() => open('signup')}>
            처음이에요 · 가입하기
          </button>
          <button type="button" className="ui-link" onClick={() => open('adminLogin')}>
            관리자 로그인
          </button>
        </div>
      </form>
    </Modal>
  );
}
```

`apps/web/src/ui/auth/SignupForm.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { SignupRequestSchema } from '@4this/shared';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { Modal } from '../common/Modal';
import { errorMessage, fieldErrors } from '../errors';
import { useUi } from '../store';

/** 가입 모달. 성공하면 바로 로그인 상태가 되고 꾸미기 화면으로 넘어간다 */
export function SignupForm() {
  const { open, close } = useUi();
  const setSession = useSession((s) => s.setSession);
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = SignupRequestSchema.safeParse({
      username: form.username,
      password: form.password,
    });
    const errs = parsed.success ? {} : fieldErrors(parsed.error.issues);
    if (form.password !== form.confirm) errs.confirm = '비밀번호가 서로 달라요';
    setFields(errs);
    if (!parsed.success || errs.confirm) return;

    setBusy(true);
    try {
      setSession(await api.signup(parsed.data));
      open('customize', { onboarding: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="가입하기" onClose={close}>
      <form className="ui-form" onSubmit={submit} noValidate>
        <p className="ui-note">가입하면 관리자가 승인한 뒤 캠퍼스에 캐릭터가 나타나요.</p>
        <label className="ui-field">
          이름 (2~12자, 로그인 아이디로도 써요)
          <input
            className="ui-input"
            value={form.username}
            onChange={set('username')}
            autoComplete="username"
            autoFocus
          />
          {fields.username && <span className="ui-field__error">{fields.username}</span>}
        </label>
        <label className="ui-field">
          비밀번호 (6자 이상)
          <input
            className="ui-input"
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
          />
          {fields.password && <span className="ui-field__error">{fields.password}</span>}
        </label>
        <label className="ui-field">
          비밀번호 확인
          <input
            className="ui-input"
            type="password"
            value={form.confirm}
            onChange={set('confirm')}
            autoComplete="new-password"
          />
          {fields.confirm && <span className="ui-field__error">{fields.confirm}</span>}
        </label>
        {error && (
          <p className="ui-alert" role="alert">
            {error}
          </p>
        )}
        <button className="ui-btn ui-btn--primary" type="submit" disabled={busy}>
          {busy ? '가입하는 중…' : '가입하고 캐릭터 꾸미기'}
        </button>
        <button type="button" className="ui-link" onClick={() => open('login')}>
          이미 가입했어요 · 로그인
        </button>
      </form>
    </Modal>
  );
}
```

`apps/web/src/ui/auth/AdminLoginForm.tsx`:

```tsx
import { useState, type FormEvent } from 'react';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { Modal } from '../common/Modal';
import { errorMessage } from '../errors';
import { useUi } from '../store';

/** 관리자 로그인 모달 (ADMIN_PASSWORD 하나로 들어간다) */
export function AdminLoginForm() {
  const close = useUi((s) => s.close);
  const setSession = useSession((s) => s.setSession);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('관리자 비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setSession(await api.adminLogin({ password }));
      close();
    } catch (err) {
      setError(errorMessage(err, 'admin'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="관리자 로그인" onClose={close}>
      <form className="ui-form" onSubmit={submit} noValidate>
        <label className="ui-field">
          관리자 비밀번호
          <input
            className="ui-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
          />
        </label>
        {error && (
          <p className="ui-alert" role="alert">
            {error}
          </p>
        )}
        <button className="ui-btn ui-btn--primary" type="submit" disabled={busy}>
          {busy ? '확인하는 중…' : '관리자로 들어가기'}
        </button>
      </form>
    </Modal>
  );
}
```

- [x] **Step 5: 통과 확인**

Run: `npm test -w @4this/web -- auth && npm run typecheck -w @4this/web`
Expected: PASS — 9개, 타입 에러 0

- [x] **Step 6: 커밋**

```bash
git add apps/web/src/ui/ui.css apps/web/src/ui/common apps/web/src/ui/testing apps/web/src/ui/auth
git commit -m "feat: 로그인·가입·관리자 로그인 모달"
```

---

### Task 3: 캐릭터 꾸미기 화면

**Files:**

- Create: `apps/web/src/ui/customize/LookChips.tsx`, `apps/web/src/ui/customize/LookPreview.tsx`, `apps/web/src/ui/customize/CustomizeScreen.tsx`
- Test: `apps/web/src/ui/customize/customize.test.tsx`

**Interfaces:**

- Consumes: `ANIMALS`, `COLOR_KEYS`, `HEADS`, `EYES`, `NECKS`, `resolveColor`, `randomLook`, `DEFAULT_LOOK` (`@4this/shared`), th#1의 `Character`와 `labels.ts`, `api.patchMe`
- Produces:
  - `LookChips({ look, onChange })` — 동물·색(스와치, `aria-label`=색 이름)·머리·눈·목 칩. 칩은 `aria-pressed`로 선택 표시
  - `LookPreview({ look })` — 작은 `<Canvas>`에서 천천히 도는 `<Character pose="idle">`
  - `CustomizeScreen()` — 가입 흐름이면 `randomLook()`으로, 아니면 내 생김새로 시작. 🎲 랜덤, 저장 `api.patchMe({ look })` → `setSession({ kind: 'member', me })` → 닫기

- [x] **Step 1: 실패하는 테스트 작성**

`apps/web/src/ui/customize/customize.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LookSchema, type Look } from '@4this/shared';
import { useSession } from '../../store/session';
import { useUi } from '../store';
import { apiError, ME_PENDING, mockApi } from '../testing/mockApi';
import { CustomizeScreen } from './CustomizeScreen';

// WebGL이 없는 jsdom에서는 3D 미리보기 대신 지금 생김새를 글자로 보여 준다
vi.mock('./LookPreview', () => ({
  LookPreview: ({ look }: { look: Look }) => (
    <div data-testid="preview">{JSON.stringify(look)}</div>
  ),
}));

const preview = (): Look => JSON.parse(screen.getByTestId('preview').textContent ?? '{}') as Look;

beforeEach(() => {
  useSession.setState({ session: { kind: 'member', me: ME_PENDING }, loading: false });
  useUi.getState().open('customize');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CustomizeScreen', () => {
  it('지금 내 생김새로 시작하고 칩을 누르면 바뀐다', () => {
    render(<CustomizeScreen />);
    expect(preview()).toEqual(ME_PENDING.look);
    fireEvent.click(screen.getByRole('button', { name: /고양이/ }));
    fireEvent.click(screen.getByRole('button', { name: '민트' }));
    fireEvent.click(screen.getByRole('button', { name: '비니' }));
    fireEvent.click(screen.getByRole('button', { name: '선글라스' }));
    fireEvent.click(screen.getByRole('button', { name: '나비넥타이' }));
    expect(preview()).toEqual({
      animal: 'cat',
      color: 'mint',
      head: 'beanie',
      eyes: 'sunglasses',
      neck: 'bowtie',
    });
    expect(screen.getByRole('button', { name: '비니' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('가입 흐름에서는 랜덤 조합으로 시작한다', () => {
    useUi.getState().open('customize', { onboarding: true });
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    render(<CustomizeScreen />);
    expect(preview()).toEqual({
      animal: 'duck',
      color: 'gray',
      head: 'cap',
      eyes: 'sunglasses',
      neck: 'bowtie',
    });
    expect(screen.getByRole('heading').textContent).toBe('내 캐릭터 만들기');
    random.mockRestore();
  });

  it('🎲 랜덤은 항상 유효한 조합', () => {
    render(<CustomizeScreen />);
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole('button', { name: '🎲 랜덤' }));
      expect(LookSchema.safeParse(preview()).success).toBe(true);
    }
  });

  it('저장하면 PATCH /api/me 후 세션을 갱신하고 닫는다', async () => {
    const saved = { ...ME_PENDING, look: { ...ME_PENDING.look, animal: 'bear' as const } };
    const { calls } = mockApi({ 'PATCH /api/me': { body: saved } });
    render(<CustomizeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /곰/ }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(useUi.getState().screen).toBeNull());
    expect(calls[0]).toMatchObject({ method: 'PATCH', body: { look: saved.look } });
    expect(useSession.getState().session).toEqual({ kind: 'member', me: saved });
  });

  it('저장 실패는 알려 주고 화면을 유지한다', async () => {
    mockApi({ 'PATCH /api/me': apiError(401, 'unauthorized') });
    render(<CustomizeScreen />);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect((await screen.findByRole('alert')).textContent).toBe('로그인이 필요해요.');
    expect(useUi.getState().screen).toBe('customize');
  });

  it('게스트에게는 안내만 보인다', () => {
    useSession.setState({ session: { kind: 'guest' } });
    render(<CustomizeScreen />);
    expect(screen.getByText('로그인한 멤버만 꾸밀 수 있어요.')).toBeTruthy();
  });
});
```

- [x] **Step 2: 실패 확인**

Run: `npm test -w @4this/web -- customize`
Expected: FAIL — `Failed to resolve import "./CustomizeScreen"`

- [x] **Step 3: 구현**

`apps/web/src/ui/customize/LookChips.tsx`:

```tsx
import { ANIMALS, COLOR_KEYS, EYES, HEADS, NECKS, resolveColor, type Look } from '@4this/shared';
import {
  ANIMAL_EMOJI,
  ANIMAL_LABELS,
  COLOR_LABELS,
  EYES_LABELS,
  HEAD_LABELS,
  NECK_LABELS,
} from '../../world/characters/labels';

interface ChipGroupProps<K extends string> {
  legend: string;
  keys: readonly K[];
  value: K;
  label: (k: K) => string;
  onChange: (k: K) => void;
}

function ChipGroup<K extends string>({ legend, keys, value, label, onChange }: ChipGroupProps<K>) {
  return (
    <fieldset className="ui-chips">
      <legend>{legend}</legend>
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          className="ui-chip"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
        >
          {label(k)}
        </button>
      ))}
    </fieldset>
  );
}

/** 동물·색·머리·눈·목 칩. 값은 shared 상수에서 만든다 */
export function LookChips({ look, onChange }: { look: Look; onChange: (look: Look) => void }) {
  return (
    <div className="ui-form">
      <ChipGroup
        legend="동물"
        keys={ANIMALS}
        value={look.animal}
        label={(a) => `${ANIMAL_EMOJI[a]} ${ANIMAL_LABELS[a]}`}
        onChange={(animal) => onChange({ ...look, animal })}
      />
      <fieldset className="ui-chips">
        <legend>색</legend>
        {COLOR_KEYS.map((c) => (
          <button
            key={c}
            type="button"
            className="ui-swatch"
            aria-label={COLOR_LABELS[c]}
            title={COLOR_LABELS[c]}
            aria-pressed={look.color === c}
            style={{ background: resolveColor(look.animal, c) }}
            onClick={() => onChange({ ...look, color: c })}
          />
        ))}
      </fieldset>
      <ChipGroup
        legend="머리"
        keys={HEADS}
        value={look.head}
        label={(k) => HEAD_LABELS[k]}
        onChange={(head) => onChange({ ...look, head })}
      />
      <ChipGroup
        legend="눈"
        keys={EYES}
        value={look.eyes}
        label={(k) => EYES_LABELS[k]}
        onChange={(eyes) => onChange({ ...look, eyes })}
      />
      <ChipGroup
        legend="목"
        keys={NECKS}
        value={look.neck}
        label={(k) => NECK_LABELS[k]}
        onChange={(neck) => onChange({ ...look, neck })}
      />
    </div>
  );
}
```

`apps/web/src/ui/customize/LookPreview.tsx`:

```tsx
import { Canvas, useFrame } from '@react-three/fiber';
import { useRef, type ReactNode } from 'react';
import type { Group } from 'three';
import type { Look } from '@4this/shared';
import { Character } from '../../world/characters/Character';

/** 자식을 천천히 돌린다 */
function Turntable({ children }: { children: ReactNode }) {
  const group = useRef<Group>(null);
  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.6;
  });
  return <group ref={group}>{children}</group>;
}

/** 꾸미기 화면의 작은 3D 미리보기. 캐릭터가 천천히 돈다 */
export function LookPreview({ look }: { look: Look }) {
  return (
    <div className="ui-preview" aria-hidden="true">
      <Canvas
        shadows
        camera={{ position: [0, 1.1, 3], fov: 30 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.55, 0)}
      >
        <hemisphereLight args={['#fff6fb', '#c9e8c4', 1.4]} />
        <directionalLight position={[3, 5, 4]} intensity={1.8} castShadow />
        <Turntable>
          <Character look={look} pose="idle" />
        </Turntable>
        <mesh rotation-x={-Math.PI / 2} receiveShadow>
          <circleGeometry args={[0.9, 40]} />
          <meshStandardMaterial color="#f6e3ef" />
        </mesh>
      </Canvas>
    </div>
  );
}
```

`apps/web/src/ui/customize/CustomizeScreen.tsx`:

```tsx
import { useState } from 'react';
import { DEFAULT_LOOK, randomLook, type Look } from '@4this/shared';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { Modal } from '../common/Modal';
import { errorMessage } from '../errors';
import { useUi } from '../store';
import { LookChips } from './LookChips';
import { LookPreview } from './LookPreview';

/**
 * 캐릭터 꾸미기. 가입 직후(onboarding)에는 랜덤 조합으로 시작하고,
 * 그 밖에는 지금 내 생김새로 시작한다.
 */
export function CustomizeScreen() {
  const session = useSession((s) => s.session);
  const setSession = useSession((s) => s.setSession);
  const { onboarding, close } = useUi();
  const [look, setLook] = useState<Look>(() =>
    onboarding ? randomLook() : session.kind === 'member' ? session.me.look : DEFAULT_LOOK,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session.kind !== 'member') {
    return (
      <Modal title="캐릭터 꾸미기" onClose={close}>
        <p className="ui-note">로그인한 멤버만 꾸밀 수 있어요.</p>
      </Modal>
    );
  }

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const me = await api.patchMe({ look });
      setSession({ kind: 'member', me });
      close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={onboarding ? '내 캐릭터 만들기' : '캐릭터 꾸미기'} onClose={close} wide>
      <div className="ui-customize">
        <LookPreview look={look} />
        <div className="ui-form">
          <LookChips look={look} onChange={setLook} />
          {error && (
            <p className="ui-alert" role="alert">
              {error}
            </p>
          )}
          <div className="ui-row ui-row--between">
            <button type="button" className="ui-btn" onClick={() => setLook(randomLook())}>
              🎲 랜덤
            </button>
            <button type="button" className="ui-btn ui-btn--primary" onClick={save} disabled={busy}>
              {busy ? '저장하는 중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
```

- [x] **Step 4: 통과 확인**

Run: `npm test -w @4this/web -- customize && npm run typecheck -w @4this/web`
Expected: PASS — 6개, 타입 에러 0

- [x] **Step 5: 커밋**

```bash
git add apps/web/src/ui/customize
git commit -m "feat: 3D 미리보기 캐릭터 꾸미기 화면"
```

---

### Task 4: 계정 메뉴·승인 대기 배너·UiRoot

**Files:**

- Create: `apps/web/src/ui/account/AccountMenu.tsx`, `apps/web/src/ui/account/PendingBanner.tsx`, `apps/web/src/ui/ScreenHost.tsx`
- Modify (전체 교체): `apps/web/src/ui/UiRoot.tsx`
- Test: `apps/web/src/ui/UiRoot.test.tsx`

**Interfaces:**

- Consumes: Task 1~3 전부, `useSession`(`session`, `loading`, `setSession`), `api.logout`, `ANIMAL_EMOJI`
- Produces:
  - `AccountMenu()` — 세션 불러오는 중이면 아무것도 안 그림. 게스트: `로그인`·`가입` 버튼. 멤버: `🐶 철수 ▾` → `캐릭터 꾸미기`·`로그아웃` 메뉴(role=menu). 관리자: `🛠️ 관리자 ▾` → `로그아웃`
  - `PendingBanner()` — `pending`이면 "⏳ 관리자 승인 대기 중이에요…", `rejected`면 거절 안내 (role=status)
  - `ScreenHost()` — `useUi().screen` → 모달
  - `UiRoot()` — `.ui-root`(월드 위 전체 레이어, 빈 곳은 클릭이 월드로 통과) 안에 오른쪽 위 메뉴·배너·ScreenHost

- [x] **Step 1: 실패하는 테스트 작성**

`apps/web/src/ui/UiRoot.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '../store/session';
import { useUi } from './store';
import { ME_APPROVED, ME_PENDING, mockApi } from './testing/mockApi';
import { UiRoot } from './UiRoot';

vi.mock('./customize/LookPreview', () => ({ LookPreview: () => <div data-testid="preview" /> }));

beforeEach(() => {
  useSession.setState({ session: { kind: 'guest' }, loading: false });
  useUi.getState().close();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('UiRoot', () => {
  it('세션을 불러오는 동안에는 계정 버튼을 그리지 않는다', () => {
    useSession.setState({ loading: true });
    render(<UiRoot />);
    expect(screen.queryByRole('button', { name: '로그인' })).toBeNull();
  });

  it('게스트: 로그인·가입 버튼이 모달을 연다', () => {
    render(<UiRoot />);
    fireEvent.click(screen.getByRole('button', { name: '가입' }));
    expect(screen.getByRole('dialog', { name: '가입하기' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(screen.getByRole('dialog', { name: '로그인' })).toBeTruthy();
  });

  it('Esc로 모달을 닫는다', () => {
    render(<UiRoot />);
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('승인 대기 멤버: 배너와 내 메뉴', () => {
    useSession.setState({ session: { kind: 'member', me: ME_PENDING } });
    render(<UiRoot />);
    expect(screen.getByRole('status').textContent).toContain('관리자 승인 대기 중');
    fireEvent.click(screen.getByRole('button', { name: /철수/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: '캐릭터 꾸미기' }));
    expect(screen.getByRole('dialog', { name: '캐릭터 꾸미기' })).toBeTruthy();
  });

  it('승인된 멤버는 배너가 없고, 로그아웃하면 게스트', async () => {
    const { calls } = mockApi({ 'POST /api/auth/logout': { body: { ok: true } } });
    useSession.setState({ session: { kind: 'member', me: ME_APPROVED } });
    render(<UiRoot />);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /철수/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: '로그아웃' }));
    await vi.waitFor(() => expect(useSession.getState().session).toEqual({ kind: 'guest' }));
    expect(calls[0]?.url).toBe('/api/auth/logout');
  });

  it('가입 → 꾸미기 → 저장 흐름', async () => {
    mockApi({
      'POST /api/auth/signup': { body: { kind: 'member', me: ME_PENDING } },
      'PATCH /api/me': (body) => ({ body: { ...ME_PENDING, ...(body as object) } }),
    });
    render(<UiRoot />);
    fireEvent.click(screen.getByRole('button', { name: '가입' }));
    fireEvent.change(screen.getByLabelText(/^이름/), { target: { value: '철수' } });
    fireEvent.change(screen.getByLabelText(/^비밀번호 \(/), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '가입하고 캐릭터 꾸미기' }));
    expect(await screen.findByRole('dialog', { name: '내 캐릭터 만들기' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('승인 대기');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
```

- [x] **Step 2: 실패 확인**

Run: `npm test -w @4this/web -- UiRoot`
Expected: FAIL — 게스트 버튼을 찾지 못한다(`Unable to find an accessible element with the role "button" and name "가입"`). cw#1의 `UiRoot`는 `null`을 돌려준다.

- [x] **Step 3: 구현**

`apps/web/src/ui/account/AccountMenu.tsx`:

```tsx
import { useState } from 'react';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { ANIMAL_EMOJI } from '../../world/characters/labels';
import { useUi, type Screen } from '../store';

interface MenuItem {
  label: string;
  run: () => void;
}

/** 오른쪽 위: 게스트면 로그인·가입 버튼, 로그인했으면 내 메뉴 */
export function AccountMenu() {
  const { session, loading, setSession } = useSession();
  const open = useUi((s) => s.open);
  const [expanded, setExpanded] = useState(false);

  if (loading) return null;

  if (session.kind === 'guest') {
    return (
      <div className="ui-row">
        <button type="button" className="ui-btn" onClick={() => open('login')}>
          로그인
        </button>
        <button type="button" className="ui-btn ui-btn--primary" onClick={() => open('signup')}>
          가입
        </button>
      </div>
    );
  }

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // 서버가 응답하지 않아도 화면에서는 로그아웃한다
    }
    setSession({ kind: 'guest' });
  };

  const go = (screen: Screen) => () => open(screen);
  const items: MenuItem[] =
    session.kind === 'member'
      ? [
          { label: '캐릭터 꾸미기', run: go('customize') },
          { label: '로그아웃', run: logout },
        ]
      : [{ label: '로그아웃', run: logout }];
  const title =
    session.kind === 'member'
      ? `${ANIMAL_EMOJI[session.me.look.animal]} ${session.me.username}`
      : '🛠️ 관리자';

  return (
    <div className="ui-menu">
      <button
        type="button"
        className="ui-btn"
        aria-haspopup="menu"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {title} ▾
      </button>
      {expanded && (
        <ul className="ui-menu__list" role="menu">
          {items.map((item) => (
            <li key={item.label} role="none">
              <button
                type="button"
                role="menuitem"
                className="ui-menu__item"
                onClick={() => {
                  setExpanded(false);
                  item.run();
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

`apps/web/src/ui/account/PendingBanner.tsx`:

```tsx
import { useSession } from '../../store/session';

/** 승인 전 멤버에게 상단 배너를 띄운다 (설계 문서 §9 가입 흐름) */
export function PendingBanner() {
  const session = useSession((s) => s.session);
  if (session.kind !== 'member' || session.me.status === 'approved') return null;
  if (session.me.status === 'rejected') {
    return (
      <p className="ui-banner ui-banner--rejected" role="status">
        가입이 승인되지 않았어요. 관리자에게 문의해 주세요.
      </p>
    );
  }
  return (
    <p className="ui-banner" role="status">
      ⏳ 관리자 승인 대기 중이에요. 승인되면 캠퍼스에 캐릭터가 나타나요.
    </p>
  );
}
```

`apps/web/src/ui/ScreenHost.tsx`:

```tsx
import { AdminLoginForm } from './auth/AdminLoginForm';
import { LoginForm } from './auth/LoginForm';
import { SignupForm } from './auth/SignupForm';
import { CustomizeScreen } from './customize/CustomizeScreen';
import { useUi } from './store';

/** UI 스토어의 screen 값에 맞는 모달 하나를 그린다 (라우터 대신) */
export function ScreenHost() {
  const screen = useUi((s) => s.screen);
  switch (screen) {
    case null:
      return null;
    case 'login':
      return <LoginForm />;
    case 'signup':
      return <SignupForm />;
    case 'adminLogin':
      return <AdminLoginForm />;
    case 'customize':
      return <CustomizeScreen />;
  }
}
```

`apps/web/src/ui/UiRoot.tsx` — 파일 전체:

```tsx
import { AccountMenu } from './account/AccountMenu';
import { PendingBanner } from './account/PendingBanner';
import { ScreenHost } from './ScreenHost';
import './ui.css';

/**
 * 화면 UI의 뿌리. App이 월드 위에 그린다.
 * th#2: 계정 메뉴·승인 대기 배너·모달(로그인·가입·관리자 로그인·꾸미기)
 */
export function UiRoot() {
  return (
    <div className="ui-root">
      <div className="ui-top-right">
        <AccountMenu />
      </div>
      <PendingBanner />
      <ScreenHost />
    </div>
  );
}
```

- [x] **Step 4: 통과 확인**

Run: `npm test -w @4this/web -- src/ui`
Expected: PASS — store 2, errors 4, auth 9, customize 6, UiRoot 6 (27개)

- [x] **Step 5: 실제 서버로 확인** (wj#1이 머지돼 있어야 한다)

Run: `ADMIN_PASSWORD=admin1234 SESSION_SECRET=dev-secret-dev-secret-dev-secret-00 npm run dev` 후 http://localhost:5173
Expected:

- 오른쪽 위 `로그인`·`가입`. `가입` → 이름·비밀번호 입력 → `가입하고 캐릭터 꾸미기` → "내 캐릭터 만들기" 모달에 랜덤 캐릭터가 천천히 돈다. 칩을 누르면 미리보기가 바로 바뀌고, 🎲 랜덤도 된다. `저장`하면 닫힌다(서버가 아직 `PATCH /api/me`를 모르면(wj#2 전) "찾을 수 없어요." 문구가 뜨는 것이 정상).
- 상단에 노란 "⏳ 관리자 승인 대기 중이에요…" 배너, 오른쪽 위는 `🐶 이름 ▾` 메뉴. `로그아웃` → 다시 게스트.
- 같은 이름으로 다시 가입하면 "이미 쓰고 있는 이름이에요…". 로그인 6번 연속 틀리면 "1분 뒤에 다시…".
- `로그인` 모달의 `관리자 로그인` → 틀린 비밀번호면 "관리자 비밀번호가 맞지 않아요.", 맞으면 메뉴가 `🛠️ 관리자 ▾`로 바뀐다.
- 창을 390px로 줄이면 꾸미기 모달이 미리보기 위·칩 아래로 쌓인다.

- [x] **Step 6: 커밋**

```bash
git add apps/web/src/ui
git commit -m "feat: 계정 메뉴·승인 대기 배너·모달 화면 전환"
```

---

### Task 5: 전체 검사와 PR

- [x] **Step 1: 전체 검사**

Run: `npm run format && npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
Expected: 모두 통과. `@4this/web` 테스트 51개(cw#1의 5개 포함, 먼저 머지된 다른 PR의 테스트가 있으면 그만큼 더 많다). 빌드는 `✓ built` (500 kB 청크 경고는 무시).

- [ ] **Step 2: push와 PR**

```bash
git push origin th
gh pr create --base main --head th --title "[th#2] 가입·로그인·꾸미기" --body-file .github/pull_request_template.md
```

PR 본문에 가입 → 꾸미기 화면 스크린샷을 붙이고 wj(인증 API)와 cw를 리뷰어로 지정한다. 머지는 **Create a merge commit**.

- [ ] **Step 3: 머지 후 알림**

머지되면 단톡방에 "th#2 머지됨 — 가입·로그인·꾸미기 화면이 생겼어요" 를 알린다.

---

## Self-Review

- 스펙 §9 가입 흐름(가입 → 꾸미기, 승인 전 배너), 꾸미기(도는 3D 미리보기·칩·🎲 랜덤·가입 시 랜덤 기본값) → Task 2~4. §8.2 `POST /auth/signup·login·admin`, `PATCH /me`(look) → `api.*`. §8.4 시도 제한 → `rate_limited` 문구. 시간표로 이어지는 단계는 th#3에서 `CustomizeScreen` 저장 뒤 `open('schedule', { onboarding: true })`로 잇는다.
- 플레이스홀더 없음. 코드는 검증한 파일 그대로다.
- `api.*`, `useSession`, `Session`, `Look`, `LookSchema`, `randomLook`은 cw#1 계약 이름 그대로 쓴다. `ui/contracts.ts`는 고치지 않는다.
