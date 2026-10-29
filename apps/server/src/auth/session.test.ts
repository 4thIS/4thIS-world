import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API, randomLook } from '@4this/shared';
import { insertMember } from '../members';
import { makeTestApp, type TestApp } from '../testing';
import { createSession, SESSION_TTL_MS } from './session';

describe('세션 미들웨어', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(() => t.close());

  /** 서명한 sid 쿠키로 GET /api/auth/session */
  const sessionWith = async (token?: string) => {
    const headers = token ? { cookie: `sid=${t.app.signCookie(token)}` } : {};
    const res = await t.app.inject({ method: 'GET', url: API.session, headers });
    return res.json();
  };

  it('쿠키가 없으면 guest', async () => {
    expect(await sessionWith()).toEqual({ kind: 'guest' });
  });

  it('서명이 틀린 쿠키는 guest', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: API.session,
      headers: { cookie: 'sid=forged.value' },
    });
    expect(res.json()).toEqual({ kind: 'guest' });
  });

  it('관리자 세션', async () => {
    expect(await sessionWith(createSession(t.db, { admin: true }))).toEqual({ kind: 'admin' });
  });

  it('멤버 세션은 Me를 담는다', async () => {
    const look = randomLook();
    insertMember(t.db, { id: 'm1', username: '철수', passwordHash: 'x', look, createdAt: 1 });
    expect(await sessionWith(createSession(t.db, { memberId: 'm1' }))).toEqual({
      kind: 'member',
      me: { id: 'm1', username: '철수', status: 'pending', look, dorm: true },
    });
  });

  it('만료된 세션은 guest이고 줄을 지운다', async () => {
    const now = Date.now();
    const token = createSession(t.db, { admin: true }, now - SESSION_TTL_MS - 1);
    expect(await sessionWith(token)).toEqual({ kind: 'guest' });
    expect(t.db.prepare('SELECT count(*) FROM sessions').pluck().get()).toBe(0);
  });
});
