import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWorld } from '../../store/world';
import { mockApi } from '../testing/mockApi';
import { AdminFeatures } from './AdminFeatures';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  useWorld.setState(useWorld.getInitialState(), true);
});

describe('AdminFeatures', () => {
  it('장난감 쏘기를 끄면 PATCH /api/admin/features로 저장하고 바로 반영한다', async () => {
    const api = mockApi({ 'PATCH /api/admin/features': (body) => ({ body }) });
    render(<AdminFeatures />);
    const box = screen.getByRole('checkbox', { name: /장난감 쏘기/ }) as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    await vi.waitFor(() => expect(useWorld.getState().features.shooting).toBe(false));
    expect(api.calls).toEqual([
      { method: 'PATCH', url: '/api/admin/features', body: { shooting: false } },
    ]);
  });
});
