import { describe, expect, it } from 'vitest';
import { LookSchema, randomLook, resolveColor } from './look';

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
