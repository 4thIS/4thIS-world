import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '../../store/session';
import { useUi } from '../store';
import { apiError, ME_PENDING, mockApi } from '../testing/mockApi';
import { AdminLoginForm } from './AdminLoginForm';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';

beforeEach(() => {
  useSession.setState({ session: { kind: 'guest' }, loading: false });
  useUi.getState().close();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const type = (label: string | RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('SignupForm', () => {
  it('입력이 틀리면 서버에 보내지 않고 필드 아래에 알려 준다', () => {
    const { calls } = mockApi({});
    render(<SignupForm />);
    type(/^이름/, '철');
    type(/^비밀번호 \(/, '123');
    type('비밀번호 확인', '456');
    fireEvent.click(screen.getByRole('button', { name: '가입하고 캐릭터 꾸미기' }));
    expect(screen.getByText('2자 이상')).toBeTruthy();
    expect(screen.getByText('6자 이상')).toBeTruthy();
    expect(screen.getByText('비밀번호가 서로 달라요')).toBeTruthy();
    expect(calls).toHaveLength(0);
  });

  it('성공하면 세션을 넣고 꾸미기 화면(가입 흐름)을 연다', async () => {
    const { calls } = mockApi({
      'POST /api/auth/signup': { body: { kind: 'member', me: ME_PENDING } },
    });
    render(<SignupForm />);
    type(/^이름/, '철수');
    type(/^비밀번호 \(/, '123456');
    type('비밀번호 확인', '123456');
    fireEvent.click(screen.getByRole('button', { name: '가입하고 캐릭터 꾸미기' }));
    await vi.waitFor(() => expect(useUi.getState().screen).toBe('customize'));
    expect(useUi.getState().onboarding).toBe(true);
    expect(useSession.getState().session).toEqual({ kind: 'member', me: ME_PENDING });
    expect(calls[0]).toMatchObject({ body: { username: '철수', password: '123456' } });
  });

  it('이미 있는 이름이면 한국어로 알려 준다', async () => {
    mockApi({ 'POST /api/auth/signup': apiError(409, 'username_taken') });
    render(<SignupForm />);
    type(/^이름/, '철수');
    type(/^비밀번호 \(/, '123456');
    type('비밀번호 확인', '123456');
    fireEvent.click(screen.getByRole('button', { name: '가입하고 캐릭터 꾸미기' }));
    expect((await screen.findByRole('alert')).textContent).toContain('이미 쓰고 있는 이름');
  });
});

describe('LoginForm', () => {
  it('비어 있으면 안내만 한다', () => {
    const { calls } = mockApi({});
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(screen.getByRole('alert').textContent).toBe('이름과 비밀번호를 입력해 주세요.');
    expect(calls).toHaveLength(0);
  });

  it('성공하면 세션을 넣고 닫는다', async () => {
    mockApi({ 'POST /api/auth/login': { body: { kind: 'member', me: ME_PENDING } } });
    useUi.getState().open('login');
    render(<LoginForm />);
    type('이름', ' 철수 ');
    type('비밀번호', '123456');
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    await vi.waitFor(() => expect(useUi.getState().screen).toBeNull());
    expect(useSession.getState().session.kind).toBe('member');
  });

  it('틀리거나 너무 많이 시도하면 알려 준다', async () => {
    mockApi({ 'POST /api/auth/login': apiError(401, 'unauthorized') });
    render(<LoginForm />);
    type('이름', '철수');
    type('비밀번호', 'wrong!');
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      '이름 또는 비밀번호가 맞지 않아요.',
    );

    mockApi({ 'POST /api/auth/login': apiError(429, 'rate_limited') });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    await vi.waitFor(() => expect(screen.getByRole('alert').textContent).toContain('1분 뒤'));
  });

  it('가입·관리자 로그인으로 옮겨 간다', () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole('button', { name: '관리자 로그인' }));
    expect(useUi.getState().screen).toBe('adminLogin');
    fireEvent.click(screen.getByRole('button', { name: /가입하기/ }));
    expect(useUi.getState().screen).toBe('signup');
  });
});

describe('AdminLoginForm', () => {
  it('성공하면 관리자 세션', async () => {
    const { calls } = mockApi({ 'POST /api/auth/admin': { body: { kind: 'admin' } } });
    render(<AdminLoginForm />);
    type('관리자 비밀번호', 'secret');
    fireEvent.click(screen.getByRole('button', { name: '관리자로 들어가기' }));
    await vi.waitFor(() => expect(useSession.getState().session).toEqual({ kind: 'admin' }));
    expect(calls[0]?.body).toEqual({ password: 'secret' });
  });

  it('틀리면 관리자 문구', async () => {
    mockApi({ 'POST /api/auth/admin': apiError(401, 'unauthorized') });
    render(<AdminLoginForm />);
    type('관리자 비밀번호', 'nope');
    fireEvent.click(screen.getByRole('button', { name: '관리자로 들어가기' }));
    expect((await screen.findByRole('alert')).textContent).toBe('관리자 비밀번호가 맞지 않아요.');
  });
});
