import { Vector3 } from 'three';
import type { AmbientMix } from './ambient';
import { SFX, SfxLimiter, sfxDuration, type SfxName } from './sfx';
import { STEP_FILE_COUNT, STEP_FILE_PREFIX, type Surface } from './steps';
import { LEAD_SEC, SLOT_SEC, VOICE_URL, volumeAt, type Syllable } from './voice';

/**
 * Web Audio로 소리를 낸다. AudioContext는 소리를 켤 때(사용자가 누를 때) 만든다:
 * 브라우저는 사용자 조작 전에는 소리를 내지 못하게 한다. 대사음 재료(voice.mp3, 약 64 KB)도 그때 받는다.
 * 소리는 갈래(배경음악·효과음·목소리)마다 크기 손잡이(GainNode)를 거쳐 나간다.
 */
export const SOUND_CHANNELS = ['music', 'sfx', 'voice'] as const;
export type SoundChannel = (typeof SOUND_CHANNELS)[number];

let ctx: AudioContext | null = null;
let voice: AudioBuffer | null = null;
let noise: AudioBuffer | null = null;
let loading: Promise<void> | null = null;
let enabled = false;
const volumes: Record<SoundChannel, number> = { music: 0.5, sfx: 0.7, voice: 0.7 };
const buses = new Map<SoundChannel, GainNode>();
const limiter = new SfxLimiter();

/** 다른 캐릭터 소리의 크기를 정하는 카메라 위치 (SoundListener가 매 프레임 기록) */
export const listener = new Vector3(0, 40, 60);

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

function bus(c: AudioContext, ch: SoundChannel): GainNode {
  let g = buses.get(ch);
  if (!g) {
    g = c.createGain();
    g.gain.value = volumes[ch];
    g.connect(c.destination);
    buses.set(ch, g);
  }
  return g;
}

/** 갈래 크기 0~1 (useSound가 부른다) */
export function setChannelVolume(ch: SoundChannel, v: number): void {
  volumes[ch] = v;
  const g = buses.get(ch);
  if (g && ctx) g.gain.setTargetAtTime(v, ctx.currentTime, 0.03);
}

/** 전체 켜기/끄기 (useSound가 부른다) */
export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

/** 소리를 켤 때 부른다 (버튼 클릭 안에서) */
export function unlockAudio(): void {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return;
  ctx ??= new AudioContext();
  void ctx.resume();
  void loadVoice(ctx);
  loadSteps(ctx);
}

function ready(): AudioContext | null {
  return enabled && ctx && ctx.state === 'running' ? ctx : null;
}

/** 소리 조각들을 이어서 낸다. volume 0~1(거리). 재료를 받는 중이면 받은 뒤에 낸다 */
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
  round.connect(out).connect(bus(ctx, 'voice'));

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

/** 1초짜리 흰 잡음 (처음 한 번 만든다) */
function noiseBuffer(c: AudioContext): AudioBuffer {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noise;
}

/** 합성 효과음. volume 0~1, rate는 높이 배율 */
export function playSfx(name: SfxName, volume = 1, rate = 1): void {
  const c = ready();
  if (!c || volume <= 0.01) return;
  if (!limiter.tryPlay(name, performance.now(), sfxDuration(name) * 1000)) return;
  const out = bus(c, 'sfx');
  const start = c.currentTime + 0.01;
  for (const l of SFX[name]) {
    const t = start + (l.at ?? 0);
    const env = c.createGain();
    // 짧게 들어가고 지수로 사라진다 (딸깍 소리 없이)
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(l.gain * volume, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + l.dur);
    let src: AudioScheduledSourceNode;
    if (l.wave === 'noise') {
      const n = c.createBufferSource();
      n.buffer = noiseBuffer(c);
      n.loop = true;
      src = n;
    } else {
      const o = c.createOscillator();
      o.type = l.wave;
      o.frequency.setValueAtTime(l.f0 * rate, t);
      if (l.f1 !== undefined) o.frequency.exponentialRampToValueAtTime(l.f1 * rate, t + l.dur);
      src = o;
    }
    let node: AudioNode = src;
    if (l.filter) {
      const f = c.createBiquadFilter();
      f.type = l.filter.type;
      f.frequency.value = l.filter.freq * rate;
      f.Q.value = l.filter.q ?? 0.7;
      node = node.connect(f);
    }
    node.connect(env).connect(out);
    src.start(t);
    src.stop(t + l.dur + 0.02);
  }
}

/** 캠퍼스 어딘가에서 나는 효과음: 카메라에서 멀수록 작게, 너무 멀면 내지 않는다 */
export function playSfxAt(name: SfxName, at: { x: number; y: number; z: number }, rate = 1): void {
  if (!ready()) return;
  playSfx(name, volumeAt(listener.distanceTo(new Vector3(at.x, at.y, at.z))), rate);
}

/** Kenney 발소리 파일 (앞부분 → 받은 소리들). 파일이 없으면 비어 있고 합성 발소리를 쓴다 */
const stepBuffers = new Map<string, AudioBuffer[]>();
let stepsRequested = false;

function loadSteps(c: AudioContext): void {
  if (stepsRequested) return;
  stepsRequested = true;
  for (const prefix of new Set(Object.values(STEP_FILE_PREFIX))) {
    const urls = Array.from(
      { length: STEP_FILE_COUNT },
      (_, i) => `/sound/steps/${prefix}_${String(i).padStart(3, '0')}.ogg`,
    );
    void Promise.all(
      urls.map((u) =>
        fetch(u)
          .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(u))))
          .then((buf) => c.decodeAudioData(buf))
          .catch(() => null),
      ),
    ).then((list) => {
      const ok = list.filter((b): b is AudioBuffer => b !== null);
      if (ok.length > 0) stepBuffers.set(prefix, ok);
    });
  }
}

const SYNTH_STEP: Record<Surface, SfxName> = {
  path: 'stepPath',
  grass: 'stepGrass',
  indoor: 'stepIndoor',
  stairs: 'stepIndoor',
};

/** 한 걸음. volume 0~1 (내 캐릭터 1, 다른 캐릭터는 작게). 계단은 조금 높고 또렷하게 */
export function playStep(
  surface: Surface,
  at: { x: number; y: number; z: number },
  volume: number,
) {
  const c = ready();
  if (!c) return;
  const v = volume * volumeAt(listener.distanceTo(new Vector3(at.x, at.y, at.z)));
  if (v <= 0.01) return;
  const stairs = surface === 'stairs';
  const rate = (stairs ? 1.15 : 1) * (0.94 + Math.random() * 0.12);
  const bufs = stepBuffers.get(STEP_FILE_PREFIX[surface]);
  if (!bufs) {
    playSfx(SYNTH_STEP[surface], v * (stairs ? 1.2 : 1), rate);
    return;
  }
  const buf = bufs[Math.floor(Math.random() * bufs.length)]!;
  if (!limiter.tryPlay(`step:${surface}`, performance.now(), (buf.duration / rate) * 1000)) return;
  const src = c.createBufferSource();
  const g = c.createGain();
  src.buffer = buf;
  src.playbackRate.value = rate;
  g.gain.value = 0.5 * v * (stairs ? 1.2 : 1);
  src.connect(g).connect(bus(c, 'sfx'));
  src.start();
}

/** 계속 깔리는 빗소리·바람 (잡음 하나를 걸러 두 갈래로) */
let ambient: { rain: GainNode; wind: GainNode } | null = null;

function startAmbient(c: AudioContext): { rain: GainNode; wind: GainNode } {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c);
  src.loop = true;
  const out = bus(c, 'sfx');

  // 빗소리: 높은 쪽 잡음
  const rainHi = c.createBiquadFilter();
  rainHi.type = 'highpass';
  rainHi.frequency.value = 500;
  const rainLo = c.createBiquadFilter();
  rainLo.type = 'lowpass';
  rainLo.frequency.value = 2600;
  const rain = c.createGain();
  rain.gain.value = 0;
  src.connect(rainHi).connect(rainLo).connect(rain).connect(out);

  // 바람: 낮은 쪽 잡음을 천천히 부풀렸다 줄인다
  const windLo = c.createBiquadFilter();
  windLo.type = 'lowpass';
  windLo.frequency.value = 380;
  const swell = c.createGain();
  swell.gain.value = 0.6;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.13;
  const lfoDepth = c.createGain();
  lfoDepth.gain.value = 0.4;
  lfo.connect(lfoDepth).connect(swell.gain);
  const wind = c.createGain();
  wind.gain.value = 0;
  src.connect(windLo).connect(swell).connect(wind).connect(out);

  src.start();
  lfo.start();
  return { rain, wind };
}

/** 환경 소리 양을 맞춘다 (1초마다). 소리가 꺼져 있으면 조용히 */
export function setAmbient(mix: AmbientMix): void {
  const c = ready();
  if (!c) {
    if (ambient && ctx) {
      ambient.rain.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
      ambient.wind.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
    }
    return;
  }
  ambient ??= startAmbient(c);
  ambient.rain.gain.setTargetAtTime(mix.rain * 0.16, c.currentTime, 1);
  ambient.wind.gain.setTargetAtTime(mix.wind * 0.3, c.currentTime, 1.5);
}
