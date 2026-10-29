import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SOCKET_LIMITS } from '@4this/shared';
import { RealtimeHub } from './realtime-hub';

const move = (x = 1, z = 2, y = 0, floor = 1) => ({ x, z, facing: 0.5, moving: true, y, floor });

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
      { memberId: 'm1', x: 25, z: -25, facing: 0.5, moving: true, y: 0, floor: 1 },
    ]);
    expect(hub.flushStates()).toBeNull();
  });

  it('건물 위층의 높이와 층을 그대로 전한다', () => {
    hub.connect('s1', 'm1');
    hub.startControl('s1');
    hub.move('s1', move(16, -2, 3.2, 2));
    expect(hub.flushStates()).toEqual([
      { memberId: 'm1', x: 16, z: -2, facing: 0.5, moving: true, y: 3.2, floor: 2 },
    ]);
  });

  it('숫자가 아닌 좌표는 버린다', () => {
    hub.connect('s1', 'm1');
    hub.startControl('s1');
    expect(hub.move('s1', { ...move(), x: Number.NaN })).toBe(false);
    expect(hub.move('s1', { ...move(), y: Number.NaN })).toBe(false);
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
