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
    sock.serverEmit('control:state', [
      { memberId: 'you', x: 0, z: 3, facing: 0, moving: true, y: 0, floor: 1 },
    ]);
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
      useRealtime
        .getState()
        .move({ x: f * 0.05, z: 20, facing: 0, moving: true, y: 0, floor: 1 }, 1000 + f * 16.7);
    }
    const sent = sock.sentOf('control:move').length;
    expect(sent).toBeLessThanOrEqual(15);
    expect(sent).toBeGreaterThanOrEqual(13);

    sock.sent = [];
    for (let f = 0; f < 30; f++) {
      useRealtime
        .getState()
        .move({ x: 1, z: 20, facing: 0, moving: false, y: 0, floor: 1 }, 3000 + f * 100);
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

  it('건물 안(위층)에서 그만두면 걷지 않고 바로 자리로 간다', () => {
    useRealtime.getState().startControl();
    useRealtime.getState().move({ x: 16, z: -2, facing: 0, moving: false, y: 3.2, floor: 2 }, 5000);
    useRealtime.getState().stopControl();
    expect(useRealtime.getState().returning['me']).toBeUndefined();
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

describe('말풍선 채팅', () => {
  const chat = (text: string) => sock.serverEmit('chat', { memberId: 'you', text, at: NOW });

  it('받으면 3초 동안 떠 있고, 새 말풍선은 아래에 쌓이며 오래된 것부터 사라진다', () => {
    chat('하나');
    vi.advanceTimersByTime(1000);
    chat('둘');
    expect(useRealtime.getState().chats['you']!.map((c) => c.text)).toEqual(['하나', '둘']);
    vi.advanceTimersByTime(2000);
    expect(useRealtime.getState().chats['you']!.map((c) => c.text)).toEqual(['둘']);
    vi.advanceTimersByTime(1000);
    expect(useRealtime.getState().chats['you']).toBeUndefined();
  });

  it('한 사람에게 최대 3개, 넘치면 가장 오래된 것부터 지운다', () => {
    for (const t of ['1', '2', '3', '4']) chat(t);
    expect(useRealtime.getState().chats['you']!.map((c) => c.text)).toEqual(['2', '3', '4']);
  });

  it('보낼 때 다듬고, 비었으면 보내지 않고, 1초 안에 또 보내면 막는다', () => {
    expect(useRealtime.getState().sendChat('   ')).toBe('empty');
    expect(useRealtime.getState().sendChat('  안녕  ')).toBe('sent');
    expect(useRealtime.getState().sendChat('또')).toBe('tooFast');
    vi.advanceTimersByTime(1000);
    expect(useRealtime.getState().sendChat('또')).toBe('sent');
    expect(sock.sentOf('chat')).toEqual([{ text: '안녕' }, { text: '또' }]);
  });
});

describe('모션', () => {
  const motion = (kind: string | null, pos: [number, number] = [0, 3]) =>
    sock.serverEmit('motion', { memberId: 'you', kind, pos, at: NOW });

  it('한 번 하는 모션은 끝나면 사라지고, 눕기는 그만둘 때까지 남는다', () => {
    motion('wave');
    expect(useRealtime.getState().motions['you']?.kind).toBe('wave');
    vi.advanceTimersByTime(2600);
    expect(useRealtime.getState().motions['you']).toBeUndefined();
    motion('lie', [1, 2]);
    vi.advanceTimersByTime(60_000);
    expect(useRealtime.getState().motions['you']).toMatchObject({ kind: 'lie', pos: [1, 2] });
    motion(null);
    expect(useRealtime.getState().motions['you']).toBeUndefined();
  });

  it('보낼 때 내 자리를 붙이고, 1초 안에 또 보내면 막는다', () => {
    expect(useRealtime.getState().sendMotion('cheer')).toBe(true);
    expect(useRealtime.getState().sendMotion('wave')).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(useRealtime.getState().sendMotion('wave')).toBe(true);
    expect(sock.sentOf('motion')).toHaveLength(2);
    expect(sock.sentOf('motion')[0]).toMatchObject({ kind: 'cheer' });
  });
});

describe('채팅 기록', () => {
  const event = (text: string) => ({ memberId: 'you', text, at: NOW });

  it('접속하면 최근 기록을 받고, 새 채팅은 끝에 붙는다 (최대 100개)', () => {
    sock.serverEmit('chat:history', [event('하나'), event('둘')]);
    sock.serverEmit('chat', event('셋'));
    expect(useRealtime.getState().chatLog.map((c) => c.text)).toEqual(['하나', '둘', '셋']);
    for (let i = 0; i < 120; i++) sock.serverEmit('chat', event(`${i}`));
    expect(useRealtime.getState().chatLog).toHaveLength(100);
    expect(useRealtime.getState().chatLog.at(-1)!.text).toBe('119');
  });

  it('닫혀 있을 때 새 채팅이 오면 안 읽음 표시, 열면 지운다', () => {
    useRealtime.setState({ chatLogOpen: false, chatUnread: false });
    sock.serverEmit('chat', event('안녕'));
    expect(useRealtime.getState().chatUnread).toBe(true);
    useRealtime.getState().toggleChatLog();
    expect(useRealtime.getState()).toMatchObject({ chatLogOpen: true, chatUnread: false });
    sock.serverEmit('chat', event('또'));
    expect(useRealtime.getState().chatUnread).toBe(false);
  });
});
