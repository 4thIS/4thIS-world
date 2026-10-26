import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LookSchema, type Look } from '@4this/shared';
import { useSession } from '../../store/session';
import { useUi } from '../store';
import { apiError, ME_PENDING, mockApi } from '../testing/mockApi';
import { CustomizeScreen } from './CustomizeScreen';

// WebGL이 없는 jsdom에서는 3D 미리보기 대신 지금 생김새를 글자로 보여 준다
vi.mock('./LookPreview', () => ({
  LookPreview: ({ look }: { look: Look }) => (
    <div data-testid="preview">{JSON.stringify(look)}</div>
  ),
}));

const preview = (): Look => JSON.parse(screen.getByTestId('preview').textContent ?? '{}') as Look;

beforeEach(() => {
  useSession.setState({ session: { kind: 'member', me: ME_PENDING }, loading: false });
  useUi.getState().open('customize');
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('CustomizeScreen', () => {
  it('지금 내 생김새로 시작하고 칩을 누르면 바뀐다', () => {
    render(<CustomizeScreen />);
    expect(preview()).toEqual(ME_PENDING.look);
    fireEvent.click(screen.getByRole('button', { name: /고양이/ }));
    fireEvent.click(screen.getByRole('button', { name: '민트' }));
    fireEvent.click(screen.getByRole('button', { name: '비니' }));
    fireEvent.click(screen.getByRole('button', { name: '선글라스' }));
    fireEvent.click(screen.getByRole('button', { name: '나비넥타이' }));
    expect(preview()).toEqual({
      animal: 'cat',
      color: 'mint',
      head: 'beanie',
      eyes: 'sunglasses',
      neck: 'bowtie',
    });
    expect(screen.getByRole('button', { name: '비니' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('가입 흐름에서는 랜덤 조합으로 시작한다', () => {
    useUi.getState().open('customize', { onboarding: true });
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.99);
    render(<CustomizeScreen />);
    expect(preview()).toEqual({
      animal: 'duck',
      color: 'gray',
      head: 'cap',
      eyes: 'sunglasses',
      neck: 'bowtie',
    });
    expect(screen.getByRole('heading').textContent).toBe('내 캐릭터 만들기');
    random.mockRestore();
  });

  it('🎲 랜덤은 항상 유효한 조합', () => {
    render(<CustomizeScreen />);
    for (let i = 0; i < 10; i++) {
      fireEvent.click(screen.getByRole('button', { name: '🎲 랜덤' }));
      expect(LookSchema.safeParse(preview()).success).toBe(true);
    }
  });

  it('저장하면 PATCH /api/me 후 세션을 갱신하고 닫는다', async () => {
    const saved = { ...ME_PENDING, look: { ...ME_PENDING.look, animal: 'bear' as const } };
    const { calls } = mockApi({ 'PATCH /api/me': { body: saved } });
    render(<CustomizeScreen />);
    fireEvent.click(screen.getByRole('button', { name: /곰/ }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await vi.waitFor(() => expect(useUi.getState().screen).toBeNull());
    expect(calls[0]).toMatchObject({ method: 'PATCH', body: { look: saved.look } });
    expect(useSession.getState().session).toEqual({ kind: 'member', me: saved });
  });

  it('저장 실패는 알려 주고 화면을 유지한다', async () => {
    mockApi({ 'PATCH /api/me': apiError(401, 'unauthorized') });
    render(<CustomizeScreen />);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect((await screen.findByRole('alert')).textContent).toBe('로그인이 필요해요.');
    expect(useUi.getState().screen).toBe('customize');
  });

  it('게스트에게는 안내만 보인다', () => {
    useSession.setState({ session: { kind: 'guest' } });
    render(<CustomizeScreen />);
    expect(screen.getByText('로그인한 멤버만 꾸밀 수 있어요.')).toBeTruthy();
  });
});
