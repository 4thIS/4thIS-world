/** 캐릭터 포즈. placement가 고르고 Character 컴포넌트가 그린다. */
export const POSE_KINDS = [
  'idle',
  'walk',
  'stand',
  'sitType',
  'sitEat',
  'sitRead',
  'sitSip',
  'sitRest',
] as const;
export type PoseKind = (typeof POSE_KINDS)[number];
