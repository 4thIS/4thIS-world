import { beforeEach, describe, expect, it } from 'vitest';
import { useUi } from './store';

beforeEach(() => useUi.getState().close());

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
});
