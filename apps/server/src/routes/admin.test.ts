import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AdminMemberSchema,
  AdminMembersResponseSchema,
  API,
  ApiErrorSchema,
  WorldResponseSchema,
} from '@4this/shared';
import { adminCookie, countWorldChanged, makeTestApp, signupAs, type TestApp } from '../testing';
import { ADMIN_ROUTES } from './admin';

describe('관리자 API', () => {
  let t: TestApp;
  let admin: string;
  beforeEach(async () => {
    t = await makeTestApp();
    admin = await adminCookie(t);
  });
  afterEach(() => t.close());

  const as = (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
    t.app.inject({ method, url, headers: { cookie: admin }, payload });

  it('라우트 패턴이 API 경로 함수와 같다', () => {
    expect(ADMIN_ROUTES.member.replace(':id', 'x')).toBe(API.adminMember('x'));
    expect(ADMIN_ROUTES.approve.replace(':id', 'x')).toBe(API.adminApprove('x'));
    expect(ADMIN_ROUTES.reject.replace(':id', 'x')).toBe(API.adminReject('x'));
  });

  it('목록은 승인 대기 먼저, 시간표 개수 포함', async () => {
    const a = await signupAs(t, '먼저승인', { approve: true });
    await t.app.inject({
      method: 'PUT',
      url: API.mySchedules,
      headers: { cookie: a.cookie },
      payload: { items: [{ day: 0, start: '09:00', end: '10:00', kind: 'lecture1' }] },
    });
    await signupAs(t, '나중대기');
    const res = await as('GET', API.adminMembers);
    const { members } = AdminMembersResponseSchema.parse(res.json());
    expect(members.map((m) => [m.username, m.status, m.scheduleCount])).toEqual([
      ['나중대기', 'pending', 0],
      ['먼저승인', 'approved', 1],
    ]);
  });

  it('승인하면 월드에 나오고 world:changed, 거절하면 빠진다', async () => {
    const a = await signupAs(t, '철수');
    const changes = countWorldChanged(t);

    const approved = await as('POST', API.adminApprove(a.id));
    expect(AdminMemberSchema.parse(approved.json()).status).toBe('approved');
    expect(changes()).toBe(1);
    let world = WorldResponseSchema.parse((await t.app.inject(API.world)).json());
    expect(world.members.map((m) => m.id)).toEqual([a.id]);

    const rejected = await as('POST', API.adminReject(a.id));
    expect(AdminMemberSchema.parse(rejected.json()).status).toBe('rejected');
    expect(changes()).toBe(2);
    world = WorldResponseSchema.parse((await t.app.inject(API.world)).json());
    expect(world.members).toEqual([]);
  });

  it('없는 멤버는 404', async () => {
    const res = await as('POST', API.adminApprove('nope'));
    expect(res.statusCode).toBe(404);
    expect(ApiErrorSchema.parse(res.json()).error).toBe('not_found');
  });

  it('PATCH: 아이디 변경(중복 409), 비밀번호 초기화(세션 끊김)', async () => {
    const a = await signupAs(t, '철수');
    await signupAs(t, '영희');

    const taken = await as('PATCH', API.adminMember(a.id), { username: '영희' });
    expect(taken.statusCode).toBe(409);
    expect(ApiErrorSchema.parse(taken.json()).error).toBe('username_taken');

    const renamed = await as('PATCH', API.adminMember(a.id), {
      username: '철수2',
      newPassword: 'reset99',
    });
    expect(AdminMemberSchema.parse(renamed.json()).username).toBe('철수2');
    const me = await t.app.inject({ method: 'GET', url: API.me, headers: { cookie: a.cookie } });
    expect(me.statusCode).toBe(401);
    const login = await t.app.inject({
      method: 'POST',
      url: API.login,
      payload: { username: '철수2', password: 'reset99' },
    });
    expect(login.statusCode).toBe(200);
  });

  it('DELETE는 멤버를 지우고 world:changed', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    const changes = countWorldChanged(t);
    const res = await as('DELETE', API.adminMember(a.id));
    expect(res.json()).toEqual({ ok: true });
    expect(changes()).toBe(1);
    expect(t.db.prepare('SELECT count(*) FROM members').pluck().get()).toBe(0);
  });
});
