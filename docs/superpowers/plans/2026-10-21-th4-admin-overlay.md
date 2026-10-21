# [th#4] 관리자·오버레이 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**담당:** 김태희 · 브랜치 `th` · 웨이브 4 · 선행 th#3

**Goal:** (1) 메인 오버레이 표시 컴포넌트 7개(`TopBar`, `PresencePanel`, `EmoteBar`, `ControlButton`, `BoardPanel`, `ConnectionBadge`, `BuildingPanel`)를 `ui/contracts.ts`의 props 그대로 만들고 `UiRoot`에 배치한다. (2) 관리자 화면: 승인 대기 배지·목록(승인/거절), 멤버 표(생김새 아이콘·상태·일정 수·가입일), 이름 변경·비밀번호 초기화·삭제(인라인 확인), 백업 다운로드. 640px 미만 모바일 레이아웃(접속자 패널 하단 시트).

**Architecture:** 오버레이 컴포넌트는 props만 받는 표시용이다. 데이터와 핸들러는 cw 소유 `useOverlayProps()`(`store/overlay.ts`)가 주고 `UiRoot`는 배치만 한다(cw#3·cw#4가 훅을 채우면 그대로 살아난다). 동물 얼굴은 3D가 아닌 가벼운 SVG(`AnimalFace`). 관리자 화면은 `api.admin*`로 목록을 받아 응답으로 그 줄만 바꾼다. 테스트는 각 컴포넌트에 props를 직접 넣고, `UiRoot` 배치는 훅을 `vi.mock`해서 확인한다.

**Tech Stack:** React 19.3 · zustand 5 · vitest 5 · @testing-library/react 16 · CSS `:has()`(모바일 시트 위로 조종 바 올리기)

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
- 오버레이 컴포넌트 파일은 `apps/web/src/ui/overlay/<이름>.tsx`, 이름 있는 export, props 타입은 `ui/contracts.ts`의 것을 그대로 import한다(다시 정의하지 않는다).
- 조종 버튼·이모지 바는 `canControl`일 때만(스펙 §9). 재연결 배지는 `reconnecting`일 때만.
- 삭제 등 되돌릴 수 없는 일은 브라우저 `confirm` 대신 그 줄 안의 확인 버튼을 한 번 더 누르게 한다.

## File Structure

```
apps/web/src/ui/
├─ common/AnimalFace.tsx           SVG 동물 얼굴 (접속자 목록·관리자 표)
├─ overlay/TopBar.tsx · PresencePanel.tsx · EmoteBar.tsx · ControlButton.tsx
│          BoardPanel.tsx · ConnectionBadge.tsx · BuildingPanel.tsx
├─ overlay/overlay.css             배치·모바일 하단 시트
├─ overlay/overlay.test.tsx
├─ admin/AdminScreen.tsx · MemberRow.tsx · admin.css · admin.test.tsx
├─ testing/mockApi.ts              (수정) ADMIN_MEMBERS 픽스처
├─ store.ts                        (수정) Screen에 'admin'
├─ ScreenHost.tsx                  (수정) admin 화면
├─ account/AccountMenu.tsx         (수정) 관리자 화면 메뉴
├─ auth/AdminLoginForm.tsx         (수정) 로그인 뒤 관리자 화면 열기
├─ UiRoot.tsx                      (수정) 오버레이 배치
└─ UiRoot.overlay.test.tsx         useOverlayProps를 vi.mock한 배치 테스트
```

---

### Task 1: 오버레이 표시 컴포넌트

**Files:**

- Create: `apps/web/src/ui/common/AnimalFace.tsx`
- Create: `apps/web/src/ui/overlay/TopBar.tsx`, `PresencePanel.tsx`, `EmoteBar.tsx`, `ControlButton.tsx`, `BoardPanel.tsx`, `ConnectionBadge.tsx`, `BuildingPanel.tsx`, `overlay.css`
- Test: `apps/web/src/ui/overlay/overlay.test.tsx`

**Interfaces:**

- Consumes: `TopBarProps`, `PresencePanelProps`, `PresenceEntry`, `EmoteBarProps`, `ControlButtonProps`, `BoardPanelProps`, `ConnectionBadgeProps`, `BuildingPanelProps` (`ui/contracts.ts`), `EMOJIS`, `resolveColor`, `CharacterLook`, `ANIMAL_LABELS`
- Produces:
  - `AnimalFace({ look: CharacterLook; size?: number })` — `role="img"`, `aria-label`=동물 이름
  - `TopBar(props: TopBarProps)` — "🐾 4thIS-world" + `aria-label="지금 시각"`인 `수 14:10 ☀️`(clock이 비면 숨김)
  - `PresencePanel(props)` — `aside[aria-label=접속자]`, 머리 버튼 `접속 중 n`(aria-expanded, onToggle), 이름 버튼(onSelect(id)), `(나)`, `🎮 조종` 또는 상태, `👀 구경 중 n`. 640px 미만은 하단 시트
  - `EmoteBar(props)` — `group[aria-label=이모지 반응]`에 8개 버튼
  - `ControlButton(props)` — `🎮 조종하기` / `🤖 자동으로`
  - `BoardPanel(props)` — `region[aria-label=외부 일정 게시판]`, `이름 · 제목 (~HH:MM)`, 빈 안내
  - `ConnectionBadge(props)` — `reconnecting`일 때만 `재연결 중…`(role=status)
  - `BuildingPanel(props)` — `region[aria-label=○○ 정보]`, `전체`·`1F`… 칩(onFloor), 층 순 사람 목록

- [ ] **Step 1: 브랜치 준비**

```bash
git fetch origin && git checkout th && git merge origin/main
npm install
```

- [ ] **Step 2: 실패하는 테스트 작성**

`apps/web/src/ui/overlay/overlay.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PresenceEntry } from '../contracts';
import { BoardPanel } from './BoardPanel';
import { BuildingPanel } from './BuildingPanel';
import { ConnectionBadge } from './ConnectionBadge';
import { ControlButton } from './ControlButton';
import { EmoteBar } from './EmoteBar';
import { PresencePanel } from './PresencePanel';
import { TopBar } from './TopBar';

afterEach(cleanup);

const ENTRIES: PresenceEntry[] = [
  {
    id: 'm1',
    username: '철수',
    look: { animal: 'dog', color: 'default', head: 'none', eyes: 'glasses', neck: 'none' },
    status: '공강',
    controlling: false,
    isMe: true,
  },
  {
    id: 'm2',
    username: '지우',
    look: { animal: 'duck', color: 'sky', head: 'cap', eyes: 'none', neck: 'none' },
    status: '2학년 강의',
    controlling: true,
    isMe: false,
  },
];

describe('TopBar', () => {
  it('로고·시각·하늘 아이콘', () => {
    render(<TopBar clock="수 14:10" skyIcon="☀️" />);
    expect(screen.getByText('🐾 4thIS-world')).toBeTruthy();
    expect(screen.getByLabelText('지금 시각').textContent).toBe('수 14:10 ☀️');
  });
});

describe('PresencePanel', () => {
  const props = {
    entries: ENTRIES,
    spectators: 2,
    collapsed: false,
    onToggle: vi.fn(),
    onSelect: vi.fn(),
  };

  it('접속자 수, 동물 얼굴, 조종 표시, 구경 수', () => {
    render(<PresencePanel {...props} />);
    expect(screen.getByRole('button', { name: /접속 중 2/ })).toBeTruthy();
    const items = screen.getAllByRole('listitem');
    expect(within(items[0]!).getByRole('img', { name: '강아지' })).toBeTruthy();
    expect(items[0]!.textContent).toContain('(나)');
    expect(items[0]!.textContent).toContain('공강');
    expect(items[1]!.textContent).toContain('🎮 조종');
    expect(screen.getByText('👀 구경 중 2')).toBeTruthy();
  });

  it('이름을 누르면 onSelect, 머리를 누르면 onToggle', () => {
    render(<PresencePanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /지우/ }));
    expect(props.onSelect).toHaveBeenCalledWith('m2');
    fireEvent.click(screen.getByRole('button', { name: /접속 중/ }));
    expect(props.onToggle).toHaveBeenCalled();
  });

  it('접으면 목록을 숨긴다', () => {
    render(<PresencePanel {...props} collapsed />);
    expect(screen.queryByRole('list')).toBeNull();
    expect(screen.getByRole('button', { name: /접속 중 2/ }).getAttribute('aria-expanded')).toBe(
      'false',
    );
  });
});

describe('EmoteBar', () => {
  it('8개 버튼, 누르면 그 이모지', () => {
    const onEmote = vi.fn();
    render(<EmoteBar disabled={false} onEmote={onEmote} />);
    expect(screen.getAllByRole('button')).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: '🎉' }));
    expect(onEmote).toHaveBeenCalledWith('🎉');
  });

  it('비활성이면 누를 수 없다', () => {
    const onEmote = vi.fn();
    render(<EmoteBar disabled onEmote={onEmote} />);
    fireEvent.click(screen.getByRole('button', { name: '👋' }));
    expect(onEmote).not.toHaveBeenCalled();
  });
});

describe('ControlButton', () => {
  it('조종 전에는 조종하기, 중에는 자동으로', () => {
    const onStart = vi.fn();
    const onStop = vi.fn();
    const { rerender } = render(
      <ControlButton controlling={false} disabled={false} onStart={onStart} onStop={onStop} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '🎮 조종하기' }));
    expect(onStart).toHaveBeenCalled();
    rerender(<ControlButton controlling disabled={false} onStart={onStart} onStop={onStop} />);
    fireEvent.click(screen.getByRole('button', { name: '🤖 자동으로' }));
    expect(onStop).toHaveBeenCalled();
  });
});

describe('BoardPanel', () => {
  it('외부 일정 목록과 빈 안내', () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <BoardPanel
        entries={[{ memberId: 'm2', username: '지우', title: '알바', until: '18:00' }]}
        onClose={onClose}
      />,
    );
    expect(screen.getByRole('listitem').textContent).toBe('지우 · 알바 (~18:00)');
    fireEvent.click(screen.getByRole('button', { name: '게시판 닫기' }));
    expect(onClose).toHaveBeenCalled();
    rerender(<BoardPanel entries={[]} onClose={onClose} />);
    expect(screen.getByText(/외부 일정 중인 사람이 없어요/)).toBeTruthy();
  });
});

describe('ConnectionBadge', () => {
  it('끊겼을 때만 보인다', () => {
    const { rerender } = render(<ConnectionBadge state="connected" />);
    expect(screen.queryByRole('status')).toBeNull();
    rerender(<ConnectionBadge state="reconnecting" />);
    expect(screen.getByRole('status').textContent).toBe('재연결 중…');
  });
});

describe('BuildingPanel', () => {
  const props = {
    building: 'eng' as const,
    name: '공학관',
    floors: 3,
    hiddenAboveFloor: null,
    onFloor: vi.fn(),
    people: [
      { id: 'm2', username: '지우', status: '3학년 강의', floor: 3 },
      { id: 'm1', username: '철수', status: '1학년 강의', floor: 1 },
    ],
    onClose: vi.fn(),
  };

  it('층 버튼으로 위층을 숨긴다', () => {
    render(<BuildingPanel {...props} />);
    expect(screen.getByRole('button', { name: '전체' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: '2F' }));
    expect(props.onFloor).toHaveBeenCalledWith(2);
    fireEvent.click(screen.getByRole('button', { name: '전체' }));
    expect(props.onFloor).toHaveBeenCalledWith(null);
  });

  it('사람을 층 순서로 보여 준다', () => {
    render(<BuildingPanel {...props} />);
    const items = screen.getAllByRole('listitem').map((li) => li.textContent);
    expect(items).toEqual(['1F 철수 · 1학년 강의', '3F 지우 · 3학년 강의']);
  });

  it('1층 건물은 층 버튼이 없고, 빈 건물은 안내', () => {
    render(<BuildingPanel {...props} floors={1} people={[]} />);
    expect(screen.queryByRole('button', { name: '전체' })).toBeNull();
    expect(screen.getByText('지금 이 건물에 아무도 없어요.')).toBeTruthy();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -w @4this/web -- overlay`
Expected: FAIL — `Failed to resolve import "./BoardPanel"`

- [ ] **Step 4: SVG 동물 얼굴**

`apps/web/src/ui/common/AnimalFace.tsx`:

```tsx
import { resolveColor } from '@4this/shared';
import type { CharacterLook } from '../../world/contracts';
import { ANIMAL_LABELS } from '../../world/characters/labels';

const INK = '#4a3a45';

/** 동물별 귀·부리·갈기 (얼굴 뒤에 깔리는 것과 앞에 붙는 것) */
function Back({ look, fur }: { look: CharacterLook; fur: string }) {
  switch (look.animal) {
    case 'dog':
      return (
        <>
          <ellipse cx="7" cy="17" rx="5" ry="9" fill={fur} style={{ filter: 'brightness(0.85)' }} />
          <ellipse
            cx="33"
            cy="17"
            rx="5"
            ry="9"
            fill={fur}
            style={{ filter: 'brightness(0.85)' }}
          />
        </>
      );
    case 'cat':
      return (
        <>
          <path d="M8 14 L10 2 L18 9 Z" fill={fur} />
          <path d="M32 14 L30 2 L22 9 Z" fill={fur} />
        </>
      );
    case 'bear':
      return (
        <>
          <circle cx="9" cy="9" r="5" fill={fur} />
          <circle cx="31" cy="9" r="5" fill={fur} />
        </>
      );
    case 'lion':
      return (
        <circle cx="20" cy="21" r="19" fill="#e8a35f" stroke="#e8a35f" strokeDasharray="3 2" />
      );
    case 'duck':
      return null;
  }
}

/** 접속자 목록·관리자 표에 쓰는 작은 동물 얼굴 (SVG, 3D 아님) */
export function AnimalFace({ look, size = 28 }: { look: CharacterLook; size?: number }) {
  const fur = resolveColor(look.animal, look.color);
  return (
    <svg
      className="ui-face"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={ANIMAL_LABELS[look.animal]}
    >
      <Back look={look} fur={fur} />
      <circle cx="20" cy="22" r="14" fill={fur} />
      <circle cx="15" cy="21" r="1.8" fill={INK} />
      <circle cx="25" cy="21" r="1.8" fill={INK} />
      <circle cx="12" cy="26" r="2.2" fill="#ffb3c7" opacity="0.8" />
      <circle cx="28" cy="26" r="2.2" fill="#ffb3c7" opacity="0.8" />
      {look.animal === 'duck' ? (
        <ellipse cx="20" cy="27" rx="5" ry="2.5" fill="#ffb37a" />
      ) : (
        <ellipse cx="20" cy="26" rx="1.8" ry="1.3" fill={look.animal === 'cat' ? '#ff9fb6' : INK} />
      )}
      {look.eyes !== 'none' && (
        <g
          fill={look.eyes === 'sunglasses' ? '#4f4766' : 'none'}
          stroke={look.eyes === 'sunglasses' ? '#4f4766' : '#9b86c9'}
          strokeWidth="1.2"
        >
          <circle cx="15" cy="21" r="3.6" />
          <circle cx="25" cy="21" r="3.6" />
        </g>
      )}
    </svg>
  );
}
```

- [ ] **Step 5: 컴포넌트 7개와 스타일**

`apps/web/src/ui/overlay/TopBar.tsx`:

```tsx
import type { TopBarProps } from '../contracts';

/** 왼쪽 위: 로고 · 요일과 시각 · 하늘 아이콘 */
export function TopBar({ clock, skyIcon }: TopBarProps) {
  return (
    <header className="ov-topbar ui-card">
      <b className="ov-topbar__logo">🐾 4thIS-world</b>
      {clock && (
        <span className="ov-topbar__clock" aria-label="지금 시각">
          {clock} {skyIcon}
        </span>
      )}
    </header>
  );
}
```

`apps/web/src/ui/overlay/PresencePanel.tsx`:

```tsx
import { AnimalFace } from '../common/AnimalFace';
import type { PresencePanelProps } from '../contracts';

/**
 * 접속자 패널. 이름을 누르면 카메라가 그 캐릭터로 간다(onSelect).
 * 데스크톱은 오른쪽 카드, 640px 미만은 화면 아래 시트(overlay.css)
 */
export function PresencePanel({
  entries,
  spectators,
  collapsed,
  onToggle,
  onSelect,
}: PresencePanelProps) {
  return (
    <aside
      className={collapsed ? 'ov-presence ui-card ov-presence--collapsed' : 'ov-presence ui-card'}
      aria-label="접속자"
    >
      <button
        type="button"
        className="ov-presence__head"
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <span>접속 중 {entries.length}</span>
        <span aria-hidden="true">{collapsed ? '▴' : '▾'}</span>
      </button>
      {!collapsed && (
        <>
          <ul className="ov-presence__list">
            {entries.map((e) => (
              <li key={e.id}>
                <button type="button" className="ov-presence__item" onClick={() => onSelect(e.id)}>
                  <AnimalFace look={e.look} size={26} />
                  <span className="ov-presence__name">
                    {e.username}
                    {e.isMe && <small> (나)</small>}
                  </span>
                  <span className="ov-presence__status">
                    {e.controlling ? '🎮 조종' : e.status}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="ov-presence__spectators">👀 구경 중 {spectators}</p>
        </>
      )}
    </aside>
  );
}
```

`apps/web/src/ui/overlay/EmoteBar.tsx`:

```tsx
import { EMOJIS } from '@4this/shared';
import type { EmoteBarProps } from '../contracts';

/** 이모지 반응 8개 (설계 문서 §6.3) */
export function EmoteBar({ disabled, onEmote }: EmoteBarProps) {
  return (
    <div className="ov-emotes ui-card" role="group" aria-label="이모지 반응">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="ov-emote"
          disabled={disabled}
          onClick={() => onEmote(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
```

`apps/web/src/ui/overlay/ControlButton.tsx`:

```tsx
import type { ControlButtonProps } from '../contracts';

/** 내 캐릭터 직접 조종 시작 / 자동으로 돌아가기 */
export function ControlButton({ controlling, disabled, onStart, onStop }: ControlButtonProps) {
  return controlling ? (
    <button type="button" className="ui-btn ov-control" disabled={disabled} onClick={onStop}>
      🤖 자동으로
    </button>
  ) : (
    <button
      type="button"
      className="ui-btn ui-btn--primary ov-control"
      disabled={disabled}
      onClick={onStart}
    >
      🎮 조종하기
    </button>
  );
}
```

`apps/web/src/ui/overlay/BoardPanel.tsx`:

```tsx
import type { BoardPanelProps } from '../contracts';

/** 정문 게시판: 지금 외부 일정 중인 사람 (설계 문서 §7.2-4) */
export function BoardPanel({ entries, onClose }: BoardPanelProps) {
  return (
    <section className="ov-side ui-card" aria-label="외부 일정 게시판">
      <header className="ov-side__head">
        <b>📋 외부 일정 게시판</b>
        <button type="button" className="ui-icon-btn" aria-label="게시판 닫기" onClick={onClose}>
          ✕
        </button>
      </header>
      {entries.length === 0 ? (
        <p className="ui-note">지금은 외부 일정 중인 사람이 없어요.</p>
      ) : (
        <ul className="ov-side__list">
          {entries.map((e) => (
            <li key={e.memberId}>
              <b>{e.username}</b> · {e.title} <small>(~{e.until})</small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

`apps/web/src/ui/overlay/ConnectionBadge.tsx`:

```tsx
import type { ConnectionBadgeProps } from '../contracts';

/** 소켓이 끊겼을 때만 보이는 배지 (설계 문서 §10) */
export function ConnectionBadge({ state }: ConnectionBadgeProps) {
  if (state === 'connected') return null;
  return (
    <span className="ov-badge" role="status">
      재연결 중…
    </span>
  );
}
```

`apps/web/src/ui/overlay/BuildingPanel.tsx`:

```tsx
import type { BuildingPanelProps } from '../contracts';

/** 건물을 눌렀을 때: 층 버튼(위층 숨기기) + 지금 이 건물에 있는 사람 (설계 문서 §5.3) */
export function BuildingPanel({
  name,
  floors,
  hiddenAboveFloor,
  onFloor,
  people,
  onClose,
}: BuildingPanelProps) {
  const floorList = Array.from({ length: floors }, (_, i) => i + 1);
  const sorted = [...people].sort(
    (a, b) => a.floor - b.floor || a.username.localeCompare(b.username),
  );

  return (
    <section className="ov-side ui-card" aria-label={`${name} 정보`}>
      <header className="ov-side__head">
        <b>🏫 {name}</b>
        <button type="button" className="ui-icon-btn" aria-label="건물 닫기" onClick={onClose}>
          ✕
        </button>
      </header>
      {floors > 1 && (
        <div className="ui-row" role="group" aria-label="층 보기">
          <button
            type="button"
            className="ui-chip"
            aria-pressed={hiddenAboveFloor === null}
            onClick={() => onFloor(null)}
          >
            전체
          </button>
          {floorList.map((f) => (
            <button
              key={f}
              type="button"
              className="ui-chip"
              aria-pressed={hiddenAboveFloor === f}
              onClick={() => onFloor(f)}
            >
              {f}F
            </button>
          ))}
        </div>
      )}
      {sorted.length === 0 ? (
        <p className="ui-note">지금 이 건물에 아무도 없어요.</p>
      ) : (
        <ul className="ov-side__list">
          {sorted.map((p) => (
            <li key={p.id}>
              <small>{p.floor}F</small> <b>{p.username}</b> · {p.status}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

`apps/web/src/ui/overlay/overlay.css`:

```css
/* 메인 오버레이: 상단 바, 접속자 패널, 옆 패널(건물·게시판), 아래 조종·이모지 바 */

/* 계정 메뉴 드롭다운은 접속자 패널 위, 모달은 그보다 위 */
.ui-top-right {
  z-index: 5;
}

.ui-backdrop {
  z-index: 10;
}

.ov-topbar {
  position: absolute;
  top: 14px;
  left: 16px;
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px 16px;
  font-size: 14px;
}

.ov-topbar__clock {
  color: var(--ink-soft);
  font-weight: 600;
}

.ov-badge {
  align-self: center;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--lemon);
  font-size: 12px;
  font-weight: 700;
  box-shadow: var(--shadow);
}

/* 접속자 패널 */
.ov-presence {
  position: absolute;
  top: 64px;
  right: 16px;
  width: 230px;
  max-height: calc(100% - 160px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ov-presence__head {
  display: flex;
  justify-content: space-between;
  padding: 12px 16px;
  border: none;
  background: none;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
  cursor: pointer;
}

.ov-presence__list {
  flex: 1;
  margin: 0;
  padding: 0 8px;
  list-style: none;
  overflow-y: auto;
}

.ov-presence__item {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  font: inherit;
  font-size: 13px;
  color: var(--ink);
  text-align: left;
  cursor: pointer;
}

.ov-presence__item:hover {
  background: #f8f1fc;
}

.ov-presence__name {
  font-weight: 700;
  white-space: nowrap;
}

.ov-presence__status {
  flex: 1;
  overflow: hidden;
  color: var(--ink-soft);
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ov-presence__spectators {
  margin: 0;
  padding: 8px 16px 12px;
  font-size: 13px;
  color: var(--ink-soft);
}

.ui-face {
  flex: none;
}

/* 건물·게시판 패널 (왼쪽) */
.ov-side {
  position: absolute;
  top: 64px;
  left: 16px;
  width: 260px;
  display: grid;
  gap: 10px;
  padding: 12px 16px 16px;
}

.ov-side + .ov-side {
  top: auto;
  bottom: 96px;
}

.ov-side__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ov-side__list {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 13px;
}

/* 아래 가운데: 조종 버튼 + 이모지 바 */
.ov-bottom {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  align-items: center;
}

.ov-control {
  padding: 12px 20px;
  font-size: 15px;
  white-space: nowrap;
}

.ov-emotes {
  display: flex;
  gap: 2px;
  padding: 6px 10px;
  border-radius: 999px;
}

.ov-emote {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 50%;
  background: none;
  font-size: 20px;
  cursor: pointer;
  transition: transform 0.12s;
}

.ov-emote:hover:not(:disabled) {
  transform: scale(1.2);
}

.ov-emote:disabled {
  opacity: 0.4;
  cursor: default;
}

/* 모바일: 접속자 패널은 하단 시트, 조종·이모지는 그 위 */
@media (max-width: 639px) {
  .ov-topbar {
    top: 10px;
    left: 10px;
    padding: 6px 12px;
    font-size: 13px;
  }

  .ov-topbar__logo {
    display: none;
  }

  .ov-presence {
    top: auto;
    right: 0;
    bottom: 0;
    left: 0;
    width: auto;
    max-height: 34vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }

  .ov-presence--collapsed {
    max-height: 48px;
  }

  /* 시트가 펼쳐져 있으면 그 위로, 접혀 있으면 머리줄 위로 */
  .ov-bottom {
    bottom: 58px;
    left: 8px;
    right: 8px;
    transform: none;
    flex-direction: column;
  }

  .ui-root:has(.ov-presence:not(.ov-presence--collapsed)) .ov-bottom {
    bottom: calc(34vh + 10px);
  }

  .ov-emotes {
    max-width: 100%;
    overflow-x: auto;
  }

  .ov-emote {
    width: 34px;
    height: 34px;
    font-size: 18px;
  }

  .ov-side {
    top: 58px;
    left: 10px;
    right: 10px;
    width: auto;
  }

  .ov-side + .ov-side {
    top: 200px;
    bottom: auto;
  }
}
```

- [ ] **Step 6: 통과 확인**

Run: `npm test -w @4this/web -- overlay && npm run typecheck -w @4this/web`
Expected: PASS — 12개, 타입 에러 0

- [ ] **Step 7: 커밋**

```bash
git add apps/web/src/ui/common/AnimalFace.tsx apps/web/src/ui/overlay
git commit -m "feat: 오버레이 표시 컴포넌트 7종과 SVG 동물 얼굴"
```

---

### Task 2: 관리자 화면

**Files:**

- Create: `apps/web/src/ui/admin/MemberRow.tsx`, `apps/web/src/ui/admin/AdminScreen.tsx`, `apps/web/src/ui/admin/admin.css`
- Modify: `apps/web/src/ui/store.ts`, `apps/web/src/ui/testing/mockApi.ts`
- Test: `apps/web/src/ui/admin/admin.test.tsx`

**Interfaces:**

- Consumes: `api.adminMembers/adminApprove/adminReject/adminPatch/adminDelete`, `api.backupUrl`, `AdminMember`, `UsernameSchema`, `PasswordSchema`, `kstDate`, `AnimalFace`, `Modal`, `errorMessage`
- Produces:
  - `type Screen = 'login' | 'signup' | 'adminLogin' | 'customize' | 'schedule' | 'admin'`
  - `ADMIN_MEMBERS: AdminMember[]` 픽스처(대기 `철수` m1, 승인 `지우` m2)
  - `STATUS_LABELS`, `MemberRow({ member, onUpdated, onDeleted })` — `이름 변경`/`비밀번호 초기화`(입력 + `확인`·`취소`, 스키마 검증), `삭제`(→ "○○님을 정말 삭제할까요?" + `삭제 확인`·`취소`)
  - `AdminScreen()` — 관리자가 아니면 안내만. `승인 대기 n` 배지, 대기 목록(`승인`·`거절`), `💾 백업 다운로드` 링크(`href={api.backupUrl}` + `download`), 멤버 표

- [ ] **Step 1: 스토어·픽스처 수정**

`apps/web/src/ui/store.ts`의 `Screen` 한 줄:

old:

```ts
export type Screen = 'login' | 'signup' | 'adminLogin' | 'customize' | 'schedule';
```

new:

```ts
export type Screen = 'login' | 'signup' | 'adminLogin' | 'customize' | 'schedule' | 'admin';
```

`apps/web/src/ui/testing/mockApi.ts` — 파일 전체 (import에 AdminMember, 끝에 ADMIN_MEMBERS 추가):

```ts
import { vi } from 'vitest';
import type { AdminMember, Me } from '@4this/shared';

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

export const ADMIN_MEMBERS: AdminMember[] = [
  { ...ME_PENDING, createdAt: Date.parse('2026-10-20T10:00:00+09:00'), scheduleCount: 0 },
  {
    id: 'm2',
    username: '지우',
    status: 'approved',
    look: { animal: 'duck', color: 'sky', head: 'cap', eyes: 'none', neck: 'none' },
    createdAt: Date.parse('2026-10-01T09:00:00+09:00'),
    scheduleCount: 5,
  },
];
```

- [ ] **Step 2: 실패하는 테스트 작성**

`apps/web/src/ui/admin/admin.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '../../store/session';
import { useUi } from '../store';
import { ADMIN_MEMBERS, apiError, mockApi } from '../testing/mockApi';
import { AdminScreen } from './AdminScreen';

const [PENDING, APPROVED] = ADMIN_MEMBERS as [(typeof ADMIN_MEMBERS)[0], (typeof ADMIN_MEMBERS)[0]];

beforeEach(() => {
  useSession.setState({ session: { kind: 'admin' }, loading: false });
  useUi.getState().open('admin');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function renderLoaded(extra: Parameters<typeof mockApi>[0] = {}) {
  const api = mockApi({ 'GET /api/admin/members': { body: { members: ADMIN_MEMBERS } }, ...extra });
  render(<AdminScreen />);
  await screen.findByRole('table');
  return api;
}

const row = (name: string) => screen.getByRole('cell', { name }).closest('tr')!;

describe('AdminScreen', () => {
  it('승인 대기 배지·목록과 멤버 표', async () => {
    await renderLoaded();
    expect(screen.getByRole('heading', { name: /승인 대기/ }).textContent).toBe('승인 대기 1');
    const pending = screen.getByRole('list', { name: '승인 대기 목록' });
    expect(within(pending).getByText('철수')).toBeTruthy();
    expect(within(pending).getByText('2026-10-20 가입')).toBeTruthy();
    const r = within(row('지우'));
    expect(r.getByRole('img', { name: '오리' })).toBeTruthy();
    expect(r.getByText('승인')).toBeTruthy();
    expect(r.getByText('5')).toBeTruthy();
    expect(r.getByText('2026-10-01')).toBeTruthy();
    expect(screen.getByRole('link', { name: /백업 다운로드/ }).getAttribute('href')).toBe(
      '/api/admin/backup',
    );
  });

  it('승인하면 대기 목록에서 빠진다', async () => {
    const { calls } = await renderLoaded({
      'POST /api/admin/members/m1/approve': { body: { ...PENDING, status: 'approved' } },
    });
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    expect(await screen.findByText('기다리는 가입이 없어요.')).toBeTruthy();
    expect(calls[1]?.url).toBe('/api/admin/members/m1/approve');
  });

  it('거절', async () => {
    await renderLoaded({
      'POST /api/admin/members/m1/reject': { body: { ...PENDING, status: 'rejected' } },
    });
    fireEvent.click(screen.getByRole('button', { name: '거절' }));
    expect(await within(row('철수')).findByText('거절')).toBeTruthy();
  });

  it('이름 변경: 검증 후 PATCH', async () => {
    const { calls } = await renderLoaded({
      'PATCH /api/admin/members/m2': (body) => ({ body: { ...APPROVED, ...(body as object) } }),
    });
    fireEvent.click(within(row('지우')).getByRole('button', { name: '이름 변경' }));
    const input = screen.getByLabelText('새 이름');
    fireEvent.change(input, { target: { value: '지' } });
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(screen.getByRole('alert').textContent).toBe('2자 이상');
    fireEvent.change(input, { target: { value: '지우우' } });
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByRole('cell', { name: '지우우' })).toBeTruthy();
    expect(calls[1]?.body).toEqual({ username: '지우우' });
  });

  it('비밀번호 초기화', async () => {
    const { calls } = await renderLoaded({ 'PATCH /api/admin/members/m2': { body: APPROVED } });
    fireEvent.click(within(row('지우')).getByRole('button', { name: '비밀번호 초기화' }));
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'newpass1' } });
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByText(/새 비밀번호로 바꿨어요/)).toBeTruthy();
    expect(calls[1]?.body).toEqual({ newPassword: 'newpass1' });
  });

  it('삭제는 인라인 확인을 한 번 더 누른다', async () => {
    const { calls } = await renderLoaded({
      'DELETE /api/admin/members/m2': { body: { ok: true } },
    });
    fireEvent.click(within(row('지우')).getByRole('button', { name: '삭제' }));
    expect(screen.getByText('지우님을 정말 삭제할까요?')).toBeTruthy();
    expect(calls).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(within(row('지우')).getByRole('button', { name: '삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }));
    await vi.waitFor(() => expect(screen.queryByRole('cell', { name: '지우' })).toBeNull());
    expect(calls[1]).toMatchObject({ method: 'DELETE', url: '/api/admin/members/m2' });
  });

  it('실패하면 알려 준다', async () => {
    await renderLoaded({
      'PATCH /api/admin/members/m2': apiError(409, 'username_taken'),
    });
    fireEvent.click(within(row('지우')).getByRole('button', { name: '이름 변경' }));
    fireEvent.change(screen.getByLabelText('새 이름'), { target: { value: '철수' } });
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect((await screen.findByRole('alert')).textContent).toContain('이미 쓰고 있는 이름');
  });

  it('관리자가 아니면 안내만', () => {
    useSession.setState({ session: { kind: 'guest' } });
    render(<AdminScreen />);
    expect(screen.getByText('관리자로 로그인해야 볼 수 있어요.')).toBeTruthy();
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -w @4this/web -- admin.test`
Expected: FAIL — `Failed to resolve import "./AdminScreen"`

- [ ] **Step 4: 구현**

`apps/web/src/ui/admin/MemberRow.tsx`:

```tsx
import { useState } from 'react';
import { kstDate, PasswordSchema, UsernameSchema, type AdminMember } from '@4this/shared';
import { api } from '../../api/endpoints';
import { AnimalFace } from '../common/AnimalFace';
import { errorMessage } from '../errors';

export const STATUS_LABELS: Record<AdminMember['status'], string> = {
  pending: '승인 대기',
  approved: '승인',
  rejected: '거절',
};

type Mode = 'view' | 'rename' | 'password' | 'delete';

interface MemberRowProps {
  member: AdminMember;
  onUpdated: (member: AdminMember) => void;
  onDeleted: (id: string) => void;
}

/**
 * 멤버 표의 한 줄. 이름 변경·비밀번호 초기화·삭제는 그 줄 안에서 펼쳐
 * 확인 버튼을 한 번 더 누르게 한다(브라우저 confirm 대신).
 */
export function MemberRow({ member, onUpdated, onDeleted }: MemberRowProps) {
  const [mode, setMode] = useState<Mode>('view');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = (next: Mode) => {
    setMode(next);
    setValue(next === 'rename' ? member.username : '');
    setError(null);
    setNotice(null);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setMode('view');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (mode === 'rename') {
      const parsed = UsernameSchema.safeParse(value);
      if (!parsed.success) return setError(parsed.error.issues[0]!.message);
      return run(async () => onUpdated(await api.adminPatch(member.id, { username: parsed.data })));
    }
    if (mode === 'password') {
      const parsed = PasswordSchema.safeParse(value);
      if (!parsed.success) return setError(parsed.error.issues[0]!.message);
      return run(async () => {
        onUpdated(await api.adminPatch(member.id, { newPassword: parsed.data }));
        setNotice('새 비밀번호로 바꿨어요. 본인에게 알려 주세요.');
      });
    }
    if (mode === 'delete') {
      return run(async () => {
        await api.adminDelete(member.id);
        onDeleted(member.id);
      });
    }
  };

  return (
    <tr>
      <td>
        <AnimalFace look={member.look} size={30} />
      </td>
      <td className="adm-name">{member.username}</td>
      <td>
        <span className={`adm-status adm-status--${member.status}`}>
          {STATUS_LABELS[member.status]}
        </span>
      </td>
      <td>{member.scheduleCount}</td>
      <td>{kstDate(member.createdAt)}</td>
      <td className="adm-actions">
        {mode === 'view' ? (
          <div className="ui-row">
            <button type="button" className="ui-btn ui-btn--small" onClick={() => start('rename')}>
              이름 변경
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--small"
              onClick={() => start('password')}
            >
              비밀번호 초기화
            </button>
            <button type="button" className="ui-btn ui-btn--small" onClick={() => start('delete')}>
              삭제
            </button>
          </div>
        ) : (
          <div className="ui-row">
            {mode === 'delete' ? (
              <span className="adm-confirm">{member.username}님을 정말 삭제할까요?</span>
            ) : (
              <input
                className="ui-input adm-input"
                aria-label={mode === 'rename' ? '새 이름' : '새 비밀번호'}
                type={mode === 'password' ? 'password' : 'text'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
              />
            )}
            <button
              type="button"
              className={
                mode === 'delete'
                  ? 'ui-btn ui-btn--small ui-btn--danger'
                  : 'ui-btn ui-btn--small ui-btn--primary'
              }
              disabled={busy}
              onClick={() => void confirm()}
            >
              {mode === 'delete' ? '삭제 확인' : '확인'}
            </button>
            <button type="button" className="ui-btn ui-btn--small" onClick={() => start('view')}>
              취소
            </button>
          </div>
        )}
        {error && (
          <p className="ui-field__error" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="ui-note">{notice}</p>}
      </td>
    </tr>
  );
}
```

`apps/web/src/ui/admin/AdminScreen.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { kstDate, type AdminMember } from '@4this/shared';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { AnimalFace } from '../common/AnimalFace';
import { Modal } from '../common/Modal';
import { errorMessage } from '../errors';
import { useUi } from '../store';
import { MemberRow } from './MemberRow';
import './admin.css';

/** 관리자 화면: 승인 대기(배지)·멤버 관리·백업 (설계 문서 §9) */
export function AdminScreen() {
  const isAdmin = useSession((s) => s.session.kind === 'admin');
  const close = useUi((s) => s.close);
  const [members, setMembers] = useState<AdminMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    api
      .adminMembers()
      .then((res) => alive && setMembers(res.members))
      .catch((err: unknown) => alive && setError(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Modal title="관리자" onClose={close}>
        <p className="ui-note">관리자로 로그인해야 볼 수 있어요.</p>
      </Modal>
    );
  }

  const replace = (m: AdminMember) =>
    setMembers((list) => list?.map((x) => (x.id === m.id ? m : x)) ?? null);
  const remove = (id: string) => setMembers((list) => list?.filter((x) => x.id !== id) ?? null);

  const decide = async (id: string, approve: boolean) => {
    setError(null);
    try {
      replace(await (approve ? api.adminApprove(id) : api.adminReject(id)));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const pending = members?.filter((m) => m.status === 'pending') ?? [];

  return (
    <Modal title="관리자" onClose={close} wide>
      <div className="ui-form">
        <div className="ui-row ui-row--between">
          <h3 className="adm-title">
            승인 대기 <span className="adm-badge">{pending.length}</span>
          </h3>
          <a className="ui-btn ui-btn--small" href={api.backupUrl} download>
            💾 백업 다운로드
          </a>
        </div>
        {error && (
          <p className="ui-alert" role="alert">
            {error}
          </p>
        )}
        {members === null ? (
          !error && <p className="ui-note">불러오는 중…</p>
        ) : (
          <>
            {pending.length === 0 ? (
              <p className="ui-note">기다리는 가입이 없어요.</p>
            ) : (
              <ul className="adm-pending" aria-label="승인 대기 목록">
                {pending.map((m) => (
                  <li key={m.id} className="adm-pending__item">
                    <AnimalFace look={m.look} size={30} />
                    <b>{m.username}</b>
                    <small>{kstDate(m.createdAt)} 가입</small>
                    <span className="adm-spacer" />
                    <button
                      type="button"
                      className="ui-btn ui-btn--small ui-btn--primary"
                      onClick={() => void decide(m.id, true)}
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      className="ui-btn ui-btn--small"
                      onClick={() => void decide(m.id, false)}
                    >
                      거절
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="adm-title">멤버 {members.length}</h3>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>생김새</th>
                    <th>이름</th>
                    <th>상태</th>
                    <th>일정</th>
                    <th>가입일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <MemberRow key={m.id} member={m} onUpdated={replace} onDeleted={remove} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
```

`apps/web/src/ui/admin/admin.css`:

```css
/* 관리자 화면 */

.adm-title {
  margin: 0;
  font-size: 15px;
}

.adm-badge {
  display: inline-block;
  min-width: 22px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--pink);
  color: #fff;
  font-size: 12px;
  text-align: center;
}

a.ui-btn {
  text-decoration: none;
}

.adm-pending {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.adm-pending__item {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  background: #fffbe0;
  font-size: 14px;
}

.adm-pending__item small {
  color: var(--ink-soft);
}

.adm-spacer {
  flex: 1;
}

.adm-table-wrap {
  overflow-x: auto;
}

.adm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.adm-table th {
  padding: 6px 8px;
  text-align: left;
  font-size: 12px;
  color: var(--ink-soft);
  border-bottom: 2px solid #f0e6f5;
}

.adm-table td {
  padding: 6px 8px;
  border-bottom: 1px solid #f6eef9;
  vertical-align: middle;
}

.adm-name {
  font-weight: 700;
  white-space: nowrap;
}

.adm-status {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  white-space: nowrap;
}

.adm-status--pending {
  background: var(--lemon);
}

.adm-status--approved {
  background: #cdeedd;
}

.adm-status--rejected {
  background: #ffd6de;
}

.adm-actions {
  min-width: 260px;
}

.adm-table .adm-input {
  width: 140px;
  padding: 5px 8px;
}

.adm-confirm {
  color: #c24766;
  font-weight: 600;
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm test -w @4this/web -- admin.test && npm run typecheck -w @4this/web`
Expected: PASS — 8개, 타입 에러 0

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/ui/store.ts apps/web/src/ui/testing/mockApi.ts apps/web/src/ui/admin
git commit -m "feat: 관리자 화면 (승인 대기·멤버 관리·백업)"
```

---

### Task 3: UiRoot 배치와 관리자 진입 연결

**Files:**

- Modify: `apps/web/src/ui/UiRoot.tsx`, `apps/web/src/ui/ScreenHost.tsx`, `apps/web/src/ui/account/AccountMenu.tsx`, `apps/web/src/ui/auth/AdminLoginForm.tsx`
- Test: `apps/web/src/ui/UiRoot.overlay.test.tsx` (새 파일), `apps/web/src/ui/UiRoot.test.tsx`·`apps/web/src/ui/auth/auth.test.tsx` (수정)

**Interfaces:**

- Consumes: `useOverlayProps(): OverlayProps` (cw 소유 `store/overlay.ts` — 고치지 않는다), Task 1·2
- Produces:
  - `UiRoot()` 배치: 왼쪽 위 `TopBar`, 오른쪽 위 `ConnectionBadge` + 계정 메뉴, 배너, 오른쪽 `PresencePanel`, 왼쪽 `BuildingPanel`(있을 때)·`BoardPanel`(있을 때), 아래 가운데 `ControlButton` + `EmoteBar`(`canControl`일 때), 모달
  - 관리자 메뉴 `관리자 화면` → `open('admin')`, 관리자 로그인 성공 → `open('admin')`

- [ ] **Step 1: 실패하는 테스트 작성**

배치 테스트(새 파일):

`apps/web/src/ui/UiRoot.overlay.test.tsx`:

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useOverlayProps } from '../store/overlay';
import { useSession } from '../store/session';
import type { OverlayProps } from './contracts';
import { useUi } from './store';
import { UiRoot } from './UiRoot';

// cw의 훅은 아직 빈 값을 주므로, 여기서는 채운 값으로 바꿔 배치만 검증한다
vi.mock('../store/overlay', () => ({ useOverlayProps: vi.fn() }));

const noop = () => {};
const FULL: OverlayProps = {
  topBar: { clock: '수 14:10', skyIcon: '☀️' },
  presence: { entries: [], spectators: 3, collapsed: false, onToggle: noop, onSelect: noop },
  emoteBar: { disabled: false, onEmote: noop },
  control: { controlling: false, disabled: false, onStart: noop, onStop: noop },
  connection: { state: 'reconnecting' },
  board: { entries: [], onClose: noop },
  building: {
    building: 'main',
    name: '본관',
    floors: 3,
    hiddenAboveFloor: null,
    onFloor: noop,
    people: [],
    onClose: noop,
  },
  canControl: true,
};

beforeEach(() => {
  useSession.setState({ session: { kind: 'guest' }, loading: false });
  useUi.getState().close();
});
afterEach(cleanup);

describe('UiRoot 오버레이 배치', () => {
  it('모든 조각을 그린다', () => {
    vi.mocked(useOverlayProps).mockReturnValue(FULL);
    render(<UiRoot />);
    expect(screen.getByLabelText('지금 시각').textContent).toBe('수 14:10 ☀️');
    expect(screen.getByRole('complementary', { name: '접속자' })).toBeTruthy();
    expect(screen.getByText('👀 구경 중 3')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe('재연결 중…');
    expect(screen.getByRole('region', { name: '본관 정보' })).toBeTruthy();
    expect(screen.getByRole('region', { name: '외부 일정 게시판' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '🎮 조종하기' })).toBeTruthy();
    expect(screen.getByRole('group', { name: '이모지 반응' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '로그인' })).toBeTruthy();
  });

  it('조종 권한이 없으면 조종·이모지 바를 숨기고, 패널이 없으면 그리지 않는다', () => {
    vi.mocked(useOverlayProps).mockReturnValue({
      ...FULL,
      canControl: false,
      board: null,
      building: null,
      connection: { state: 'connected' },
    });
    render(<UiRoot />);
    expect(screen.queryByRole('button', { name: '🎮 조종하기' })).toBeNull();
    expect(screen.queryByRole('group', { name: '이모지 반응' })).toBeNull();
    expect(screen.queryByRole('region')).toBeNull();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
```

`auth.test.tsx` 전체(관리자 로그인 뒤 `screen`이 `admin`인지 확인 추가):

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
  it('성공하면 관리자 세션이 되고 관리자 화면을 연다', async () => {
    const { calls } = mockApi({ 'POST /api/auth/admin': { body: { kind: 'admin' } } });
    render(<AdminLoginForm />);
    type('관리자 비밀번호', 'secret');
    fireEvent.click(screen.getByRole('button', { name: '관리자로 들어가기' }));
    await vi.waitFor(() => expect(useSession.getState().session).toEqual({ kind: 'admin' }));
    expect(calls[0]?.body).toEqual({ password: 'secret' });
    expect(useUi.getState().screen).toBe('admin');
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

`UiRoot.test.tsx` 전체(끝에 "관리자 메뉴에서 관리자 화면을 연다" 추가):

`apps/web/src/ui/UiRoot.test.tsx`:

```tsx
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '../store/session';
import { useUi } from './store';
import { ADMIN_MEMBERS, ME_APPROVED, ME_PENDING, mockApi } from './testing/mockApi';
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

  it('가입 → 꾸미기 → 시간표 흐름', async () => {
    mockApi({
      'POST /api/auth/signup': { body: { kind: 'member', me: ME_PENDING } },
      'PATCH /api/me': (body) => ({ body: { ...ME_PENDING, ...(body as object) } }),
      'GET /api/me/schedules': { body: { items: [] } },
      'PUT /api/me/schedules': (body) => ({ body }),
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
    expect(await screen.findByRole('dialog', { name: '내 시간표' })).toBeTruthy();
    await screen.findByTestId('week-grid');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('멤버 메뉴에서 내 시간표를 연다', async () => {
    mockApi({ 'GET /api/me/schedules': { body: { items: [] } } });
    useSession.setState({ session: { kind: 'member', me: ME_APPROVED } });
    render(<UiRoot />);
    fireEvent.click(screen.getByRole('button', { name: /철수/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: '내 시간표' }));
    expect(await screen.findByTestId('week-grid')).toBeTruthy();
  });

  it('관리자 메뉴에서 관리자 화면을 연다', async () => {
    mockApi({ 'GET /api/admin/members': { body: { members: ADMIN_MEMBERS } } });
    useSession.setState({ session: { kind: 'admin' } });
    render(<UiRoot />);
    fireEvent.click(screen.getByRole('button', { name: /관리자/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: '관리자 화면' }));
    expect(await screen.findByRole('table')).toBeTruthy();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -w @4this/web -- UiRoot auth`
Expected: FAIL 3개 — 배치 테스트 "모든 조각을 그린다"(`지금 시각`을 찾지 못함), 관리자 로그인 뒤 `expected null to be 'admin'`, `관리자 화면` 메뉴 없음. (배치 테스트의 두 번째 "숨긴다" 테스트는 지금도 통과한다)

- [ ] **Step 3: 구현**

`apps/web/src/ui/UiRoot.tsx` — 파일 전체:

```tsx
import { useOverlayProps } from '../store/overlay';
import { AccountMenu } from './account/AccountMenu';
import { PendingBanner } from './account/PendingBanner';
import { BoardPanel } from './overlay/BoardPanel';
import { BuildingPanel } from './overlay/BuildingPanel';
import { ConnectionBadge } from './overlay/ConnectionBadge';
import { ControlButton } from './overlay/ControlButton';
import { EmoteBar } from './overlay/EmoteBar';
import { PresencePanel } from './overlay/PresencePanel';
import { TopBar } from './overlay/TopBar';
import { ScreenHost } from './ScreenHost';
import './ui.css';
import './overlay/overlay.css';

/**
 * 화면 UI의 뿌리. App이 월드 위에 그린다.
 * - 메인 오버레이: 데이터와 핸들러는 cw의 useOverlayProps()가 준다. 여기서는 배치만 한다
 * - 계정 메뉴·승인 대기 배너·모달(로그인·가입·꾸미기·시간표·관리자)은 th의 UI 스토어로 연다
 */
export function UiRoot() {
  const overlay = useOverlayProps();
  return (
    <div className="ui-root">
      <TopBar {...overlay.topBar} />
      <div className="ui-top-right">
        <ConnectionBadge {...overlay.connection} />
        <AccountMenu />
      </div>
      <PendingBanner />
      <PresencePanel {...overlay.presence} />
      {overlay.building && <BuildingPanel {...overlay.building} />}
      {overlay.board && <BoardPanel {...overlay.board} />}
      {overlay.canControl && (
        <div className="ov-bottom">
          <ControlButton {...overlay.control} />
          <EmoteBar {...overlay.emoteBar} />
        </div>
      )}
      <ScreenHost />
    </div>
  );
}
```

`apps/web/src/ui/ScreenHost.tsx` — 파일 전체:

```tsx
import { AdminScreen } from './admin/AdminScreen';
import { AdminLoginForm } from './auth/AdminLoginForm';
import { LoginForm } from './auth/LoginForm';
import { SignupForm } from './auth/SignupForm';
import { CustomizeScreen } from './customize/CustomizeScreen';
import { ScheduleScreen } from './schedule/ScheduleScreen';
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
    case 'schedule':
      return <ScheduleScreen />;
    case 'admin':
      return <AdminScreen />;
  }
}
```

`apps/web/src/ui/account/AccountMenu.tsx` — 파일 전체:

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
          { label: '내 시간표', run: go('schedule') },
          { label: '캐릭터 꾸미기', run: go('customize') },
          { label: '로그아웃', run: logout },
        ]
      : [
          { label: '관리자 화면', run: go('admin') },
          { label: '로그아웃', run: logout },
        ];
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

`apps/web/src/ui/auth/AdminLoginForm.tsx` — 파일 전체:

```tsx
import { useState, type FormEvent } from 'react';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { Modal } from '../common/Modal';
import { errorMessage } from '../errors';
import { useUi } from '../store';

/** 관리자 로그인 모달 (ADMIN_PASSWORD 하나로 들어간다) */
export function AdminLoginForm() {
  const { open, close } = useUi();
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
      open('admin');
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

- [ ] **Step 4: 통과 확인**

Run: `npm test -w @4this/web`
Expected: PASS — 103개(cw#1 5 + th 98: poses 9, overhead 4, cache 6, store 2, errors 4, auth 9, customize 7, UiRoot 8, UiRoot.overlay 2, grid 16, schedule 11, overlay 12, admin 8)

- [ ] **Step 5: 화면 확인**

오버레이는 cw#3·cw#4 전이면 훅이 빈 값을 주므로 `접속 중 0`·`👀 구경 중 0`만 보인다. 배치를 눈으로 보려면 **커밋하지 않는 임시 수정**으로 `store/overlay.ts`의 기본값에 `UiRoot.overlay.test.tsx`의 `FULL` 같은 값을 넣고 확인한 뒤 `git checkout apps/web/src/store/overlay.ts`로 되돌린다.

Run: `ADMIN_PASSWORD=admin1234 SESSION_SECRET=dev-secret-dev-secret-dev-secret-00 npm run dev` 후 http://localhost:5173
Expected:

- 1280px: 왼쪽 위 로고·시각, 오른쪽 위 계정 메뉴(드롭다운이 접속자 패널 위로 뜬다), 오른쪽 접속자 카드(동물 얼굴·`🎮 조종`·`👀 구경 중`), 왼쪽 건물·게시판 카드, 아래 가운데 `🎮 조종하기` + 이모지 8개.
- 390px: 접속자 패널이 화면 아래 시트가 되고(머리를 누르면 접힘), 조종 버튼·이모지 바는 시트 위에 뜬다.
- 로그인 모달 → `관리자 로그인` → 비밀번호(`admin1234`) → 관리자 화면이 바로 열린다. 대기 배지 수, `승인`하면 대기 목록에서 빠지고 표의 상태가 `승인`. `이름 변경`·`비밀번호 초기화`는 줄 안에서 입력·확인, `삭제`는 "정말 삭제할까요?" 뒤 `삭제 확인`. `💾 백업 다운로드`는 `.db` 파일을 내려받는다(wj#2).

- [ ] **Step 6: 커밋**

```bash
git add apps/web/src/ui
git commit -m "feat: 메인 오버레이 배치와 관리자 화면 진입"
```

---

### Task 4: 전체 검사와 PR

- [ ] **Step 1: 전체 검사**

Run: `npm run format && npm run typecheck && npm run lint && npm run format:check && npm test && npm run build`
Expected: 모두 통과. `@4this/web` 테스트 103개(cw#1의 5개 포함, 먼저 머지된 다른 PR의 테스트가 있으면 그만큼 더 많다). 빌드는 `✓ built` (500 kB 청크 경고는 무시).

- [ ] **Step 2: push와 PR**

```bash
git push origin th
gh pr create --base main --head th --title "[th#4] 관리자·오버레이" --body-file .github/pull_request_template.md
```

PR 본문에 데스크톱·모바일 오버레이와 관리자 화면 스크린샷을 붙이고 cw(cw#4가 `useOverlayProps`를 채운다)와 wj(관리자 API)를 리뷰어로 지정한다. 머지는 **Create a merge commit**.

- [ ] **Step 3: 머지 후 알림**

머지되면 단톡방에 "th#4 머지됨 — 오버레이 컴포넌트가 `useOverlayProps()` 값을 그대로 그려요. cw#4 시작하셔도 됩니다" 를 알린다.

---

## Self-Review

- 스펙 §9 메인(반투명 파스텔 카드, 접속자 패널 접기·이름 클릭, 조종·이모지 바는 승인 멤버만), 모바일(접속자 하단 시트), 관리자(승인 대기 배지·멤버 관리·백업), §10 재연결 배지, §5.3 건물 층 버튼·사람 목록, §7.2-4 게시판 → Task 1~3. 실제 데이터 연결(소켓·카메라 이동)은 cw#3·cw#4 몫이다.
- 플레이스홀더 없음. 코드는 검증한 파일 그대로다.
- props 타입은 `ui/contracts.ts`에서 import만 한다. `useOverlayProps`는 호출만 하고 고치지 않는다(테스트는 `vi.mock`).
