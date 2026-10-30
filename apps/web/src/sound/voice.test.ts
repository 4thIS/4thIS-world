import { describe, expect, it } from 'vitest';
import { SLOT_COUNT, slotOf, syllablesOf, voiceOf, volumeAt } from './voice';

describe('slotOf (글자 → 재료 조각)', () => {
  it('한글은 첫소리 묶음 × 모음 묶음 자리로', () => {
    expect(slotOf('가')).toBe(0); // ㄱ+ㅏ
    expect(slotOf('카')).toBe(slotOf('가')); // ㅋ은 ㄱ 묶음
    expect(slotOf('헤')).toBe(SLOT_COUNT - 1); // ㅎ+ㅔ (마지막 자리)
    expect(slotOf('안')).toBe(slotOf('아')); // 받침은 무시
    expect(slotOf('와')).toBe(slotOf('아'));
    expect(slotOf('쉬')).toBe(slotOf('시'));
  });

  it('ㅋㅋ·ㅎㅎ 같은 낱자, 영문·숫자도 비슷한 소리로', () => {
    expect(slotOf('ㅋ')).toBe(slotOf('그'));
    expect(slotOf('ㅠ')).toBe(slotOf('우'));
    expect(slotOf('a')).toBe(slotOf('아'));
    expect(slotOf('B')).toBe(slotOf('버'));
    expect(slotOf('7')).toBe(slotOf('이'));
  });

  it('공백·기호·이모지는 소리 없음', () => {
    expect(slotOf(' ')).toBeNull();
    expect(slotOf('!')).toBeNull();
    expect(slotOf('👋')).toBeNull();
  });
});

describe('voiceOf', () => {
  it('동물마다 높이(재생 속도)가 다르고, 같은 멤버는 늘 같다', () => {
    expect(voiceOf('duck', 'm1').rate).toBeGreaterThan(voiceOf('bear', 'm1').rate);
    expect(voiceOf('cat', 'm1')).toEqual(voiceOf('cat', 'm1'));
    expect(voiceOf('cat', 'm1').rate).not.toBe(voiceOf('cat', 'm2').rate);
  });
});

describe('syllablesOf', () => {
  const v = voiceOf('dog', 'm1');

  it('말하는 글자마다 조각 하나, 공백은 쉼, 이모지·기호는 건너뛴다', () => {
    const s = syllablesOf('안녕 하세요 👋!', v);
    expect(s.filter((x) => x.slot !== null)).toHaveLength(5);
    expect(s.some((x) => x.slot === null)).toBe(true);
  });

  it('길이에 비례해 길어진다', () => {
    const total = (t: string) => syllablesOf(t, v).reduce((s, x) => s + x.dur, 0);
    expect(total('가나다라마바사')).toBeGreaterThan(total('가나'));
  });

  it('?로 끝나면 마지막 글자를 높이고, !면 크고 빠르다', () => {
    expect(syllablesOf('뭐해?', v).at(-1)!.rate).toBeGreaterThan(
      syllablesOf('뭐해', v).at(-1)!.rate,
    );
    const calm = syllablesOf('좋아', v)[0]!;
    const loud = syllablesOf('좋아!', v)[0]!;
    expect(loud.gain).toBeGreaterThan(calm.gain);
    expect(loud.dur).toBeLessThan(calm.dur);
  });

  it('글자마다 높이가 살짝 달라 노래하듯 오르내린다 (같은 글자는 같다)', () => {
    const s = syllablesOf('가나가', v);
    expect(s[0]!.rate).toBe(s[2]!.rate);
    expect(s[0]!.rate).not.toBe(s[1]!.rate);
  });
});

describe('volumeAt', () => {
  it('가까울수록 크고, 멀면 들리지 않는다', () => {
    expect(volumeAt(5)).toBe(1);
    expect(volumeAt(67.5)).toBeCloseTo(0.5);
    expect(volumeAt(120)).toBe(0);
  });
});
