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
    // 한 번도 연결된 적 없는 첫 접속 중에는 재연결 배지를 띄우지 않는다
    expect(result.current.connection.state).toBe('connected');
    expect(result.current.control.disabled).toBe(true);
    expect(result.current.emoteBar.disabled).toBe(true);
    act(() => useRealtime.setState({ connection: 'connected' }));
    expect(result.current.control.disabled).toBe(false);
    expect(result.current.emoteBar.disabled).toBe(false);
    act(() => useRealtime.setState({ connection: 'reconnecting', everConnected: true }));
    expect(result.current.connection.state).toBe('reconnecting');
    expect(result.current.control.disabled).toBe(true);
    act(() => useRealtime.setState({ connection: 'connected' }));

    act(() => useSession.setState({ session: { kind: 'guest' } }));
    expect(result.current.canControl).toBe(false);
    expect(result.current.control.disabled).toBe(true);
  });

  it('게시판을 열고 닫는다 (외부 일정은 카페에서 보내 게시판은 비어 있다)', () => {
    const { result } = renderHook(() => useOverlayProps());
    expect(result.current.board).toBeNull();
    act(() => useRealtime.getState().openBoard());
    expect(result.current.board?.entries).toEqual([]);
    act(() => result.current.board!.onClose());
    expect(result.current.board).toBeNull();
  });
});
