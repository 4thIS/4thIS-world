import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_ID, DEFAULT_ADMIN_LOOK, DEFAULT_LOOK, type WorldResponse } from '@4this/shared';
import { useWorld } from './world';

const SERVER = Date.parse('2026-10-21T14:10:00+09:00');

const world = (ids: string[]): WorldResponse => ({
  serverTime: SERVER,
  members: ids.map((id) => ({
    id,
    username: id,
    look: DEFAULT_LOOK,
    schedules: [{ day: 2, start: '14:00', end: '16:00', kind: 'lecture2' }],
  })),
});

beforeEach(() => {
  vi.useFakeTimers();
  // 브라우저 시계는 서버보다 3분 느리다
  vi.setSystemTime(SERVER - 3 * 60_000);
  useWorld.setState(useWorld.getInitialState(), true);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useWorld', () => {
  it('관리자 캐릭터가 오면 멤버 목록 끝에 시간표 없는 가상 멤버로 붙인다', () => {
    useWorld.getState().setWorld({ ...world(['a']), admin: { look: DEFAULT_ADMIN_LOOK } });
    const members = useWorld.getState().members;
    expect(members.map((m) => m.id)).toEqual(['a', ADMIN_ID]);
    expect(members[1]).toEqual({
      id: ADMIN_ID,
      username: '관리자',
      look: DEFAULT_ADMIN_LOOK,
      schedules: [],
    });
  });

  it('load는 멤버를 담고 서버 시각으로 시계를 맞춘다', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify(world(['a', 'b'])))),
    );
    await useWorld.getState().load();
    const s = useWorld.getState();
    expect(s.loaded).toBe(true);
    expect(s.members.map((m) => m.id)).toEqual(['a', 'b']);
    expect(s.now()).toBe(SERVER);
    vi.advanceTimersByTime(5000);
    expect(useWorld.getState().now()).toBe(SERVER + 5000);
  });

  it('불러오기에 실패하면 error를 남긴다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await useWorld.getState().load();
    expect(useWorld.getState()).toMatchObject({ loaded: true, error: expect.any(String) });
  });

  it('오늘 계획을 만들고, KST 자정이 지나면 새로 만든다', () => {
    useWorld.getState().setWorld(world(['a']));
    const first = useWorld.getState().ensurePlan();
    expect(first.date).toBe('2026-10-21');
    expect(useWorld.getState().ensurePlan()).toBe(first);

    vi.setSystemTime(Date.parse('2026-10-22T00:00:01+09:00') - 3 * 60_000);
    const next = useWorld.getState().ensurePlan();
    expect(next.date).toBe('2026-10-22');
    expect(next).not.toBe(first);
  });

  it('world가 바뀌면 계획을 다시 만든다', () => {
    useWorld.getState().setWorld(world(['a']));
    const first = useWorld.getState().ensurePlan();
    useWorld.getState().setWorld(world(['a', 'b']));
    const second = useWorld.getState().ensurePlan();
    expect(second).not.toBe(first);
    expect(second.usernames.has('b')).toBe(true);
  });

  it('setClock은 개발용으로 시계를 빠르게 돌린다', () => {
    useWorld.getState().setClock(SERVER, 60);
    vi.advanceTimersByTime(1000);
    expect(useWorld.getState().now()).toBe(SERVER + 60_000);
  });

  it('건물 포커스는 층 숨김과 캐릭터 추적을 초기화한다', () => {
    const s = useWorld.getState();
    s.focusMember('a');
    s.setHiddenAboveFloor(1);
    s.focusBuilding('eng');
    expect(useWorld.getState()).toMatchObject({
      focusedBuilding: 'eng',
      hiddenAboveFloor: null,
      focusedMember: null,
    });
    useWorld.getState().focusMember('b');
    expect(useWorld.getState()).toMatchObject({ focusedBuilding: null, focusedMember: 'b' });
  });
});
