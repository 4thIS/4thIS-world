import { describe, expect, it } from 'vitest';
import { API } from '@4this/shared';
import { buildApp } from './app';

describe('buildApp', () => {
  it('health 응답', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: API.health });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
    await app.close();
  });
});
