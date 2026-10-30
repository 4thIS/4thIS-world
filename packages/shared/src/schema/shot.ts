import { z } from 'zod';

/**
 * 장난감 쏘기 (조종 중에만): 물총·눈덩이·광선총. 셋 다 같은 방식으로 날아가 맞으면 반응만 한다(점수 없음).
 * 맞았는지는 쏜 사람 화면이 계산해 보내고, 서버는 횟수·조종 여부·켜짐만 확인해 모두에게 전한다.
 * 관리자 설정에서 셋 중 하나만 켜거나 끈다 (WorldResponse.features.weapon).
 */
export const WEAPONS = ['water', 'snow', 'ray'] as const;
export type Weapon = (typeof WEAPONS)[number];

/** 날아가는 최대 거리 (m) */
export const SHOT_RANGE = 12;

const Finite = z.number().finite();

export const ShotRequestSchema = z.object({
  weapon: z.enum(WEAPONS),
  /** 쏜 자리 [x, y, z] (손 높이) */
  from: z.tuple([Finite, Finite, Finite]),
  /** 바닥에서의 방향 [dx, dz] */
  dir: z.tuple([Finite, Finite]),
  /** 맞힌 멤버 (없으면 null) */
  hit: z.string().max(64).nullable(),
  /** 맞힌 곳까지 거리 (m). 안 맞았으면 SHOT_RANGE */
  dist: z.number().min(0).max(SHOT_RANGE),
});
export type ShotRequest = z.infer<typeof ShotRequestSchema>;

export type ShotEvent = ShotRequest & {
  memberId: string;
  /** 서버 시각 epoch ms */
  at: number;
};

/** 관리자 설정으로 정하는 기능 (모두에게 보낸다) */
export const FeaturesSchema = z.object({
  /** 쏠 수 있는 장난감 하나. null이면 쏘기 끔 */
  weapon: z.enum(WEAPONS).nullable(),
});
export type Features = z.infer<typeof FeaturesSchema>;

export const DEFAULT_FEATURES: Features = { weapon: 'water' };
