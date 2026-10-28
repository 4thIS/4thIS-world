import { describe, expect, it } from 'vitest';
import { INTRO_KEY, hideIntroToday, shouldShowIntro, type KeyValueStore } from './introStorage';

const at = (iso: string) => Date.parse(iso);

function memory(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe('오늘 하루 보지 않기', () => {
  it('처음에는 보여 준다', () => {
    expect(shouldShowIntro(memory(), at('2026-10-28T10:00:00+09:00'))).toBe(true);
  });

  it('숨기면 다음 KST 자정 전까지 안 보이고, 자정이 지나면 다시 보인다', () => {
    const store = memory();
    hideIntroToday(store, at('2026-10-28T23:50:00+09:00'));
    expect(store.data.get(INTRO_KEY)).toBe(String(at('2026-10-29T00:00:00+09:00')));
    expect(shouldShowIntro(store, at('2026-10-28T23:59:59+09:00'))).toBe(false);
    expect(shouldShowIntro(store, at('2026-10-29T00:00:00+09:00'))).toBe(true);
  });

  it('UTC로는 전날이어도 KST 날짜 기준이다 (KST 00:30 → 그날 자정까지)', () => {
    const store = memory();
    hideIntroToday(store, at('2026-10-29T00:30:00+09:00'));
    expect(shouldShowIntro(store, at('2026-10-29T23:00:00+09:00'))).toBe(false);
    expect(shouldShowIntro(store, at('2026-10-30T00:00:01+09:00'))).toBe(true);
  });

  it('저장소가 없거나 고장 나면 매번 보여 주고, 숨기기는 조용히 넘어간다', () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('막힘');
      },
      setItem: () => {
        throw new Error('막힘');
      },
    };
    expect(shouldShowIntro(broken, 0)).toBe(true);
    expect(() => hideIntroToday(broken, 0)).not.toThrow();
    expect(shouldShowIntro(null, 0)).toBe(true);
  });

  it('값이 이상하면 보여 준다', () => {
    const store = memory();
    store.setItem(INTRO_KEY, '이상한 값');
    expect(shouldShowIntro(store, 0)).toBe(true);
  });
});
