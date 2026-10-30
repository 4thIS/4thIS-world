import { z } from 'zod';
import type { ChatEvent, ChatRequest } from './chat';
import type { MotionEvent, MotionRequest } from './motion';
import type { ShotEvent, ShotRequest } from './shot';

export const EMOJIS = ['👋', '❤️', '😂', '👍', '😮', '😴', '🎉', '☕'] as const;
export type Emoji = (typeof EMOJIS)[number];

export const SOCKET_LIMITS = {
  /** control:move 초당 최대 횟수 (넘치면 버린다) */
  movePerSec: 15,
  /** emote 멤버당 초당 최대 횟수 */
  emotePerSec: 1,
  /** chat(말풍선) 멤버당 초당 최대 횟수 */
  chatPerSec: 1,
  /** motion(모션) 멤버당 초당 최대 횟수 */
  motionPerSec: 1,
  /** shot(장난감 쏘기) 멤버당 초당 최대 횟수 */
  shotPerSec: 3,
  /** 이 시간 동안 control:move가 없으면 조종이 풀린다 */
  controlIdleMs: 60_000,
  /** control:state 묶음 전송 빈도 */
  stateHz: 10,
} as const;

/** 조종할 수 있는 가장 높은 층과 발 높이 (3층 건물 3층 바닥 = 6.4 m) */
export const MAX_CONTROL_FLOOR = 3;
export const MAX_CONTROL_Y = 6.4;

export const ControlMoveSchema = z.object({
  x: z.number(),
  z: z.number(),
  facing: z.number(),
  moving: z.boolean(),
  /** 발 높이 (m). 건물 위층·계단에서 0보다 크다. 보내지 않으면 0 (예전 클라이언트) */
  y: z.number().min(0).max(MAX_CONTROL_Y).default(0),
  /** 몇 층에 있나 (1부터). 계단을 오르내리는 중이면 위층. 보내지 않으면 1 */
  floor: z.number().int().min(1).max(MAX_CONTROL_FLOOR).default(1),
});
export type ControlMove = z.infer<typeof ControlMoveSchema>;
/** 클라이언트가 보내는 모양 (y·floor는 빼도 된다) */
export type ControlMoveInput = z.input<typeof ControlMoveSchema>;

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
  /** 말풍선 채팅 (기록은 남기지 않는다) */
  chat: (e: ChatEvent) => void;
  /** 접속하자마자 받는 최근 채팅 (오래된 것부터, 최대 CHAT_HISTORY_MAX개) */
  'chat:history': (events: ChatEvent[]) => void;
  /** 모션. kind가 null이면 눕기 그만 */
  motion: (e: MotionEvent) => void;
  /** 장난감 쏘기 */
  shot: (e: ShotEvent) => void;
  /** 서버가 받은 날씨가 바뀌었다 → GET /api/weather를 다시 부른다 */
  'weather:changed': () => void;
  'control:state': (states: ControlState[]) => void;
  'control:released': (p: { memberId: string }) => void;
  emote: (e: EmoteEvent) => void;
  time: (p: { serverTime: number }) => void;
}

export interface ClientToServerEvents {
  'control:start': () => void;
  'control:stop': () => void;
  'control:move': (m: ControlMoveInput) => void;
  emote: (r: EmoteRequest) => void;
  chat: (r: ChatRequest) => void;
  motion: (r: MotionRequest) => void;
  shot: (r: ShotRequest) => void;
}
