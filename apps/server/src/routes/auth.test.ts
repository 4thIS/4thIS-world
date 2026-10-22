import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API, ApiErrorSchema, LookSchema, SessionSchema } from '@4this/shared';
import { makeTestApp, sidCookie, type TestApp } from '../testing';

describe('인증 라우트', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(() => t.close());

  const signup = (username = '철수', password = 'secret1') =>
    t.app.inject({ method: 'POST', url: API.signup, payload: { username, password } });
  const login = (username: string, password: string) =>
    t.app.inject({ method: 'POST', url: API.login, payload: { username, password } });
  const session = (cookie?: string) =>
    t.app.inject({ method: 'GET', url: API.session, headers: cookie ? { cookie } : {} });
  const errorCode = (res: { json: () => unknown }) => ApiErrorSchema.parse(res.json()).error;

  it('쿠키가 없으면 guest', async () => {
    const res = await session();
    expect(res.json()).toEqual({ kind: 'guest' });
  });

  it('가입하면 pending 멤버로 바로 로그인된다', async () => {
    const res = await signup();
    expect(res.statusCode).toBe(200);
    const body = SessionSchema.parse(res.json());
    expect(body.kind).toBe('member');
    if (body.kind !== 'member') return;
    expect(body.me.username).toBe('철수');
    expect(body.me.status).toBe('pending');
    expect(LookSchema.safeParse(body.me.look).success).toBe(true);

    const cookie = res.cookies.find((c) => c.name === 'sid')!;
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSite).toBe('Lax');
    expect(cookie.maxAge).toBe(30 * 24 * 60 * 60);

    const again = await session(sidCookie(res));
    expect(again.json()).toEqual(body);
    // 비밀번호는 bcrypt 해시로만 저장한다
    const hash = t.db.prepare('SELECT password_hash FROM members').pluck().get() as string;
    expect(hash).toMatch(/^\$2[aby]\$10\$/);
  });

  it('잘못된 입력은 400 invalid + zod 이슈', async () => {
    const res = await signup('철', '123');
    expect(res.statusCode).toBe(400);
    const body = ApiErrorSchema.parse(res.json());
    expect(body.error).toBe('invalid');
    expect(Array.isArray(body.detail)).toBe(true);
  });

  it('같은 아이디(대소문자 무시)로 가입하면 409 username_taken', async () => {
    await signup('Kim');
    const res = await signup('kim');
    expect(res.statusCode).toBe(409);
    expect(errorCode(res)).toBe('username_taken');
  });

  it('로그인 성공/실패', async () => {
    await signup('철수', 'secret1');
    const ok = await login('철수', 'secret1');
    expect(ok.statusCode).toBe(200);
    expect(SessionSchema.parse(ok.json()).kind).toBe('member');
    expect((await session(sidCookie(ok))).json().kind).toBe('member');

    const wrong = await login('철수', 'nope!!');
    expect(wrong.statusCode).toBe(401);
    expect(errorCode(wrong)).toBe('unauthorized');

    const missing = await login('영희', 'secret1');
    expect(missing.statusCode).toBe(401);
    expect(errorCode(missing)).toBe('unauthorized');
  });

  it('거절된 멤버도 로그인은 되고 상태가 보인다', async () => {
    await signup('철수', 'secret1');
    t.db.prepare("UPDATE members SET status = 'rejected'").run();
    const res = await login('철수', 'secret1');
    const body = SessionSchema.parse(res.json());
    expect(body.kind === 'member' && body.me.status).toBe('rejected');
  });

  it('로그아웃하면 세션이 사라진다', async () => {
    const cookie = sidCookie(await signup());
    const res = await t.app.inject({ method: 'POST', url: API.logout, headers: { cookie } });
    expect(res.json()).toEqual({ ok: true });
    expect(t.db.prepare('SELECT count(*) FROM sessions').pluck().get()).toBe(0);
    expect((await session(cookie)).json()).toEqual({ kind: 'guest' });
  });

  it('위조한 쿠키나 만료된 세션은 guest', async () => {
    const cookie = sidCookie(await signup());
    expect((await session('sid=forged.value')).json()).toEqual({ kind: 'guest' });
    t.db.prepare('UPDATE sessions SET expires_at = 0').run();
    expect((await session(cookie)).json()).toEqual({ kind: 'guest' });
    expect(t.db.prepare('SELECT count(*) FROM sessions').pluck().get()).toBe(0);
  });

  it('관리자 로그인', async () => {
    const wrong = await t.app.inject({
      method: 'POST',
      url: API.adminLogin,
      payload: { password: 'nope' },
    });
    expect(wrong.statusCode).toBe(401);
    expect(errorCode(wrong)).toBe('unauthorized');

    const ok = await t.app.inject({
      method: 'POST',
      url: API.adminLogin,
      payload: { password: 'admin-pass' },
    });
    expect(ok.json()).toEqual({ kind: 'admin' });
    expect((await session(sidCookie(ok))).json()).toEqual({ kind: 'admin' });
  });

  it('로그인은 IP당 분당 5회까지, 6번째는 429 rate_limited', async () => {
    for (let i = 0; i < 5; i++) {
      expect((await login('철수', 'secret1')).statusCode).toBe(401);
    }
    const res = await login('철수', 'secret1');
    expect(res.statusCode).toBe(429);
    expect(errorCode(res)).toBe('rate_limited');
  });

  it('관리자 로그인도 IP당 분당 5회', async () => {
    const tryAdmin = () =>
      t.app.inject({ method: 'POST', url: API.adminLogin, payload: { password: 'x' } });
    for (let i = 0; i < 5; i++) expect((await tryAdmin()).statusCode).toBe(401);
    expect((await tryAdmin()).statusCode).toBe(429);
  });

  it('TRUST_PROXY여도 X-Forwarded-For를 바꿔 시도 제한을 피할 수 없다', async () => {
    const proxied = await makeTestApp({ trustProxy: true });
    const codes: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await proxied.app.inject({
        method: 'POST',
        url: API.adminLogin,
        payload: { password: 'x' },
        remoteAddress: '203.0.113.9',
        headers: { 'x-forwarded-for': `10.0.0.${i}` },
      });
      codes.push(res.statusCode);
    }
    expect(codes).toEqual([401, 401, 401, 401, 401, 429]);
    await proxied.close();
  });

  it('프로덕션에서는 쿠키에 Secure가 붙는다', async () => {
    const prod = await makeTestApp({ production: true });
    const res = await prod.app.inject({
      method: 'POST',
      url: API.signup,
      payload: { username: '철수', password: 'secret1' },
    });
    expect(res.cookies.find((c) => c.name === 'sid')!.secure).toBe(true);
    await prod.close();
  });
});
