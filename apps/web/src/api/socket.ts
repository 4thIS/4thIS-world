import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@4this/shared';

/** 이벤트 타입이 붙은 Socket.IO 소켓 (shared/schema/socket.ts) */
export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * 같은 출처의 /socket.io에 연결한다. 세션 쿠키(sid)로 서버가 사용자를 알아본다.
 * 끊기면 socket.io가 알아서 다시 연결한다.
 */
export function createSocket(): GameSocket {
  return io({ withCredentials: true });
}
