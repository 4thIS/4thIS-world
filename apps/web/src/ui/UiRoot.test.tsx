import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '../store/session';
import { useUi } from './store';
import { ADMIN_MEMBERS, ME_APPROVED, ME_PENDING, mockApi } from './testing/mockApi';
import { UiRoot } from './UiRoot';

vi.mock('./customize/LookPreview', () => ({ LookPreview: () => <div data-testid="preview" /> }));

beforeEach(() => {
  useSession.setState({ session: { kind: 'guest' }, loading: false });
  useUi.getState().close();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('UiRoot', () => {
  it('세션을 불러오는 동안에는 계정 버튼을 그리지 않는다', () => {
    useSession.setState({ loading: true });
    render(<UiRoot />);
    expect(screen.queryByRole('button', { name: '로그인' })).toBeNull();
  });

  it('게스트: 로그인·가입 버튼이 모달을 연다', () => {
    render(<UiRoot />);
    fireEvent.click(screen.getByRole('button', { name: '가입' }));
    expect(screen.getByRole('dialog', { name: '가입하기' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '닫기' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    expect(screen.getByRole('dialog', { name: '로그인' })).toBeTruthy();
  });

  it('Esc로 모달을 닫는다', () => {
    render(<UiRoot />);
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('승인 대기 멤버: 배너와 내 메뉴', () => {
    useSession.setState({ session: { kind: 'member', me: ME_PENDING } });
    render(<UiRoot />);
    expect(screen.getByRole('status').textContent).toContain('관리자 승인 대기 중');
    fireEvent.click(screen.getByRole('button', { name: /철수/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: '캐릭터 꾸미기' }));
    expect(screen.getByRole('dialog', { name: '캐릭터 꾸미기' })).toBeTruthy();
  });

  it('승인된 멤버는 배너가 없고, 로그아웃하면 게스트', async () => {
    const { calls } = mockApi({ 'POST /api/auth/logout': { body: { ok: true } } });
    useSession.setState({ session: { kind: 'member', me: ME_APPROVED } });
    render(<UiRoot />);
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /철수/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: '로그아웃' }));
    await vi.waitFor(() => expect(useSession.getState().session).toEqual({ kind: 'guest' }));
    expect(calls[0]?.url).toBe('/api/auth/logout');
  });

  it('가입 → 꾸미기 → 시간표 흐름', async () => {
    mockApi({
      'POST /api/auth/signup': { body: { kind: 'member', me: ME_PENDING } },
      'PATCH /api/me': (body) => ({ body: { ...ME_PENDING, ...(body as object) } }),
      'GET /api/me/schedules': { body: { items: [] } },
      'PUT /api/me/schedules': (body) => ({ body }),
    });
    render(<UiRoot />);
    fireEvent.click(screen.getByRole('button', { name: '가입' }));
    fireEvent.change(screen.getByLabelText(/^이름/), { target: { value: '철수' } });
    fireEvent.change(screen.getByLabelText(/^비밀번호 \(/), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText('비밀번호 확인'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '가입하고 캐릭터 꾸미기' }));
    expect(await screen.findByRole('dialog', { name: '내 캐릭터 만들기' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain('승인 대기');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByRole('dialog', { name: '내 시간표' })).toBeTruthy();
    await screen.findByTestId('week-grid');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('멤버 메뉴에서 내 시간표를 연다', async () => {
    mockApi({ 'GET /api/me/schedules': { body: { items: [] } } });
    useSession.setState({ session: { kind: 'member', me: ME_APPROVED } });
    render(<UiRoot />);
    fireEvent.click(screen.getByRole('button', { name: /철수/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: '내 시간표' }));
    expect(await screen.findByTestId('week-grid')).toBeTruthy();
  });

  it('관리자 메뉴에서 관리자 화면을 연다', async () => {
    mockApi({ 'GET /api/admin/members': { body: { members: ADMIN_MEMBERS } } });
    useSession.setState({ session: { kind: 'admin' } });
    render(<UiRoot />);
    fireEvent.click(screen.getByRole('button', { name: /관리자/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: '관리자 화면' }));
    expect(await screen.findByRole('table')).toBeTruthy();
  });
});
