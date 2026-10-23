import type { Animal } from '@4this/shared';
import { bear } from './bear';
import { cat } from './cat';
import { dog } from './dog';
import { duck } from './duck';
import { lion } from './lion';
import type { AnimalParts } from './types';

export type { AnimalParts, PartProps } from './types';

/** 동물 → 부품. 동물을 더할 때는 파일 하나와 이 표 한 줄만 더한다 */
export const ANIMAL_PARTS: Record<Animal | 'lion', AnimalParts> = { dog, cat, bear, duck, lion };
