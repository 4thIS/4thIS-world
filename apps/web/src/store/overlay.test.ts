import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LOOK } from '@4this/shared';
import { useOverlayProps } from './overlay';
import { useWeather } from './weather';
import { useWorld } from './world';

const WED_1410 = Date.parse('2026-10-21T14:10:00+09:00');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(WED_1410);
  useWorld.setState(useWorld.getInitialState(), true);
  useWorld.getState().setWorld({
    serverTime: WED_1410,
    members: [
      {
        id: 'a',
        username: '철수',
        look: DEFAULT_LOOK,
        schedules: [{ day: 2, start: '14:00', end: '16:00', kind: 'lecture2', title: '자료구조' }],
      },
    ],
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useOverlayProps (cw#3 범위)', () => {
  it("상단 시계는 '수 14:10'과 낮 아이콘, 1초마다 갱신", () => {
    const { result } = renderHook(() => useOverlayProps());
    expect(result.current.topBar).toMatchObject({ clock: '수 14:10', skyIcon: '☀️' });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.topBar.clock).toBe('수 14:11');
  });

  it('접속하지 않은 멤버는 시간표상 지금 위치와 함께 오프라인 목록에 (관리자 캐릭터 제외)', () => {
    useWorld.getState().setWorld({
      ...{ serverTime: WED_1410, members: useWorld.getState().members },
      admin: { look: DEFAULT_LOOK },
    });
    const { result } = renderHook(() => useOverlayProps());
    expect(result.current.presence.entries).toEqual([]);
    expect(result.current.presence.offline).toEqual([
      {
        id: 'a',
        username: '철수',
        look: DEFAULT_LOOK,
        status: '2학년 강의 · 자료구조',
        controlling: false,
        isMe: false,
      },
    ]);
  });

  it('비가 오면 상단 아이콘이 🌧️이고 날씨 설명이 붙는다', () => {
    useWeather.setState({
      now: { kind: 'rain', intensity: 0.5, precipitation: 2.1, temperature: 12.4, code: 61 },
    });
    const { result } = renderHook(() => useOverlayProps());
    expect(result.current.topBar).toMatchObject({
      skyIcon: '🌧️',
      weatherLabel: '서대문구 · 비 2.1mm · 12°C',
    });
    useWeather.setState({ now: null });
  });

  it('건물을 누르기 전에는 building이 없다', () => {
    const { result } = renderHook(() => useOverlayProps());
    expect(result.current.building).toBeNull();
  });

  it('건물 패널: 지금 있는 사람·층 버튼·닫기', () => {
    const { result } = renderHook(() => useOverlayProps());
    act(() => useWorld.getState().focusBuilding('eng'));
    const panel = result.current.building!;
    expect(panel).toMatchObject({
      building: 'eng',
      name: '공학관',
      floors: 3,
      hiddenAboveFloor: null,
    });
    expect(panel.people).toEqual([
      { id: 'a', username: '철수', status: '2학년 강의 · 자료구조', floor: 2 },
    ]);

    act(() => panel.onFloor(1));
    expect(result.current.building?.hiddenAboveFloor).toBe(1);
    const home = useWorld.getState().homeNonce;
    act(() => result.current.building!.onClose());
    expect(result.current.building).toBeNull();
    // ✕로 닫으면 처음 시야로 돌아간다
    expect(useWorld.getState().homeNonce).toBe(home + 1);
  });
});
