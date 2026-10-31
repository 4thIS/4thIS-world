import { describe, expect, it } from 'vitest';
import { EMOJIS, MOTIONS, WEAPONS } from '@4this/shared';
import {
  SFX,
  SFX_NAMES,
  SfxLimiter,
  emoteRate,
  hitSfx,
  motionSfx,
  sfxDuration,
  shotSfx,
} from './sfx';

describe('합성 효과음 레시피', () => {
  it('모든 소리가 1.5초 안에 끝나고, 크기·높이가 들을 만한 범위다', () => {
    for (const name of SFX_NAMES) {
      expect(sfxDuration(name)).toBeGreaterThan(0);
      expect(sfxDuration(name)).toBeLessThan(1.5);
      for (const l of SFX[name]) {
        expect(l.gain).toBeGreaterThan(0);
        expect(l.gain).toBeLessThanOrEqual(1);
        expect(l.f0).toBeGreaterThan(20);
      }
    }
  });

  it('장난감·모션·이모지마다 소리가 있다', () => {
    for (const w of WEAPONS) {
      expect(SFX_NAMES).toContain(shotSfx(w));
      expect(SFX_NAMES).toContain(hitSfx(w));
    }
    for (const m of MOTIONS) expect(SFX_NAMES).toContain(motionSfx(m));
    expect(motionSfx('clap')).toBe('clap');
    expect(motionSfx('wave')).toBe('note');
    const rates = EMOJIS.map(emoteRate);
    expect(new Set(rates).size).toBe(EMOJIS.length);
  });
});

describe('SfxLimiter', () => {
  it('같은 소리가 40 ms 안에 또 오면 하나로 친다', () => {
    const lim = new SfxLimiter();
    expect(lim.tryPlay('door', 0, 500)).toBe(true);
    expect(lim.tryPlay('door', 20, 500)).toBe(false);
    expect(lim.tryPlay('door', 60, 500)).toBe(true);
  });

  it('동시에 12개까지만, 끝나면 다시 낸다', () => {
    const lim = new SfxLimiter(12);
    for (let i = 0; i < 12; i++) expect(lim.tryPlay(`s${i}`, 0, 300)).toBe(true);
    expect(lim.tryPlay('more', 1, 300)).toBe(false);
    expect(lim.tryPlay('more', 301, 300)).toBe(true);
  });
});
