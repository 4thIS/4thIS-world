import { afterEach, describe, expect, it, vi } from 'vitest';
import { SessionSchema } from '@4this/shared';
import { ApiError, request } from './http';

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('request', () => {
  it('성공 응답을 스키마로 검증해 돌려준다', async () => {
    const fetchMock = respond(200, { kind: 'guest' });
    vi.stubGlobal('fetch', fetchMock);
    await expect(request('GET', '/api/auth/session', SessionSchema)).resolves.toEqual({
      kind: 'guest',
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', {
      method: 'GET',
      credentials: 'same-origin',
      headers: undefined,
      body: undefined,
    });
  });

  it('본문이 있으면 JSON으로 보낸다', async () => {
    const fetchMock = respond(200, { kind: 'guest' });
    vi.stubGlobal('fetch', fetchMock);
    await request('POST', '/x', SessionSchema, { a: 1 });
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      headers: { 'content-type': 'application/json' },
      body: '{"a":1}',
    });
  });

  it('에러 본문을 ApiError로 바꾼다', async () => {
    vi.stubGlobal('fetch', respond(409, { error: 'overlap', message: '겹침' }));
    const err = await request('PUT', '/x', SessionSchema, {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 409, code: 'overlap', message: '겹침' });
  });
});
