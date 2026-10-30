import type { Syllable, Voice } from './voice';

/**
 * Web Audio로 대사음을 낸다. AudioContext는 소리를 켤 때(사용자가 누를 때) 만든다:
 * 브라우저는 사용자 조작 전에는 소리를 내지 못하게 한다.
 */
let ctx: AudioContext | null = null;

/** 소리를 켤 때 부른다 (버튼 클릭 안에서) */
export function unlockAudio(): void {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return;
  ctx ??= new AudioContext();
  void ctx.resume();
}

/** 소리 조각들을 이어서 낸다. volume 0~1 */
export function speak(syllables: readonly Syllable[], voice: Voice, volume: number): void {
  if (!ctx || ctx.state !== 'running' || volume <= 0.01) return;
  const out = ctx.createGain();
  out.gain.value = 0.18 * volume;
  // 높은 소리가 쨍하지 않게 부드럽게 깎는다
  const soft = ctx.createBiquadFilter();
  soft.type = 'lowpass';
  soft.frequency.value = 2200;
  soft.connect(out).connect(ctx.destination);

  let t = ctx.currentTime + 0.02;
  for (const s of syllables) {
    if (s.freq > 0) {
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = voice.wave;
      // 한 음 안에서 살짝 내려가 "뽀" 하는 느낌
      osc.frequency.setValueAtTime(s.freq * 1.08, t);
      osc.frequency.exponentialRampToValueAtTime(s.freq, t + s.dur);
      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(s.gain, t + 0.008);
      env.gain.exponentialRampToValueAtTime(0.0001, t + s.dur);
      osc.connect(env).connect(soft);
      osc.start(t);
      osc.stop(t + s.dur + 0.01);
    }
    t += s.dur + 0.012;
  }
}
