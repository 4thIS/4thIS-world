import { DAY_MS, kstDate, kstMidnight } from '@4this/shared';

/** "오늘 하루 보지 않기"를 누른 뒤 다시 보여 줄 시각(epoch ms) */
export const INTRO_KEY = '4this-intro-hidden-until';

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

/** 브라우저 저장소. 막혀 있으면(사파리 사생활 보호 등) null */
export function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 소개 모달을 띄울지. 저장소를 못 쓰면 매번 띄운다 */
export function shouldShowIntro(store: KeyValueStore | null, now: number): boolean {
  try {
    const until = Number(store?.getItem(INTRO_KEY));
    return !(Number.isFinite(until) && until > now);
  } catch {
    return true;
  }
}

/** 다음 KST 자정까지 숨긴다 */
export function hideIntroToday(store: KeyValueStore | null, now: number): void {
  try {
    store?.setItem(INTRO_KEY, String(kstMidnight(kstDate(now)) + DAY_MS));
  } catch {
    // 저장소가 막혀 있으면 다음에 또 보일 뿐이다
  }
}
