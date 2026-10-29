import { create } from 'zustand';

/** 월드 위에 뜨는 화면. 라우터 없이 이 값 하나로 고른다 */
export type Screen =
  'intro' | 'guide' | 'login' | 'signup' | 'adminLogin' | 'customize' | 'schedule' | 'admin';

interface UiState {
  /** 지금 열린 화면. null이면 월드만 보인다 */
  screen: Screen | null;
  /** 가입 직후 흐름(가입 → 꾸미기 → 시간표) 중이면 true */
  onboarding: boolean;
  /** 지금 열린 화면들이 다 닫히면 조작법 가이드를 연다 (소개 모달을 닫을 때 예약) */
  guideAfterClose: boolean;
  open: (screen: Screen, opts?: { onboarding?: boolean; guideAfterClose?: boolean }) => void;
  close: () => void;
}

export const useUi = create<UiState>()((set) => ({
  screen: null,
  onboarding: false,
  guideAfterClose: false,
  open: (screen, opts) =>
    set((s) => ({
      screen,
      onboarding: opts?.onboarding ?? false,
      guideAfterClose: opts?.guideAfterClose ?? s.guideAfterClose,
    })),
  close: () =>
    set((s) =>
      s.guideAfterClose
        ? { screen: 'guide', onboarding: false, guideAfterClose: false }
        : { screen: null, onboarding: false },
    ),
}));
