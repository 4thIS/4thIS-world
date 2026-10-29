import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '../../store/session';
import { apiError, ME_APPROVED, mockApi } from '../testing/mockApi';
import { DormToggle } from './DormToggle';

beforeEach(() => {
  useSession.setState({ session: { kind: 'member', me: ME_APPROVED }, loading: false });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const box = () => screen.getByRole('checkbox', { name: /기숙사에 살아요/ }) as HTMLInputElement;

describe('DormToggle', () => {
  it('지금 상태를 보여 주고, 바꾸면 바로 PATCH /api/me로 저장해 세션에 반영한다', async () => {
    const api = mockApi({
      'PATCH /api/me': (body) => ({ body: { ...ME_APPROVED, ...(body as object) } }),
    });
    render(<DormToggle />);
    expect(box().checked).toBe(false);
    fireEvent.click(box());
    await screen.findByText('저장했어요. 밤엔 기숙사에서 자요 😴');
    expect(api.calls).toEqual([{ method: 'PATCH', url: '/api/me', body: { dorm: true } }]);
    const s = useSession.getState().session;
    expect(s.kind === 'member' && s.me.dorm).toBe(true);
    expect(box().checked).toBe(true);
  });

  it('실패하면 원래대로 두고 알려 준다', async () => {
    mockApi({ 'PATCH /api/me': apiError(500, 'internal') });
    render(<DormToggle />);
    fireEvent.click(box());
    expect((await screen.findByRole('alert')).textContent).toContain('서버에 문제가 생겼어요');
    expect(box().checked).toBe(false);
  });
});
