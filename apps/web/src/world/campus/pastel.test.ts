import { describe, expect, it } from 'vitest';
import { mixHex, pastelHex, pastelizePixels, pastelRgb } from './pastel';

describe('pastelRgb', () => {
  it('빨강은 채도가 빠지고 크림빛과 반씩 섞인다', () => {
    const [r, g, b] = pastelRgb(255, 0, 0);
    expect(r).toBeCloseTo(223.718, 2);
    expect(g).toBeCloseTo(132.343, 2);
    expect(b).toBeCloseTo(135.843, 2);
  });

  it('흰색은 크림빛 쪽으로, 검정은 중간 회색 쪽으로 간다', () => {
    expect(pastelRgb(255, 255, 255)).toEqual([255, 246.5, 250]);
    expect(pastelRgb(0, 0, 0)).toEqual([127.5, 119, 122.5]);
  });
});

describe('pastelizePixels', () => {
  it('RGB만 바꾸고 알파는 그대로 둔다', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 128, 0, 0, 0, 255]);
    pastelizePixels(data);
    expect(Array.from(data)).toEqual([224, 132, 136, 128, 128, 119, 122, 255]);
  });
});

describe('pastelHex', () => {
  it('#rrggbb를 파스텔 #rrggbb로 바꾼다', () => {
    expect(pastelHex('#ff0000')).toBe('#e08488');
    expect(pastelHex('#ffffff')).toBe('#fff7fa');
    expect(pastelHex('000000')).toBe('#80777b');
  });
});

describe('mixHex', () => {
  it('t=0이면 a, t=1이면 b, 0.5면 중간', () => {
    expect(mixHex('#000000', '#ffffff', 0)).toBe('#000000');
    expect(mixHex('#000000', '#ffffff', 1)).toBe('#ffffff');
    expect(mixHex('#000000', '#ff8040', 0.5)).toBe('#804020');
  });
});
