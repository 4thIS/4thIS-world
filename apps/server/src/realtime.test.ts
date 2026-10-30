import type { AddressInfo } from 'node:net';
import { io as connectClient, type Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  ADMIN_ID,
  API,
  type ChatEvent,
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
    expect(last(guest.states)).toEqual([
      { memberId: a.id, x: 1, z: 2, facing: 1.5, moving: true, y: 0, floor: 1 },
    ]);

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

  it('건물 위층 높이·층을 전하고, 범위를 벗어난 값은 버린다', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    const guest = await connect();
    const me = await connect(a.cookie);
    me.socket.emit('control:start');
    me.socket.emit('control:move', { x: 16, z: -2, facing: 0, moving: false, y: 3.2, floor: 2 });
    await waitFor(() => guest.states.length > 0);
    expect(last(guest.states)?.[0]).toMatchObject({ y: 3.2, floor: 2 });
    me.socket.emit('control:move', { x: 17, z: -2, facing: 0, moving: false, y: 3.2, floor: 9 });
    await pause(80);
    expect(last(guest.states)?.[0]).toMatchObject({ x: 16, floor: 2 });
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

  it('관리자 세션은 관리자 캐릭터(admin)로 접속하고 조종·이모지를 쓴다', async () => {
    const guest = await connect();
    const admin = await connect(await adminCookie(t));
    await waitFor(() => last(guest.presence)?.members[0]?.id === ADMIN_ID);
    expect(last(guest.presence)).toEqual({
      members: [{ id: ADMIN_ID, controlling: false }],
      spectators: 1,
    });

    admin.socket.emit('control:start');
    admin.socket.emit('control:move', { x: 2, z: 4, facing: 0, moving: true });
    await waitFor(() => guest.states.length > 0);
    expect(last(guest.states)).toEqual([
      { memberId: ADMIN_ID, x: 2, z: 4, facing: 0, moving: true, y: 0, floor: 1 },
    ]);

    admin.socket.emit('emote', { emoji: '👋' });
    await waitFor(() => guest.emotes.length === 1);
    expect(guest.emotes[0]).toMatchObject({ memberId: ADMIN_ID, emoji: '👋' });
  });

  it('채팅은 모두에게 가고(구경꾼 포함), 구경꾼은 보낼 수 없다', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    const guest = await connect();
    const me = await connect(a.cookie);
    const chats: ChatEvent[] = [];
    guest.socket.on('chat', (e) => chats.push(e));
    guest.socket.emit('chat', { text: '나도' });
    me.socket.emit('chat', { text: '안녕하세요' });
    await waitFor(() => chats.length === 1);
    await pause(80);
    expect(chats).toEqual([{ memberId: a.id, text: '안녕하세요', at: clock }]);
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
