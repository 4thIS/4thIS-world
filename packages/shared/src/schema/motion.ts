import { z } from 'zod';

/**
 * 모션 (모션 버튼). 한 번 하고 끝나는 동작은 MOTION_DURATION_MS 동안, 눕기(lie)는 다른 행동을 할 때까지.
 * 시간표대로 걷기 시작하거나 움직이면 일어난다(눕기 자리에서 벗어나면 그리지 않는다).
 */
export const MOTIONS = [
  'cheer',
  'wave',
  'lie',
  'firework',
  'dance',
  'bow',
  'jump',
  'clap',
] as const;
export type Motion = (typeof MOTIONS)[number];

/** 한 번 하고 끝나는 동작의 길이 (ms) */
export const MOTION_DURATION_MS = 2600;

/** 계속하는 모션 (다른 행동을 할 때까지) */
export const HELD_MOTIONS: ReadonlySet<Motion> = new Set<Motion>(['lie']);

export const MotionRequestSchema = z.object({
  kind: z.enum(MOTIONS),
  /** 그 순간 내 캐릭터가 서 있는 바닥 자리 [x, z] (눕기 자리를 벗어나면 일어난 것으로 본다) */
  pos: z.tuple([z.number(), z.number()]),
});
export type MotionRequest = z.infer<typeof MotionRequestSchema>;

/** 받을 때. kind가 null이면 하던 모션(눕기)을 그만둠 */
export interface MotionEvent {
  memberId: string;
  kind: Motion | null;
  pos: [number, number];
  /** 서버 시각 epoch ms */
  at: number;
}
