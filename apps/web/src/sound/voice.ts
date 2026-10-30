import { hashString, rand01, type Animal } from '@4this/shared';

/**
 * 채팅 대사음 (순수 계산). 알아들을 수 없지만 말하는 느낌의 소리:
 * 글자마다 그 글자와 비슷한 소리 조각(오픈소스 TTS로 미리 만든 public/sound/voice.mp3)을
 * 아주 짧게, 빠르고 높게 이어 재생한다(audio.ts). 동물마다 높이가 다르고 멤버마다 조금씩 다르다.
 * 재료 만들기: scripts/voice/README.md
 */

/** 재료 파일의 자리 규칙 (scripts/voice/gen_voice.py와 같아야 한다) */
export const VOICE_URL = '/sound/voice.mp3';
export const SLOT_SEC = 0.25;
export const LEAD_SEC = 0.04;
/** 첫소리 묶음 ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅎ × 모음 묶음 ㅏㅓㅗㅜㅡㅣㅔ */
const INITIAL_GROUPS = 10;
const VOWEL_GROUPS = 7;
export const SLOT_COUNT = INITIAL_GROUPS * VOWEL_GROUPS;

/** 한글 첫소리 19개 → 묶음 (ㄲㅋ→ㄱ, ㄸㅌ→ㄷ, ㅃㅍ→ㅂ, ㅆ→ㅅ, ㅉㅊ→ㅈ) */
const INITIAL_TO_GROUP = [0, 0, 1, 2, 2, 3, 4, 5, 5, 6, 6, 7, 8, 8, 8, 0, 2, 5, 9];
/** 한글 모음 21개 → 묶음 (0 ㅏ, 1 ㅓ, 2 ㅗ, 3 ㅜ, 4 ㅡ, 5 ㅣ, 6 ㅔ) */
const VOWEL_TO_GROUP = [0, 6, 0, 6, 1, 6, 1, 6, 2, 0, 6, 6, 2, 3, 1, 6, 5, 3, 4, 5, 5];

/** 낱자(ㄱ~ㅎ, ㅏ~ㅣ) → 같은 소리의 묶음 */
const JAMO_CONSONANT: Record<string, number> = {
  ㄱ: 0,
  ㄲ: 0,
  ㅋ: 0,
  ㄴ: 1,
  ㄷ: 2,
  ㄸ: 2,
  ㅌ: 2,
  ㄹ: 3,
  ㅁ: 4,
  ㅂ: 5,
  ㅃ: 5,
  ㅍ: 5,
  ㅅ: 6,
  ㅆ: 6,
  ㅇ: 7,
  ㅈ: 8,
  ㅉ: 8,
  ㅊ: 8,
  ㅎ: 9,
};
const JAMO_VOWEL: Record<string, number> = {
  ㅏ: 0,
  ㅑ: 0,
  ㅘ: 0,
  ㅓ: 1,
  ㅕ: 1,
  ㅝ: 1,
  ㅗ: 2,
  ㅛ: 2,
  ㅜ: 3,
  ㅠ: 3,
  ㅡ: 4,
  ㅣ: 5,
  ㅟ: 5,
  ㅢ: 5,
  ㅐ: 6,
  ㅒ: 6,
  ㅔ: 6,
  ㅖ: 6,
  ㅚ: 6,
};
/** 영문 → [첫소리 묶음, 모음 묶음]. 모음은 '아·에·이·오·우', 자음은 '어'를 붙인 소리 */
const LATIN: Record<string, [number, number]> = {
  a: [7, 0],
  e: [7, 6],
  i: [7, 5],
  o: [7, 2],
  u: [7, 3],
  y: [7, 5],
  w: [7, 3],
  b: [5, 1],
  c: [0, 1],
  d: [2, 1],
  f: [5, 1],
  g: [0, 1],
  h: [9, 1],
  j: [8, 1],
  k: [0, 1],
  l: [3, 1],
  m: [4, 1],
  n: [1, 1],
  p: [5, 1],
  q: [0, 1],
  r: [3, 1],
  s: [6, 1],
  t: [2, 1],
  v: [5, 1],
  x: [6, 1],
  z: [8, 1],
};

const slot = (initial: number, vowel: number) => initial * VOWEL_GROUPS + vowel;

/** 글자 → 재료 조각 번호. 소리 내지 않는 글자(공백·기호·이모지)는 null */
export function slotOf(ch: string): number | null {
  const code = ch.codePointAt(0)!;
  if (code >= 0xac00 && code <= 0xd7a3) {
    const s = code - 0xac00;
    return slot(
      INITIAL_TO_GROUP[Math.floor(s / 588)]!,
      VOWEL_TO_GROUP[Math.floor((s % 588) / 28)]!,
    );
  }
  if (ch in JAMO_CONSONANT) return slot(JAMO_CONSONANT[ch]!, 4); // ㅋㅋ → 크크
  if (ch in JAMO_VOWEL) return slot(7, JAMO_VOWEL[ch]!); // ㅠㅠ → 우우
  const latin = LATIN[ch.toLowerCase()];
  if (latin) return slot(latin[0], latin[1]);
  if (/\p{N}/u.test(ch)) return slot(7, 5); // 숫자는 '이'
  return null;
}

export interface Voice {
  /** 재생 속도 = 높이 (1이면 원래 목소리) */
  rate: number;
}

/** 동물마다 높이: 오리가 가장 높고 곰이 가장 낮다. 사자 교수님 같은 그 밖의 동물은 낮게 */
const ANIMAL_RATE: Record<Animal, number> = { duck: 2.05, cat: 1.85, dog: 1.65, bear: 1.3 };

/** 동물 목소리에 멤버마다 ±6% */
export function voiceOf(animal: Animal | string, memberId: string): Voice {
  const base = ANIMAL_RATE[animal as Animal] ?? 1.35;
  return { rate: base * (0.94 + rand01(memberId, 'voice') * 0.12) };
}

/** 소리 한 조각. slot이 null이면 쉼 */
export interface Syllable {
  slot: number | null;
  /** 들리는 길이 (초) */
  dur: number;
  /** 재생 속도 (높이) */
  rate: number;
  /** 0~1 */
  gain: number;
}

/** 글자마다 높이를 살짝 다르게 (같은 글자는 늘 같다): 노래하듯 오르내린다 */
const lilt = (ch: string) => 1 + ((hashString(ch) % 9) - 4) * 0.025;

/** 채팅 한 줄 → 소리 조각들. '?'로 끝나면 마지막 글자를 높이고, '!'가 있으면 크고 빠르게 */
export function syllablesOf(text: string, voice: Voice): Syllable[] {
  const excited = text.includes('!');
  const asking = text.trimEnd().endsWith('?');
  const dur = excited ? 0.062 : 0.075;
  const gain = excited ? 1 : 0.8;
  const out: Syllable[] = [];
  for (const ch of text) {
    if (/\s/.test(ch)) {
      if (out.length > 0 && out.at(-1)!.slot !== null) {
        out.push({ slot: null, dur: 0.06, rate: 1, gain: 0 });
      }
      continue;
    }
    const s = slotOf(ch);
    if (s !== null) out.push({ slot: s, dur, rate: voice.rate * lilt(ch), gain });
  }
  if (asking) {
    const last = [...out].reverse().find((s) => s.slot !== null);
    if (last) last.rate *= 1.25;
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
