import {
  SOCKET_LIMITS,
  cleanChat,
  maskProfanity,
  type ChatEvent,
  type ControlMove,
  type ControlState,
  type Emoji,
  type EmoteEvent,
  type Presence,
} from '@4this/shared';

/** 캠퍼스 범위 (Global Constraints: x·z ∈ [-25, 25]) */
export const MAP_HALF = 25;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface Conn {
  /** 승인된 멤버면 id, 아니면 null(구경꾼) */
  memberId: string | null;
  /** control:move 횟수 제한용 1초 창 */
  moveWindowStart: number;
  moveCount: number;
}

interface Control {
  socketId: string;
  lastInput: number;
  state: ControlState | null;
}

/**
 * 접속자·조종권·횟수 제한 상태. 소켓을 모르는 순수 로직이라 now()만 바꿔 가며 테스트한다.
 * 모든 정보는 메모리에만 있다 (스펙 §8.3: 프로세스 1개).
 */
export class RealtimeHub {
  private conns = new Map<string, Conn>();
  /** memberId → 조종 정보. 멤버당 하나, 마지막으로 start한 소켓이 가진다 */
  private controls = new Map<string, Control>();
  private lastEmote = new Map<string, number>();
  private lastChat = new Map<string, number>();
  private dirty = false;

  constructor(private readonly now: () => number = Date.now) {}

  connect(socketId: string, memberId: string | null): void {
    this.conns.set(socketId, { memberId, moveWindowStart: 0, moveCount: 0 });
  }

  /** 연결 끊김. 그 소켓이 조종 중이었으면 풀린 memberId */
  disconnect(socketId: string): string | null {
    const released = this.releaseBySocket(socketId);
    this.conns.delete(socketId);
    return released;
  }

  /** 세션이 바뀌었을 때(승인·승인 취소·삭제) 소켓의 사용자를 바꾼다. 풀린 조종이 있으면 memberId */
  setMember(socketId: string, memberId: string | null): string | null {
    const conn = this.conns.get(socketId);
    if (!conn || conn.memberId === memberId) return null;
    const released = this.releaseBySocket(socketId);
    conn.memberId = memberId;
    return released;
  }

  memberOf(socketId: string): string | null {
    return this.conns.get(socketId)?.memberId ?? null;
  }

  socketIds(): string[] {
    return [...this.conns.keys()];
  }

  presence(): Presence {
    const members = new Set<string>();
    let spectators = 0;
    for (const conn of this.conns.values()) {
      if (conn.memberId) members.add(conn.memberId);
      else spectators++;
    }
    return {
      members: [...members].sort().map((id) => ({ id, controlling: this.controls.has(id) })),
      spectators,
    };
  }

  /** 조종 시작. 승인 멤버 소켓만 된다. 같은 멤버의 다른 탭이 갖고 있었으면 넘겨받는다 */
  startControl(socketId: string): boolean {
    const memberId = this.memberOf(socketId);
    if (!memberId) return false;
    const prev = this.controls.get(memberId);
    this.controls.set(memberId, {
      socketId,
      lastInput: this.now(),
      state: prev?.state ?? null,
    });
    return true;
  }

  /** control:stop. 이 소켓이 조종권을 가졌으면 풀린 memberId */
  stopControl(socketId: string): string | null {
    return this.releaseBySocket(socketId);
  }

  /** 이동 입력. 조종권이 있는 소켓만, 초당 movePerSec회까지. 받아들였으면 true */
  move(socketId: string, m: ControlMove): boolean {
    const conn = this.conns.get(socketId);
    const memberId = conn?.memberId;
    if (!conn || !memberId) return false;
    const control = this.controls.get(memberId);
    if (!control || control.socketId !== socketId) return false;
    if (![m.x, m.z, m.facing, m.y].every(Number.isFinite)) return false;

    const t = this.now();
    if (t - conn.moveWindowStart >= 1000) {
      conn.moveWindowStart = t;
      conn.moveCount = 0;
    }
    if (conn.moveCount >= SOCKET_LIMITS.movePerSec) return false;
    conn.moveCount++;

    control.lastInput = t;
    control.state = {
      memberId,
      x: clamp(m.x, -MAP_HALF, MAP_HALF),
      z: clamp(m.z, -MAP_HALF, MAP_HALF),
      facing: m.facing,
      moving: m.moving,
      y: m.y,
      floor: m.floor,
    };
    this.dirty = true;
    return true;
  }

  /** 이모지. 승인 멤버만, 멤버당 초당 emotePerSec회. 보낼 이벤트 또는 null */
  emote(socketId: string, emoji: Emoji): EmoteEvent | null {
    const memberId = this.memberOf(socketId);
    if (!memberId) return null;
    const t = this.now();
    const last = this.lastEmote.get(memberId);
    if (last !== undefined && t - last < 1000 / SOCKET_LIMITS.emotePerSec) return null;
    this.lastEmote.set(memberId, t);
    return { memberId, emoji, at: t };
  }

  /** 말풍선 채팅. 승인 멤버만, 멤버당 초당 chatPerSec회. 다듬고 욕설을 가린 이벤트 또는 null */
  chat(socketId: string, raw: string): ChatEvent | null {
    const memberId = this.memberOf(socketId);
    if (!memberId) return null;
    const text = cleanChat(raw);
    if (!text) return null;
    const t = this.now();
    const last = this.lastChat.get(memberId);
    if (last !== undefined && t - last < 1000 / SOCKET_LIMITS.chatPerSec) return null;
    this.lastChat.set(memberId, t);
    return { memberId, text: maskProfanity(text), at: t };
  }

  /** 10 Hz마다 부른다. 지난번 이후 바뀐 게 있으면 조종 중인 멤버 전체 위치, 없으면 null */
  flushStates(): ControlState[] | null {
    if (!this.dirty) return null;
    this.dirty = false;
    return [...this.controls.values()]
      .map((c) => c.state)
      .filter((s): s is ControlState => s !== null);
  }

  /** controlIdleMs 동안 입력이 없던 조종을 푼다. 풀린 memberId 목록 */
  expireIdle(): string[] {
    const t = this.now();
    const released: string[] = [];
    for (const [memberId, control] of this.controls) {
      if (t - control.lastInput >= SOCKET_LIMITS.controlIdleMs) {
        this.controls.delete(memberId);
        released.push(memberId);
      }
    }
    if (released.length > 0) this.dirty = true;
    return released;
  }

  private releaseBySocket(socketId: string): string | null {
    for (const [memberId, control] of this.controls) {
      if (control.socketId === socketId) {
        this.controls.delete(memberId);
        this.dirty = true;
        return memberId;
      }
    }
    return null;
  }
}
