import type { Animal, ColorKey, EYES, HEADS, NECKS, PoseKind } from '@4this/shared';

/** 화면에 보이는 한국어 이름. 꾸미기 칩(th#2)과 갤러리가 같이 쓴다 */
export const ANIMAL_LABELS: Record<Animal | 'lion', string> = {
  dog: '강아지',
  cat: '고양이',
  bear: '곰',
  duck: '오리',
  lion: '사자',
};

export const ANIMAL_EMOJI: Record<Animal | 'lion', string> = {
  dog: '🐶',
  cat: '🐱',
  bear: '🐻',
  duck: '🦆',
  lion: '🦁',
};

export const COLOR_LABELS: Record<ColorKey, string> = {
  default: '기본',
  pink: '분홍',
  mint: '민트',
  sky: '하늘',
  lavender: '라벤더',
  lemon: '레몬',
  peach: '복숭아',
  cream: '크림',
  gray: '회색',
};

export const HEAD_LABELS: Record<(typeof HEADS)[number], string> = {
  none: '없음',
  strawHat: '밀짚모자',
  beanie: '비니',
  ribbon: '리본',
  cap: '모자',
};

export const EYES_LABELS: Record<(typeof EYES)[number], string> = {
  none: '없음',
  glasses: '안경',
  sunglasses: '선글라스',
};

export const NECK_LABELS: Record<(typeof NECKS)[number], string> = {
  none: '없음',
  scarf: '목도리',
  bowtie: '나비넥타이',
};

export const POSE_LABELS: Record<PoseKind, string> = {
  idle: '서성임',
  walk: '걷기',
  stand: '서 있기',
  sitType: '타이핑',
  sitEat: '식사',
  sitRead: '독서',
  sitSip: '커피',
  sitRest: '쉬기',
};
