import type { FastifyInstance } from 'fastify';
import { Server, type Socket } from 'socket.io';
import {
  ADMIN_ID,
  ChatRequestSchema,
  ControlMoveSchema,
  EmoteRequestSchema,
  SOCKET_LIMITS,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from '@4this/shared';
import { resolveSession, SESSION_COOKIE } from './auth/session';
import { RealtimeHub } from './realtime-hub';

export type WorldServer = Server<ClientToServerEvents, ServerToClientEvents>;
type WorldSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export interface RealtimeOptions {
  /** 서버 시각. 테스트에서 바꿔 끼운다 */
  now?: () => number;
  /** control:state 묶음·무입력 검사 주기 (기본 1000 / stateHz = 100ms) */
  tickMs?: number;
}

/**
 * Socket.IO를 Fastify의 http 서버에 붙인다. app.listen() 전에 부른다.
 * 같은 출처라 CORS 설정은 없다. 경로는 기본값 /socket.io.
 */
export function attachRealtime(app: FastifyInstance, opts: RealtimeOptions = {}): WorldServer {
  const now = opts.now ?? Date.now;
  const tickMs = opts.tickMs ?? 1000 / SOCKET_LIMITS.stateHz;
  const hub = new RealtimeHub(now);
  const io: WorldServer = new Server(app.server, { serveClient: false });
  /** 소켓 id → 세션 토큰 (world:changed 때 다시 확인한다) */
  const tokens = new Map<string, string | null>();

  /** 쿠키 sid → 세션 토큰 */
  const tokenOf = (socket: WorldSocket): string | null => {
    const header = socket.handshake.headers.cookie;
    if (!header) return null;
    const raw = app.parseCookie(header)[SESSION_COOKIE];
    if (!raw) return null;
    const unsigned = app.unsignCookie(raw);
    return unsigned.valid ? unsigned.value : null;
  };

  /** 승인된 멤버면 id, 관리자면 관리자 캐릭터 id, 아니면 null(구경꾼) */
  const approvedMemberId = (token: string | null): string | null => {
    const auth = resolveSession(app.db, token, now());
    if (auth.kind === 'admin') return ADMIN_ID;
    return auth.kind === 'member' && auth.member.status === 'approved' ? auth.member.id : null;
  };

  /** 접속자가 지난번과 달라졌을 때만 모두에게 보낸다. 보냈으면 true */
  let lastPresence = '';
  const sendPresence = (): boolean => {
    const presence = hub.presence();
    const key = JSON.stringify(presence);
    if (key === lastPresence) return false;
    lastPresence = key;
    io.emit('presence', presence);
    return true;
  };

  const released = (memberId: string | null) => {
    if (memberId) io.emit('control:released', { memberId });
  };

  io.on('connection', (socket) => {
    const token = tokenOf(socket);
    tokens.set(socket.id, token);
    hub.connect(socket.id, approvedMemberId(token));
    socket.emit('time', { serverTime: now() });
    // 변동이 없어도(예: 같은 멤버의 두 번째 탭) 새로 들어온 소켓은 지금 접속자를 받아야 한다
    if (!sendPresence()) socket.emit('presence', hub.presence());

    socket.on('control:start', () => {
      if (hub.startControl(socket.id)) sendPresence();
    });

    socket.on('control:stop', () => {
      const memberId = hub.stopControl(socket.id);
      released(memberId);
      if (memberId) sendPresence();
    });

    socket.on('control:move', (payload) => {
      const parsed = ControlMoveSchema.safeParse(payload);
      if (parsed.success) hub.move(socket.id, parsed.data);
    });

    socket.on('emote', (payload) => {
      const parsed = EmoteRequestSchema.safeParse(payload);
      if (!parsed.success) return;
      const event = hub.emote(socket.id, parsed.data.emoji);
      if (event) io.emit('emote', event);
    });

    socket.on('chat', (payload) => {
      const parsed = ChatRequestSchema.safeParse(payload);
      if (!parsed.success) return;
      const event = hub.chat(socket.id, parsed.data.text);
      if (event) io.emit('chat', event);
    });

    socket.on('disconnect', () => {
      tokens.delete(socket.id);
      released(hub.disconnect(socket.id));
      sendPresence();
    });
  });

  // 10 Hz: 바뀐 위치 묶음 전송 + 60초 무입력 해제
  const timer = setInterval(() => {
    const idle = hub.expireIdle();
    for (const memberId of idle) released(memberId);
    if (idle.length > 0) sendPresence();
    const states = hub.flushStates();
    if (states) io.emit('control:state', states);
  }, tickMs);

  // 시간표·생김새·승인이 바뀌면 모두에게 알리고, 소켓마다 승인 상태를 다시 확인한다
  const onWorldChanged = () => {
    for (const socketId of hub.socketIds()) {
      released(hub.setMember(socketId, approvedMemberId(tokens.get(socketId) ?? null)));
    }
    sendPresence();
    io.emit('world:changed');
  };
  app.events.on('world:changed', onWorldChanged);
  const onWeatherChanged = () => io.emit('weather:changed');
  app.events.on('weather:changed', onWeatherChanged);

  app.addHook('preClose', async () => {
    clearInterval(timer);
    app.events.off('world:changed', onWorldChanged);
    app.events.off('weather:changed', onWeatherChanged);
    // 소켓에 끊김 패킷을 보내지 않고 전송만 닫는다. 그래야 클라이언트가 자동으로 다시 붙는다 (io server disconnect면 재연결하지 않는다)
    io.engine.close();
  });

  return io;
}
