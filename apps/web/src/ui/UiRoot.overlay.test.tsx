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
  topBar: { clock: '수 14:10', skyIcon: '☀️', onHome: () => {} },
  presence: {
    entries: [],
    offline: [],
    spectators: 3,
    collapsed: false,
    onToggle: noop,
    onSelect: noop,
  },
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
