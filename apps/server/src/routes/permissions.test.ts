import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API } from '@4this/shared';
import { adminCookie, makeTestApp, signupAs, type TestApp } from '../testing';

/**
 * 권한 표 (스펙 §11 "권한 표(구경꾼/본인/남/관리자)")
 * - 구경꾼: 쿠키 없음
 * - 본인: 대상 멤버 자신 (승인 대기 상태 — 대기 멤버도 자기 정보·시간표는 편집한다)
 * - 남: 다른 승인 멤버
 * - 관리자: 관리자 세션
 * /me 계열은 "요청한 사람 자신"이 대상이라 남 칸은 남이 자기 자신을 다루는 것과 같다.
 */
type Role = 'guest' | 'self' | 'other' | 'admin';
type Row = {
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: (targetId: string) => string;
  payload?: object;
  expect: Record<Role, number>;
};

const schedule = { items: [{ day: 0, start: '09:00', end: '10:00', kind: 'lecture1' }] };

const TABLE: Row[] = [
  {
    name: 'GET /world',
    method: 'GET',
    url: () => API.world,
    expect: { guest: 200, self: 200, other: 200, admin: 200 },
  },
  {
    name: 'GET /auth/session',
    method: 'GET',
    url: () => API.session,
    expect: { guest: 200, self: 200, other: 200, admin: 200 },
  },
  {
    name: 'GET /me',
    method: 'GET',
    url: () => API.me,
    expect: { guest: 401, self: 200, other: 200, admin: 401 },
  },
  {
    name: 'PATCH /me',
    method: 'PATCH',
    url: () => API.me,
    payload: { look: { animal: 'cat', color: 'pink', head: 'none', eyes: 'none', neck: 'none' } },
    expect: { guest: 401, self: 200, other: 200, admin: 401 },
  },
  {
    name: 'GET /me/schedules',
    method: 'GET',
    url: () => API.mySchedules,
    expect: { guest: 401, self: 200, other: 200, admin: 401 },
  },
  {
    name: 'PUT /me/schedules',
    method: 'PUT',
    url: () => API.mySchedules,
    payload: schedule,
    expect: { guest: 401, self: 200, other: 200, admin: 401 },
  },
  {
    name: 'DELETE /me',
    method: 'DELETE',
    url: () => API.me,
    expect: { guest: 401, self: 200, other: 200, admin: 401 },
  },
  {
    name: 'GET /admin/members',
    method: 'GET',
    url: () => API.adminMembers,
    expect: { guest: 401, self: 403, other: 403, admin: 200 },
  },
  {
    name: 'POST /admin/members/:id/approve',
    method: 'POST',
    url: (id) => API.adminApprove(id),
    expect: { guest: 401, self: 403, other: 403, admin: 200 },
  },
  {
    name: 'POST /admin/members/:id/reject',
    method: 'POST',
    url: (id) => API.adminReject(id),
    expect: { guest: 401, self: 403, other: 403, admin: 200 },
  },
  {
    name: 'PATCH /admin/members/:id',
    method: 'PATCH',
    url: (id) => API.adminMember(id),
    payload: { username: '바뀐이름' },
    expect: { guest: 401, self: 403, other: 403, admin: 200 },
  },
  {
    name: 'DELETE /admin/members/:id',
    method: 'DELETE',
    url: (id) => API.adminMember(id),
    expect: { guest: 401, self: 403, other: 403, admin: 200 },
  },
  {
    name: 'GET /admin/backup',
    method: 'GET',
    url: () => API.adminBackup,
    expect: { guest: 401, self: 403, other: 403, admin: 200 },
  },
];

const ROLES: Role[] = ['guest', 'self', 'other', 'admin'];
const CASES = TABLE.flatMap((row) => ROLES.map((role) => ({ row, role })));

describe('권한 표', () => {
  let t: TestApp;
  let cookies: Record<Role, string | undefined>;
  let targetId: string;

  beforeEach(async () => {
    t = await makeTestApp();
    const self = await signupAs(t, '본인');
    const other = await signupAs(t, '남멤버', { approve: true });
    targetId = self.id;
    cookies = {
      guest: undefined,
      self: self.cookie,
      other: other.cookie,
      admin: await adminCookie(t),
    };
  });
  afterEach(() => t.close());

  it.each(CASES)('$row.name — $role', async ({ row, role }) => {
    const res = await t.app.inject({
      method: row.method,
      url: row.url(targetId),
      headers: cookies[role] ? { cookie: cookies[role] } : {},
      payload: row.payload,
    });
    expect(res.statusCode).toBe(row.expect[role]);
  });
});
