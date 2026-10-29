import { beforeEach, describe, expect, it } from 'vitest';
import { useUi } from './store';

beforeEach(() => {
  useUi.setState({ guideAfterClose: false });
  useUi.getState().close();
});

describe('useUi', () => {
  it('화면을 열고 닫는다', () => {
    useUi.getState().open('login');
    expect(useUi.getState()).toMatchObject({ screen: 'login', onboarding: false });
    useUi.getState().close();
    expect(useUi.getState().screen).toBeNull();
  });

  it('가입 흐름 표시는 다음 화면을 열 때 넘겨야 유지된다', () => {
    useUi.getState().open('customize', { onboarding: true });
    expect(useUi.getState().onboarding).toBe(true);
    useUi.getState().open('login');
    expect(useUi.getState().onboarding).toBe(false);
  });

  it('조작법 가이드 예약: 지금 화면(가입 흐름 포함)이 다 닫히면 가이드를 연다', () => {
    useUi.getState().open('signup', { guideAfterClose: true });
    useUi.getState().open('customize', { onboarding: true });
    expect(useUi.getState().screen).toBe('customize');
    useUi.getState().close();
    expect(useUi.getState().screen).toBe('guide');
    useUi.getState().close();
    expect(useUi.getState().screen).toBeNull();
  });

  it('예약 없이 닫으면 그냥 닫힌다', () => {
    useUi.getState().open('login');
    useUi.getState().close();
    expect(useUi.getState().screen).toBeNull();
  });
});
