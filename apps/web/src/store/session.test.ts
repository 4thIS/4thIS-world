import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSession } from './session';

afterEach(() => vi.unstubAllGlobals());

describe('useSession', () => {
  it('refresh는 서버 세션을 담는다', async () => {
    const me = {
      id: 'm1',
      username: '철수',
      status: 'approved',
      look: { animal: 'dog', color: 'default', head: 'none', eyes: 'none', neck: 'none' },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ kind: 'member', me }))),
    );
    await useSession.getState().refresh();
    expect(useSession.getState()).toMatchObject({
      loading: false,
      session: { kind: 'member', me },
    });
  });

  it('실패하면 guest', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    await useSession.getState().refresh();
    expect(useSession.getState().session).toEqual({ kind: 'guest' });
  });
});
