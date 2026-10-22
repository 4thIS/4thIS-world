import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API, ApiErrorSchema } from '@4this/shared';
import { makeTestApp, type TestApp } from './testing';

describe('buildApp', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(() => t.close());

  it('health 응답', async () => {
    const res = await t.app.inject({ method: 'GET', url: API.health });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('없는 경로는 ApiErrorSchema 모양의 404', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/nope' });
    expect(res.statusCode).toBe(404);
    expect(ApiErrorSchema.parse(res.json()).error).toBe('not_found');
  });

  it('events 이미터가 붙어 있다', () => {
    let called = 0;
    t.app.events.on('world:changed', () => called++);
    t.app.events.emit('world:changed');
    expect(called).toBe(1);
  });
});
