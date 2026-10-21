import { z } from 'zod';

export const ANIMALS = ['dog', 'cat', 'bear', 'duck'] as const;
export type Animal = (typeof ANIMALS)[number];

export const HEADS = ['none', 'strawHat', 'beanie', 'ribbon', 'cap'] as const;
export const EYES = ['none', 'glasses', 'sunglasses'] as const;
export const NECKS = ['none', 'scarf', 'bowtie'] as const;

export const PALETTE = {
  pink: '#ffd6e2',
  mint: '#cdeedd',
  sky: '#cfe6fb',
  lavender: '#e2dcf3',
  lemon: '#fff1a8',
  peach: '#ffd9c2',
  cream: '#fbf3e4',
  gray: '#e4e1e8',
} as const;

export const COLOR_KEYS = [
  'default',
  'pink',
  'mint',
  'sky',
  'lavender',
  'lemon',
  'peach',
  'cream',
  'gray',
] as const;
export type ColorKey = (typeof COLOR_KEYS)[number];

/** 'lion'은 사자 교수님 NPC 전용이라 ANIMALS에 없다 */
export const ANIMAL_DEFAULT_COLOR: Record<Animal | 'lion', string> = {
  dog: '#f6dcc0',
  cat: '#e2dcf3',
  bear: '#e9c7a8',
  duck: '#fff1a8',
  lion: '#f5cf8e',
};

export const LookSchema = z.object({
  animal: z.enum(ANIMALS),
  color: z.enum(COLOR_KEYS),
  head: z.enum(HEADS),
  eyes: z.enum(EYES),
  neck: z.enum(NECKS),
});
export type Look = z.infer<typeof LookSchema>;

export const DEFAULT_LOOK: Look = {
  animal: 'dog',
  color: 'default',
  head: 'none',
  eyes: 'none',
  neck: 'none',
};

export function resolveColor(animal: Animal | 'lion', color: ColorKey): string {
  return color === 'default' ? ANIMAL_DEFAULT_COLOR[animal] : PALETTE[color];
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)] as T;
}

export function randomLook(random: () => number = Math.random): Look {
  return {
    animal: pick(ANIMALS, random),
    color: pick(COLOR_KEYS, random),
    head: pick(HEADS, random),
    eyes: pick(EYES, random),
    neck: pick(NECKS, random),
  };
}
