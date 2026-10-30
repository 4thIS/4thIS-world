import { hashString, rand01, type Animal } from '@4this/shared';

/**
 * 채팅 대사음 (순수 계산). 알아들을 수 없지만 말하는 느낌의 짧은 소리를 글자마다 하나씩 낸다.
 * 녹음 파일 없이 Web Audio로 만든다(audio.ts). 동물마다 목소리 높이가 다르고, 멤버마다 조금씩 다르다.
 */

export interface Voice {
  /** 기본 음높이 (Hz) */
  base: number;
  wave: OscillatorType;
}

const ANIMAL_VOICE: Record<Animal, Voice> = {
  duck: { base: 520, wave: 'square' },
  cat: { base: 430, wave: 'triangle' },
  dog: { base: 340, wave: 'triangle' },
  bear: { base: 210, wave: 'triangle' },
};

/** 사자 교수님처럼 목록에 없는 동물 */
const DEFAULT_VOICE: Voice = { base: 260, wave: 'triangle' };

/** 동물 목소리에 멤버마다 ±10% 높낮이 */
export function voiceOf(animal: Animal | string, memberId: string): Voice {
  const v = ANIMAL_VOICE[animal as Animal] ?? DEFAULT_VOICE;
  return { ...v, base: v.base * (0.9 + rand01(memberId, 'voice') * 0.2) };
}

/** 소리 한 조각. freq가 0이면 쉼 */
export interface Syllable {
  freq: number;
  /** 길이 (초) */
  dur: number;
  /** 0~1 */
  gain: number;
}

/** 말하는 글자: 한글·영문·숫자 (공백은 쉼, 그 밖의 기호·이모지는 건너뛴다) */
const SPOKEN = /[\p{L}\p{N}]/u;

/** 글자 → 음높이 비율 (같은 글자는 늘 같은 음, 기본음 위아래 반음 6개 안쪽) */
function stepOf(ch: string): number {
  const semitone = (hashString(ch) % 13) - 6;
  return 2 ** (semitone / 12);
}

/** 채팅 한 줄 → 소리 조각들. '?'로 끝나면 마지막 음을 올리고, '!'가 있으면 크고 빠르게 */
export function syllablesOf(text: string, voice: Voice): Syllable[] {
  const excited = text.includes('!');
  const asking = text.trimEnd().endsWith('?');
  const dur = excited ? 0.05 : 0.065;
  const gain = excited ? 0.9 : 0.65;
  const out: Syllable[] = [];
  for (const ch of text) {
    if (/\s/.test(ch)) {
      if (out.length > 0 && out.at(-1)!.freq !== 0) out.push({ freq: 0, dur: 0.07, gain: 0 });
    } else if (SPOKEN.test(ch)) {
      out.push({ freq: voice.base * stepOf(ch), dur, gain });
    }
  }
  if (asking) {
    const last = [...out].reverse().find((s) => s.freq > 0);
    if (last) last.freq *= 1.35;
  }
  return out;
}

/** 카메라와의 거리(m) → 소리 크기 0~1. 가까우면(25 m 안) 최대, 110 m에서 0 (처음 시야는 약 65 m) */
export function volumeAt(distance: number): number {
  const near = 25;
  const far = 110;
  if (distance <= near) return 1;
  return Math.max(0, 1 - (distance - near) / (far - near));
}
