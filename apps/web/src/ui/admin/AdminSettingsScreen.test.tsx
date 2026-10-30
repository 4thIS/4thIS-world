import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSession } from '../../store/session';
import { mockApi } from '../testing/mockApi';
import { AdminSettingsScreen, offsetFor } from './AdminSettingsScreen';

const SETTINGS = { weapon: 'water', weather: 'auto', clockOffsetMs: 0 };

beforeEach(() => useSession.setState({ session: { kind: 'admin' }, loading: false }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function setup() {
  return mockApi({
    'GET /api/admin/settings': { body: SETTINGS },
    'PATCH /api/admin/settings': (body) => ({ body: { ...SETTINGS, ...(body as object) } }),
  });
}

describe('AdminSettingsScreen', () => {
  it('장난감은 하나만 고르거나 끈다', async () => {
    const api = setup();
    render(<AdminSettingsScreen />);
    const ray = await screen.findByRole('button', { name: '✨ 광선총' });
    expect(screen.getByRole('button', { name: '💦 물총' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    fireEvent.click(ray);
    await vi.waitFor(() => expect(ray.getAttribute('aria-pressed')).toBe('true'));
    expect(screen.getByRole('button', { name: '💦 물총' }).getAttribute('aria-pressed')).toBe(
      'false',
    );
    fireEvent.click(screen.getByRole('button', { name: '끄기' }));
    await vi.waitFor(() =>
      expect(screen.getByRole('button', { name: '끄기' }).getAttribute('aria-pressed')).toBe(
        'true',
      ),
    );
    expect(api.calls.filter((c) => c.method === 'PATCH').map((c) => c.body)).toEqual([
      { weapon: 'ray' },
      { weapon: null },
    ]);
  });

  it('날씨를 고정하고, 시간을 옮기거나 실제 시각으로 되돌린다', async () => {
    const api = setup();
    render(<AdminSettingsScreen />);
    fireEvent.click(await screen.findByRole('button', { name: '🌧️ 비' }));
    await vi.waitFor(() => expect(api.calls.at(-1)?.body).toEqual({ weather: 'rain' }));
    fireEvent.change(screen.getByLabelText('옮길 시각'), { target: { value: '22:00' } });
    fireEvent.click(screen.getByRole('button', { name: '이 시각으로' }));
    await vi.waitFor(() =>
      expect(api.calls.at(-1)?.body).toHaveProperty('clockOffsetMs', expect.any(Number)),
    );
    fireEvent.click(screen.getByRole('button', { name: '🕒 실제 시각' }));
    await vi.waitFor(() => expect(api.calls.at(-1)?.body).toEqual({ clockOffsetMs: 0 }));
  });
});

describe('offsetFor', () => {
  it('오늘(KST) 그 시각이 되도록 옮길 양', () => {
    const now = Date.parse('2026-10-30T14:00:00+09:00');
    expect(offsetFor('22:00', now)).toBe(8 * 60 * 60 * 1000);
    expect(offsetFor('06:30', now)).toBe(-(7 * 60 + 30) * 60 * 1000);
  });
});
