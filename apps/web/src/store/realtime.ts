import { create } from 'zustand';
import {
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
import { freeSpot } from '../world/sim/collision';
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
  a !== null && a.x === b.x && a.z === b.z && a.facing === b.facing && a.moving === b.moving;

/** 로그인한 승인 멤버면 그 아이디 */
export function myMemberId(): string | null {
  const s = useSession.getState().session;
  return s.kind === 'member' && s.me.status === 'approved' ? s.me.id : null;
}

/**
 * placement 자리로 걸어 돌아가는 길. 자리가 건물 안이면 그 건물 문까지 걷고(그다음은 placement가
 * 자리로 옮긴다), 그날 캠퍼스에 없을 시각이면 정문 밖으로 걸어 나간다.
 */
function returnFrom(memberId: string, from: Vec2): ReturnWalk {
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
  return planReturn(CAMPUS, from, to, Date.now(), target?.status ?? '하교 중');
}

export const useRealtime = create<RealtimeState>()((set, get) => ({
  connection: 'reconnecting',
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

    s.on('connect', () => set({ connection: 'connected' }));
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
      if (last) returning[memberId] = returnFrom(memberId, [last.x, last.z]);
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
      set({ connection: 'reconnecting', controlling: false, local: null });
    };
  },

  startControl: () => {
    const me = myMemberId();
    if (!socket || !me || get().connection !== 'connected') return;
    const shown = memberObjects.get(me);
    const from: Vec2 = shown?.visible
      ? [shown.position.x, shown.position.z]
      : CAMPUS.graph.nodes[CAMPUS.gateNode]!;
    const [x, z] = freeSpot(CAMPUS, from);
    const local: ControlMove = { x, z, facing: Math.PI, moving: false };
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
    if (me && local) returning[me] = returnFrom(me, [local.x, local.z]);
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
