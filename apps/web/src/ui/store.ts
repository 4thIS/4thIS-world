import { create } from 'zustand';

/** 월드 위에 뜨는 화면. 라우터 없이 이 값 하나로 고른다 */
export type Screen =
  'intro' | 'guide' | 'login' | 'signup' | 'adminLogin' | 'customize' | 'schedule' | 'admin';

/** 시간표를 볼 사람 */
export interface ScheduleOwner {
  id: string;
  username: string;
}

interface UiState {
  /** 지금 열린 화면. null이면 월드만 보인다 */
  screen: Screen | null;
  /** 가입 직후 흐름(가입 → 꾸미기 → 시간표) 중이면 true */
  onboarding: boolean;
  /** 지금 열린 화면들이 다 닫히면 조작법 가이드를 연다 (소개 모달을 닫을 때 예약) */
  guideAfterClose: boolean;
  /** 시간표 화면에서 볼 다른 사람. null이면 내 시간표 */
  scheduleOf: ScheduleOwner | null;
  open: (
    screen: Screen,
    opts?: { onboarding?: boolean; guideAfterClose?: boolean; member?: ScheduleOwner },
  ) => void;
  close: () => void;
}

export const useUi = create<UiState>()((set) => ({
  screen: null,
  onboarding: false,
  guideAfterClose: false,
  scheduleOf: null,
  open: (screen, opts) =>
    set((s) => ({
      screen,
      onboarding: opts?.onboarding ?? false,
      guideAfterClose: opts?.guideAfterClose ?? s.guideAfterClose,
      scheduleOf: opts?.member ?? null,
    })),
  close: () =>
    set((s) =>
      s.guideAfterClose
        ? { screen: 'guide', onboarding: false, guideAfterClose: false }
        : { screen: null, onboarding: false },
    ),
}));
