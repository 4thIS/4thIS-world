import { describe, expect, it } from 'vitest';
import { ANIMALS, DEFAULT_LOOK, LookSchema, randomLook, resolveColor } from './look';

describe('LookSchema', () => {
  it('정해진 값만 통과한다', () => {
    const ok = { animal: 'cat', color: 'mint', head: 'beanie', eyes: 'glasses', neck: 'scarf' };
    const lion = { animal: 'lion', color: 'default', head: 'none', eyes: 'none', neck: 'none' };
    expect(LookSchema.safeParse(ok).success).toBe(true);
    expect(LookSchema.safeParse(lion).success).toBe(false);
  });
});

describe('randomLook', () => {
  it('항상 유효한 조합을 만든다', () => {
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    for (let i = 0; i < 200; i++) {
      expect(LookSchema.safeParse(randomLook(random)).success).toBe(true);
    }
  });
});

describe('resolveColor', () => {
  it('default면 동물 기본색, 아니면 팔레트', () => {
    expect(resolveColor('dog', 'default')).toBe('#f6dcc0');
    expect(resolveColor('dog', 'mint')).toBe('#cdeedd');
  });
});

describe('동물·장식 추가 (2026-10-30)', () => {
  it('새 동물 4종과 장식 8개를 받고, 예전 생김새도 그대로 읽는다', () => {
    for (const animal of ['rabbit', 'panda', 'fox', 'penguin'] as const) {
      expect(LookSchema.parse({ ...DEFAULT_LOOK, animal }).animal).toBe(animal);
    }
    expect(
      LookSchema.parse({
        animal: 'fox',
        color: 'mint',
        head: 'crown',
        eyes: 'goggles',
        neck: 'cape',
      }),
    ).toBeTruthy();
    for (const head of ['flowerPin', 'gradCap', 'headphones'] as const) {
      expect(LookSchema.parse({ ...DEFAULT_LOOK, head }).head).toBe(head);
    }
    for (const neck of ['necktie', 'backpack'] as const) {
      expect(LookSchema.parse({ ...DEFAULT_LOOK, neck }).neck).toBe(neck);
    }
    expect(
      LookSchema.parse({
        animal: 'duck',
        color: 'sky',
        head: 'cap',
        eyes: 'glasses',
        neck: 'bowtie',
      }),
    ).toEqual({ animal: 'duck', color: 'sky', head: 'cap', eyes: 'glasses', neck: 'bowtie' });
  });

  it('새 동물도 기본 색이 있다', () => {
    for (const animal of ANIMALS) expect(resolveColor(animal, 'default')).toMatch(/^#[0-9a-f]{6}$/);
  });
});
