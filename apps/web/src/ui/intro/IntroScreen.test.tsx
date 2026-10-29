import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_LOOK } from '@4this/shared';
import { useSession } from '../../store/session';
import { ScreenHost } from '../ScreenHost';
import { useUi } from '../store';
import { INTRO_KEY } from './introStorage';

beforeEach(() => {
  localStorage.clear();
  useSession.setState({ session: { kind: 'guest' }, loading: false });
  useUi.getState().open('intro');
});
afterEach(() => {
  cleanup();
  useUi.getState().close();
});

const dialog = () => screen.queryByRole('dialog', { name: '4thIS-world에 오신 걸 환영해요' });

describe('IntroScreen', () => {
  it('로고와 소개, 게스트에게는 가입·구경 버튼', () => {
    render(<ScreenHost />);
    expect(dialog()).toBeTruthy();
    expect(screen.getByRole('img', { name: '4thIS-world 로고' })).toBeTruthy();
    expect(screen.getByText('만든 사람 · 박찬우 · 이우진 · 박효민 · 김태희')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '가입하고 내 캐릭터 만들기' }));
    expect(useUi.getState().screen).toBe('signup');
    expect(localStorage.getItem(INTRO_KEY)).toBeNull();
  });

  it('구경하기는 닫기만 한다. 오늘 하루 보지 않기를 고르면 기한을 저장한다', () => {
    render(<ScreenHost />);
    fireEvent.click(screen.getByLabelText('오늘 하루 보지 않기'));
    fireEvent.click(screen.getByRole('button', { name: '구경하기' }));
    expect(useUi.getState().screen).toBeNull();
    expect(Number(localStorage.getItem(INTRO_KEY))).toBeGreaterThan(Date.now());
  });

  it('로그인한 사람에게는 가입 버튼 대신 들어가기', () => {
    useSession.setState({
      session: {
        kind: 'member',
        me: { id: 'm1', username: '철수', look: DEFAULT_LOOK, status: 'approved' },
      },
    });
    render(<ScreenHost />);
    expect(screen.queryByRole('button', { name: '가입하고 내 캐릭터 만들기' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '캠퍼스로 들어가기' }));
    expect(dialog()).toBeNull();
  });
});
