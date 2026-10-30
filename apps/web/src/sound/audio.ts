import { LEAD_SEC, SLOT_SEC, VOICE_URL, type Syllable } from './voice';

/**
 * Web Audio로 대사음을 낸다. AudioContext는 소리를 켤 때(사용자가 누를 때) 만든다:
 * 브라우저는 사용자 조작 전에는 소리를 내지 못하게 한다. 재료(voice.mp3, 약 64 KB)도 그때 받는다.
 */
let ctx: AudioContext | null = null;
let voice: AudioBuffer | null = null;
let loading: Promise<void> | null = null;

function loadVoice(c: AudioContext): Promise<void> {
  loading ??= fetch(VOICE_URL)
    .then((res) => res.arrayBuffer())
    .then((buf) => c.decodeAudioData(buf))
    .then((decoded) => {
      voice = decoded;
    })
    .catch(() => {
      loading = null; // 다음에 다시 시도
    });
  return loading;
}

/** 소리를 켤 때 부른다 (버튼 클릭 안에서) */
export function unlockAudio(): void {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return;
  ctx ??= new AudioContext();
  void ctx.resume();
  void loadVoice(ctx);
}

/** 소리 조각들을 이어서 낸다. volume 0~1. 재료를 받는 중이면 받은 뒤에 낸다 */
export function speak(syllables: readonly Syllable[], volume: number): void {
  if (!ctx || volume <= 0.01) return;
  if (!voice) {
    // 소리를 켜자마자 보낸 첫 채팅: 재료를 다 받으면 바로 낸다
    void loading?.then(() => voice && speak(syllables, volume));
    return;
  }
  if (ctx.state !== 'running') return;
  const out = ctx.createGain();
  out.gain.value = 0.9 * volume;
  // 높게 올린 소리의 쨍한 부분을 깎아 둥글게
  const round = ctx.createBiquadFilter();
  round.type = 'lowpass';
  round.frequency.value = 2800;
  round.Q.value = 0.5;
  round.connect(out).connect(ctx.destination);

  let t = ctx.currentTime + 0.02;
  for (const s of syllables) {
    if (s.slot !== null) {
      const src = ctx.createBufferSource();
      const env = ctx.createGain();
      src.buffer = voice;
      src.playbackRate.value = s.rate;
      // 조각 앞부분(첫소리 + 모음)만 빠르게: 들리는 길이 dur 동안 원래 소리 dur × rate만큼 지나간다
      // 부드럽게 들어가고 나와서 뚝뚝 끊기지 않게 (둥근 소리)
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(s.gain, t + 0.012);
      env.gain.setValueAtTime(s.gain, t + s.dur - 0.02);
      env.gain.linearRampToValueAtTime(0, t + s.dur);
      src.connect(env).connect(round);
      src.start(t, s.slot * SLOT_SEC + LEAD_SEC, s.dur * s.rate);
    }
    t += s.dur + 0.008;
  }
}
