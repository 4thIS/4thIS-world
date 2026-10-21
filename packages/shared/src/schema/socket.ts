import { z } from 'zod';

export const EMOJIS = ['👋', '❤️', '😂', '👍', '😮', '😴', '🎉', '☕'] as const;
export type Emoji = (typeof EMOJIS)[number];

export const SOCKET_LIMITS = {
  /** control:move 초당 최대 횟수 (넘치면 버린다) */
  movePerSec: 15,
  /** emote 멤버당 초당 최대 횟수 */
  emotePerSec: 1,
  /** 이 시간 동안 control:move가 없으면 조종이 풀린다 */
  controlIdleMs: 60_000,
  /** control:state 묶음 전송 빈도 */
  stateHz: 10,
} as const;

export const ControlMoveSchema = z.object({
  x: z.number(),
  z: z.number(),
  facing: z.number(),
  moving: z.boolean(),
});
export type ControlMove = z.infer<typeof ControlMoveSchema>;

export const EmoteRequestSchema = z.object({ emoji: z.enum(EMOJIS) });
export type EmoteRequest = z.infer<typeof EmoteRequestSchema>;

export interface Presence {
  /** 접속 중인 승인 멤버 (탭이 여러 개여도 한 번) */
  members: { id: string; controlling: boolean }[];
  /** 로그인하지 않았거나 승인 전인 접속 수 */
  spectators: number;
}

export type ControlState = ControlMove & { memberId: string };

export interface EmoteEvent {
  memberId: string;
  emoji: Emoji;
  /** 서버 시각 epoch ms */
  at: number;
}

export interface ServerToClientEvents {
  presence: (p: Presence) => void;
  'world:changed': () => void;
  'control:state': (states: ControlState[]) => void;
  'control:released': (p: { memberId: string }) => void;
  emote: (e: EmoteEvent) => void;
  time: (p: { serverTime: number }) => void;
}

export interface ClientToServerEvents {
  'control:start': () => void;
  'control:stop': () => void;
  'control:move': (m: ControlMove) => void;
  emote: (r: EmoteRequest) => void;
}
