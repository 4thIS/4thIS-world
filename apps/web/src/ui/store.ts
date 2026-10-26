import { create } from 'zustand';

/** 월드 위에 뜨는 화면. 라우터 없이 이 값 하나로 고른다 */
export type Screen = 'login' | 'signup' | 'adminLogin' | 'customize' | 'schedule';

interface UiState {
  /** 지금 열린 화면. null이면 월드만 보인다 */
  screen: Screen | null;
  /** 가입 직후 흐름(가입 → 꾸미기 → 시간표) 중이면 true */
  onboarding: boolean;
  open: (screen: Screen, opts?: { onboarding?: boolean }) => void;
  close: () => void;
}

export const useUi = create<UiState>()((set) => ({
  screen: null,
  onboarding: false,
  open: (screen, opts) => set({ screen, onboarding: opts?.onboarding ?? false }),
  close: () => set({ screen: null, onboarding: false }),
}));
