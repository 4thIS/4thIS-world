import { describe, expect, it } from 'vitest';
import { syllablesOf, voiceOf, volumeAt } from './voice';

describe('voiceOf', () => {
  it('동물마다 목소리 높이가 다르고, 같은 멤버는 늘 같다', () => {
    expect(voiceOf('duck', 'm1').base).toBeGreaterThan(voiceOf('bear', 'm1').base);
    expect(voiceOf('cat', 'm1')).toEqual(voiceOf('cat', 'm1'));
    expect(voiceOf('cat', 'm1').base).not.toBe(voiceOf('cat', 'm2').base);
  });
});

describe('syllablesOf', () => {
  const v = voiceOf('dog', 'm1');

  it('글자마다 짧은 소리 하나, 공백은 쉼, 이모지·기호는 건너뛴다', () => {
    const s = syllablesOf('안녕 하세요 👋!', v);
    expect(s.filter((x) => x.freq > 0)).toHaveLength(5);
    expect(s.some((x) => x.freq === 0)).toBe(true); // 공백 쉼
  });

  it('같은 글자는 같은 음, 길이에 비례해 길어진다', () => {
    const a = syllablesOf('가가', v);
    expect(a[0]!.freq).toBe(a[1]!.freq);
    const total = (t: string) => syllablesOf(t, v).reduce((s, x) => s + x.dur, 0);
    expect(total('가나다라마바사')).toBeGreaterThan(total('가나'));
  });

  it('?로 끝나면 마지막 음을 올린다', () => {
    const plain = syllablesOf('뭐해', v).at(-1)!.freq;
    const ask = syllablesOf('뭐해?', v).at(-1)!.freq;
    expect(ask).toBeGreaterThan(plain);
  });

  it('!면 더 크고 빠르다', () => {
    const calm = syllablesOf('좋아', v)[0]!;
    const loud = syllablesOf('좋아!', v)[0]!;
    expect(loud.gain).toBeGreaterThan(calm.gain);
    expect(loud.dur).toBeLessThan(calm.dur);
  });
});

describe('volumeAt', () => {
  it('가까울수록 크고, 멀면 들리지 않는다', () => {
    expect(volumeAt(5)).toBe(1);
    expect(volumeAt(67.5)).toBeCloseTo(0.5);
    expect(volumeAt(120)).toBe(0);
  });
});
