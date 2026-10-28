import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '../../store/session';
import { useUi } from '../store';
import { ADMIN_MEMBERS, apiError, mockApi } from '../testing/mockApi';
import { AdminScreen } from './AdminScreen';

const [PENDING, APPROVED] = ADMIN_MEMBERS as [(typeof ADMIN_MEMBERS)[0], (typeof ADMIN_MEMBERS)[0]];

beforeEach(() => {
  useSession.setState({ session: { kind: 'admin' }, loading: false });
  useUi.getState().open('admin');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function renderLoaded(extra: Parameters<typeof mockApi>[0] = {}) {
  const api = mockApi({ 'GET /api/admin/members': { body: { members: ADMIN_MEMBERS } }, ...extra });
  render(<AdminScreen />);
  await screen.findByRole('table');
  return api;
}

const row = (name: string) => screen.getByRole('cell', { name }).closest('tr')!;

describe('AdminScreen', () => {
  it('승인 대기 배지·목록과 멤버 표', async () => {
    await renderLoaded();
    expect(screen.getByRole('heading', { name: /승인 대기/ }).textContent).toBe('승인 대기 1');
    const pending = screen.getByRole('list', { name: '승인 대기 목록' });
    expect(within(pending).getByText('철수')).toBeTruthy();
    expect(within(pending).getByText('2026-10-20 가입')).toBeTruthy();
    const r = within(row('지우'));
    expect(r.getByRole('img', { name: '오리' })).toBeTruthy();
    expect(r.getByText('승인')).toBeTruthy();
    expect(r.getByText('5')).toBeTruthy();
    expect(r.getByText('2026-10-01')).toBeTruthy();
    expect(screen.getByRole('link', { name: /백업 다운로드/ }).getAttribute('href')).toBe(
      '/api/admin/backup',
    );
  });

  it('승인하면 대기 목록에서 빠진다', async () => {
    const { calls } = await renderLoaded({
      'POST /api/admin/members/m1/approve': { body: { ...PENDING, status: 'approved' } },
    });
    fireEvent.click(screen.getByRole('button', { name: '승인' }));
    expect(await screen.findByText('기다리는 가입이 없어요.')).toBeTruthy();
    expect(calls[1]?.url).toBe('/api/admin/members/m1/approve');
  });

  it('거절', async () => {
    await renderLoaded({
      'POST /api/admin/members/m1/reject': { body: { ...PENDING, status: 'rejected' } },
    });
    fireEvent.click(screen.getByRole('button', { name: '거절' }));
    expect(await within(row('철수')).findByText('거절')).toBeTruthy();
  });

  it('이름 변경: 검증 후 PATCH', async () => {
    const { calls } = await renderLoaded({
      'PATCH /api/admin/members/m2': (body) => ({ body: { ...APPROVED, ...(body as object) } }),
    });
    fireEvent.click(within(row('지우')).getByRole('button', { name: '이름 변경' }));
    const input = screen.getByLabelText('새 이름');
    fireEvent.change(input, { target: { value: '지' } });
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(screen.getByRole('alert').textContent).toBe('2자 이상');
    fireEvent.change(input, { target: { value: '지우우' } });
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByRole('cell', { name: '지우우' })).toBeTruthy();
    expect(calls[1]?.body).toEqual({ username: '지우우' });
  });

  it('비밀번호 초기화', async () => {
    const { calls } = await renderLoaded({ 'PATCH /api/admin/members/m2': { body: APPROVED } });
    fireEvent.click(within(row('지우')).getByRole('button', { name: '비밀번호 초기화' }));
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'newpass1' } });
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect(await screen.findByText(/새 비밀번호로 바꿨어요/)).toBeTruthy();
    expect(calls[1]?.body).toEqual({ newPassword: 'newpass1' });
  });

  it('삭제는 인라인 확인을 한 번 더 누른다', async () => {
    const { calls } = await renderLoaded({
      'DELETE /api/admin/members/m2': { body: { ok: true } },
    });
    fireEvent.click(within(row('지우')).getByRole('button', { name: '삭제' }));
    expect(screen.getByText('지우님을 정말 삭제할까요?')).toBeTruthy();
    expect(calls).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    fireEvent.click(within(row('지우')).getByRole('button', { name: '삭제' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제 확인' }));
    await vi.waitFor(() => expect(screen.queryByRole('cell', { name: '지우' })).toBeNull());
    expect(calls[1]).toMatchObject({ method: 'DELETE', url: '/api/admin/members/m2' });
  });

  it('실패하면 알려 준다', async () => {
    await renderLoaded({
      'PATCH /api/admin/members/m2': apiError(409, 'username_taken'),
    });
    fireEvent.click(within(row('지우')).getByRole('button', { name: '이름 변경' }));
    fireEvent.change(screen.getByLabelText('새 이름'), { target: { value: '철수' } });
    fireEvent.click(screen.getByRole('button', { name: '확인' }));
    expect((await screen.findByRole('alert')).textContent).toContain('이미 쓰고 있는 이름');
  });

  it('관리자가 아니면 안내만', () => {
    useSession.setState({ session: { kind: 'guest' } });
    render(<AdminScreen />);
    expect(screen.getByText('관리자로 로그인해야 볼 수 있어요.')).toBeTruthy();
  });
});
