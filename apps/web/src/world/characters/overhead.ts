/** 머리 위 표시(이름표·이모지 말풍선)의 순수 로직. 설계 문서 §6.3 */

export type LabelMode = 'full' | 'name' | 'hidden';

/** 카메라와 이 거리(m)보다 가까우면 `이름 · 상태` 전체 */
export const LABEL_FULL_DIST = 28;
/** 이 거리보다 가까우면 이름만, 더 멀면 숨김 */
export const LABEL_NAME_DIST = 55;

export function labelMode(distance: number): LabelMode {
  if (distance < LABEL_FULL_DIST) return 'full';
  if (distance < LABEL_NAME_DIST) return 'name';
  return 'hidden';
}

/** 이름표 문구. 보여 줄 것이 없으면 null */
export function labelText(
  name: string | undefined,
  status: string | undefined,
  mode: LabelMode,
): string | null {
  if (!name || mode === 'hidden') return null;
  if (mode === 'full' && status) return `${name} · ${status}`;
  return name;
}

/** 이모지 말풍선이 떠 있는 시간(ms) */
export const EMOTE_DURATION_MS = 3000;
const POP_MS = 350;
const FADE_MS = 400;

export interface EmoteFrame {
  /** CSS scale */
  scale: number;
  /** 0~1 */
  opacity: number;
  /** 위로 떠오른 정도(px) */
  rise: number;
}

/**
 * 받은 뒤 지난 시간(ms) → 말풍선 모양. 튀어나와(0.35초, 1.2배까지 커졌다 1배) 떠 있다가
 * 마지막 0.4초에 사라진다. 3초가 지나면 null
 */
export function emoteFrame(elapsedMs: number): EmoteFrame | null {
  const e = Math.max(0, elapsedMs);
  if (e >= EMOTE_DURATION_MS) return null;
  let scale = 1;
  if (e < 200) scale = (e / 200) * 1.2;
  else if (e < POP_MS) scale = 1.2 - ((e - 200) / (POP_MS - 200)) * 0.2;
  const opacity = Math.min(1, (EMOTE_DURATION_MS - e) / FADE_MS);
  const rise = Math.min(1, e / 300) * 12;
  return { scale, opacity, rise };
}
