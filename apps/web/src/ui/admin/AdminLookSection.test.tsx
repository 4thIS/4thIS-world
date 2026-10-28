import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ADMIN_ID, DEFAULT_ADMIN_LOOK, type Look } from '@4this/shared';
import { useWorld } from '../../store/world';
import { mockApi } from '../testing/mockApi';
import { AdminLookSection } from './AdminLookSection';

// WebGL이 없는 jsdom에서는 미리보기 대신 지금 생김새를 글자로 보여 준다
vi.mock('../customize/LookPreview', () => ({
  LookPreview: ({ look }: { look: Look }) => (
    <div data-testid="preview">{JSON.stringify(look)}</div>
  ),
}));

const preview = (): Look => JSON.parse(screen.getByTestId('preview').textContent ?? '{}') as Look;

beforeEach(() => {
  useWorld.setState({
    members: [{ id: ADMIN_ID, username: '관리자', look: DEFAULT_ADMIN_LOOK, schedules: [] }],
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useWorld.setState(useWorld.getInitialState(), true);
});

describe('AdminLookSection', () => {
  it('지금 관리자 캐릭터 생김새로 시작하고, 저장하면 PATCH /api/admin/look', async () => {
    const api = mockApi({ 'PATCH /api/admin/look': (body) => ({ body }) });
    render(<AdminLookSection />);
    expect(preview()).toEqual(DEFAULT_ADMIN_LOOK);

    fireEvent.click(screen.getByRole('button', { name: /고양이/ }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByText('저장했어요. 캠퍼스에 곧 반영돼요.')).toBeTruthy();
    expect(api.calls).toEqual([
      {
        method: 'PATCH',
        url: '/api/admin/look',
        body: { look: { ...DEFAULT_ADMIN_LOOK, animal: 'cat' } },
      },
    ]);
  });

  it('저장에 실패하면 알려 준다', async () => {
    mockApi({
      'PATCH /api/admin/look': { status: 500, body: { error: 'internal', message: 'x' } },
    });
    render(<AdminLookSection />);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect((await screen.findByRole('alert')).textContent).toContain('서버에 문제가 생겼어요');
  });
});
