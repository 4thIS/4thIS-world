import { create } from 'zustand';
import {
  ADMIN_ID,
  CAMPUS,
  SOCKET_LIMITS,
  sampleAt,
  type ControlMove,
  type Emoji,
  type PlaceId,
  type Presence,
  type Vec2,
} from '@4this/shared';
import { createSocket, type GameSocket } from '../api/socket';
import type { ActiveEmote } from '../world/contracts';
import { isIndoor, moverFloor, moverHeight, startMover } from '../world/sim/indoor';
import { createThrottle } from '../world/sim/input';
import { memberObjects } from '../world/sim/registry';
import { planReturn, pushSample, type RemoteTrack, type ReturnWalk } from '../world/sim/remote';
import { useSession } from './session';
import { useWorld } from './world';

/** 이모지 말풍선이 떠 있는 시간 */
export const EMOTE_MS = 3000;

export type ConnectionState = 'connected' | 'reconnecting';

export interface RealtimeState {
  connection: ConnectionState;
  /** 한 번이라도 연결됐는가. 첫 접속 중에는 재연결 배지를 띄우지 않는다 */
  everConnected: boolean;
  presence: Presence;
  /** 다른 사람이 조종 중인 캐릭터의 최근 상태 (10 Hz) */
  remotes: Record<string, RemoteTrack>;
  /** 조종이 풀려 placement 자리로 걸어서 돌아가는 중 */
  returning: Record<string, ReturnWalk>;
  emotes: Record<string, ActiveEmote>;
  /** 내가 조종 중인가 */
  controlling: boolean;
  /** 조종 중인 내 캐릭터의 위치 (화면은 서버 응답을 기다리지 않고 이것을 그린다) */
  local: ControlMove | null;
  presenceCollapsed: boolean;
  boardOpen: boolean;

  /** 소켓을 연결하고 이벤트를 단다. 돌려준 함수를 부르면 끊는다 */
  connect: (socket?: GameSocket) => () => void;
  startControl: () => void;
  stopControl: () => void;
  /** 내 조종 위치를 갱신하고, 초당 15회 이하로 서버에 보낸다 */
  move: (m: ControlMove, nowMs: number) => void;
  sendEmote: (emoji: Emoji) => void;
  togglePresence: () => void;
  openBoard: () => void;
  closeBoard: () => void;
}

const EMPTY_PRESENCE: Presence = { members: [], spectators: 0 };

/** 좁은 화면(모바일)에서는 접속자 패널(하단 시트)을 접은 채로 시작한다 */
function startCollapsed(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(max-width: 640px)').matches
    : false;
}

let socket: GameSocket | null = null;
let allowMove = createThrottle(SOCKET_LIMITS.movePerSec);
/** 마지막으로 서버에 보낸 위치. 같으면 다시 보내지 않는다 (가만히 있으면 60초 뒤 서버가 조종을 푼다) */
let lastSent: ControlMove | null = null;

const sameMove = (a: ControlMove | null, b: ControlMove) =>
  a !== null &&
  a.x === b.x &&
  a.z === b.z &&
  a.y === b.y &&
  a.floor === b.floor &&
  a.facing === b.facing &&
  a.moving === b.moving;

/** 로그인한 승인 멤버면 그 아이디, 관리자면 관리자 캐릭터 아이디 */
export function myMemberId(): string | null {
  const s = useSession.getState().session;
  if (s.kind === 'admin') return ADMIN_ID;
  return s.kind === 'member' && s.me.status === 'approved' ? s.me.id : null;
}

/**
 * placement 자리로 곧장(최단 거리) 걸어 돌아가는 길. 자리가 건물 안이면 그 건물 문까지 걷고(그다음은 placement가
 * 자리로 옮긴다), 그날 캠퍼스에 없을 시각이면 정문 밖으로 걸어 나간다.
 */
function returnFrom(memberId: string, from: Vec2, floor: number): ReturnWalk | null {
  // 건물 안(위층·계단 포함)에서 놓으면 걷지 않고 placement 자리로 바로 옮긴다
  if (isIndoor(from, floor)) return null;
  const world = useWorld.getState();
  const t = world.now();
  const target = sampleAt(world.ensurePlan(), memberId, t);
  let to: Vec2 = CAMPUS.gateSpawn;
  if (target && target.placeId in CAMPUS.places) {
    const place = CAMPUS.places[target.placeId as PlaceId];
    to = CAMPUS.graph.nodes[CAMPUS.buildings[place.building].doorNode]!;
  } else if (target) {
    to = [target.position[0], target.position[2]];
  }
  return planReturn(from, to, Date.now(), target?.status ?? '하교 중');
}

export const useRealtime = create<RealtimeState>()((set, get) => ({
  connection: 'reconnecting',
  everConnected: false,
  presence: EMPTY_PRESENCE,
  remotes: {},
  returning: {},
  emotes: {},
  controlling: false,
  local: null,
  presenceCollapsed: startCollapsed(),
  boardOpen: false,

  connect: (given) => {
    const s = given ?? createSocket();
    socket = s;
    allowMove = createThrottle(SOCKET_LIMITS.movePerSec);
    lastSent = null;

    s.on('connect', () => set({ connection: 'connected', everConnected: true }));
    s.on('disconnect', () => set({ connection: 'reconnecting', controlling: false, local: null }));
    s.on('time', ({ serverTime }) => useWorld.getState().syncClock(serverTime));
    s.on('presence', (presence) => set({ presence }));
    s.on('world:changed', () => void useWorld.getState().load());
    s.on('control:state', (states) => {
      const me = myMemberId();
      const at = Date.now();
      set((st) => {
        const remotes = { ...st.remotes };
        const returning = { ...st.returning };
        for (const { memberId, ...m } of states) {
          if (memberId === me && st.controlling) continue;
          remotes[memberId] = pushSample(remotes[memberId], { ...m, at });
          delete returning[memberId];
        }
        return { remotes, returning };
      });
    });
    s.on('control:released', ({ memberId }) => {
      const st = get();
      const isMe = memberId === myMemberId();
      const last = st.remotes[memberId]?.last ?? (isMe ? st.local : null);
      const remotes = { ...st.remotes };
      delete remotes[memberId];
      const returning = { ...st.returning };
      const walk = last ? returnFrom(memberId, [last.x, last.z], last.floor) : null;
      if (walk) returning[memberId] = walk;
      set({
        remotes,
        returning,
        ...(isMe ? { controlling: false, local: null } : {}),
      });
    });
    s.on('emote', ({ memberId, emoji }) => {
      const emote: ActiveEmote = { emoji, at: performance.now() };
      set((st) => ({ emotes: { ...st.emotes, [memberId]: emote } }));
      setTimeout(() => {
        set((st) => {
          if (st.emotes[memberId] !== emote) return st;
          const emotes = { ...st.emotes };
          delete emotes[memberId];
          return { emotes };
        });
      }, EMOTE_MS);
    });

    // 로그인·로그아웃하면 새 쿠키로 다시 연결한다
    const unsub = useSession.subscribe((now, prev) => {
      if (now.session !== prev.session) {
        s.disconnect();
        s.connect();
      }
    });

    return () => {
      unsub();
      s.removeAllListeners();
      s.disconnect();
      if (socket === s) socket = null;
      set({ connection: 'reconnecting', everConnected: false, controlling: false, local: null });
    };
  },

  startControl: () => {
    const me = myMemberId();
    if (!socket || !me || get().connection !== 'connected') return;
    const shown = memberObjects.get(me);
    const gate = CAMPUS.graph.nodes[CAMPUS.gateNode]!;
    // 지금 보이는 자리에서 시작한다 (건물 위층 자리면 그 층에서)
    const mover = startMover(
      CAMPUS,
      shown?.visible
        ? [shown.position.x, shown.position.y, shown.position.z]
        : [gate[0], 0, gate[1]],
    );
    const local: ControlMove = {
      x: mover.pos[0],
      z: mover.pos[1],
      y: moverHeight(mover),
      floor: moverFloor(mover),
      facing: Math.PI,
      moving: false,
    };
    socket.emit('control:start');
    socket.emit('control:move', local);
    lastSent = local;
    const returning = { ...get().returning };
    delete returning[me];
    set({ controlling: true, local, returning });
    useWorld.getState().focusMember(me);
  },

  stopControl: () => {
    const me = myMemberId();
    const { local } = get();
    socket?.emit('control:stop');
    const returning = { ...get().returning };
    const walk = me && local ? returnFrom(me, [local.x, local.z], local.floor) : null;
    if (me && walk) returning[me] = walk;
    set({ controlling: false, local: null, returning });
  },

  move: (m, nowMs) => {
    if (!get().controlling) return;
    if (!sameMove(get().local, m)) set({ local: m });
    // 보내지 못한 마지막 위치는 다음 프레임에 다시 시도한다 (멈춤 신호가 빠지지 않게)
    if (!sameMove(lastSent, m) && allowMove(nowMs)) {
      socket?.emit('control:move', m);
      lastSent = m;
    }
  },

  sendEmote: (emoji) => {
    if (get().connection === 'connected') socket?.emit('emote', { emoji });
  },

  togglePresence: () => set((st) => ({ presenceCollapsed: !st.presenceCollapsed })),
  openBoard: () => set({ boardOpen: true }),
  closeBoard: () => set({ boardOpen: false }),
}));
