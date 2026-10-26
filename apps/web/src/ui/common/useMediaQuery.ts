import { useSyncExternalStore } from 'react';

/** 모바일 레이아웃 기준 (설계 문서 §9: 640px 미만) */
export const MOBILE_QUERY = '(max-width: 639px)';

/** CSS 미디어 쿼리가 맞는지. matchMedia가 없으면(jsdom) false */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    },
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches,
    () => false,
  );
}
