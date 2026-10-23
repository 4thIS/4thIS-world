import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK } from '@4this/shared';
import { PROFESSOR_LOOK } from '../contracts';
import { characterColors } from './colors';
import { geo } from './geometries';
import { getMaterial, opacityStep } from './materials';

describe('geo 캐시', () => {
  it('같은 모양은 같은 객체를 돌려준다', () => {
    expect(geo.sphere(0.5)).toBe(geo.sphere(0.5));
    expect(geo.sphere(0.5)).not.toBe(geo.sphere(0.4));
    expect(geo.catTail()).toBe(geo.catTail());
  });
});

describe('getMaterial', () => {
  it('색·종류·투명도 단계가 같으면 공유한다', () => {
    expect(getMaterial('#ffffff', 10)).toBe(getMaterial('#ffffff', 10));
    expect(getMaterial('#ffffff', 10)).not.toBe(getMaterial('#ffffff', 10, 'glossy'));
  });

  it('불투명은 transparent=false, 반투명은 transparent=true', () => {
    expect(getMaterial('#123456', 10)).toMatchObject({ transparent: false, opacity: 1 });
    expect(getMaterial('#123456', 5)).toMatchObject({ transparent: true, opacity: 0.5 });
    expect(getMaterial('#123456', 10, 'blush')).toMatchObject({ transparent: true, opacity: 0.75 });
  });

  it('opacityStep은 0~10으로 자른다', () => {
    expect(opacityStep(1)).toBe(10);
    expect(opacityStep(0.34)).toBe(3);
    expect(opacityStep(-1)).toBe(0);
    expect(opacityStep(2)).toBe(10);
  });
});

describe('characterColors', () => {
  it('기본색과 더 진한 색을 만든다', () => {
    const c = characterColors(DEFAULT_LOOK);
    expect(c.fur).toBe('#f6dcc0');
    expect(c.dark).not.toBe(c.fur);
    expect(parseInt(c.dark.slice(1, 3), 16)).toBeLessThan(0xf6);
  });

  it('고양이는 분홍 코, 사자는 교수님 기본색', () => {
    expect(characterColors({ ...DEFAULT_LOOK, animal: 'cat' }).nose).toBe('#ff9fb6');
    expect(characterColors(PROFESSOR_LOOK).fur).toBe('#f5cf8e');
  });
});
