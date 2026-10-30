import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  API,
  ApiErrorSchema,
  SchedulesResponseSchema,
  WorldResponseSchema,
  type ScheduleItem,
} from '@4this/shared';
import { adminCookie, countWorldChanged, makeTestApp, signupAs, type TestApp } from '../testing';
import { ADMIN_ROUTES } from './admin';

const LECTURE: ScheduleItem = { day: 0, start: '09:00', end: '10:00', kind: 'lecture1' };

describe('관리자: 다른 사람 시간표', () => {
  let t: TestApp;
  let admin: string;
  beforeEach(async () => {
    t = await makeTestApp();
    admin = await adminCookie(t);
  });
  afterEach(() => t.close());

  it('라우트 패턴이 API 경로와 같다', () => {
    expect(ADMIN_ROUTES.schedules.replace(':id', 'x')).toBe(API.adminSchedules('x'));
  });

  it('보고 통째로 바꾼다. 승인 멤버면 world:changed', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    const changed = countWorldChanged(t);
    const put = await t.app.inject({
      method: 'PUT',
      url: API.adminSchedules(a.id),
      headers: { cookie: admin },
      payload: { items: [LECTURE] },
    });
    expect(put.statusCode).toBe(200);
    expect(SchedulesResponseSchema.parse(put.json()).items).toEqual([LECTURE]);
    expect(changed()).toBe(1);
    const got = await t.app.inject({
      method: 'GET',
      url: API.adminSchedules(a.id),
      headers: { cookie: admin },
    });
    expect(SchedulesResponseSchema.parse(got.json()).items).toEqual([LECTURE]);
    const world = WorldResponseSchema.parse((await t.app.inject({ url: API.world })).json());
    expect(world.members.find((m) => m.id === a.id)?.schedules).toEqual([LECTURE]);
  });

  it('겹치면 409, 없는 멤버는 404, 멤버·게스트는 403·401', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    const overlap = await t.app.inject({
      method: 'PUT',
      url: API.adminSchedules(a.id),
      headers: { cookie: admin },
      payload: { items: [LECTURE, { ...LECTURE, start: '09:30', end: '10:30' }] },
    });
    expect(overlap.statusCode).toBe(409);
    const missing = await t.app.inject({
      method: 'GET',
      url: API.adminSchedules('nope'),
      headers: { cookie: admin },
    });
    expect(missing.statusCode).toBe(404);
    const b = await signupAs(t, '영희', { approve: true });
    const asMember = await t.app.inject({
      method: 'PUT',
      url: API.adminSchedules(a.id),
      headers: { cookie: b.cookie },
      payload: { items: [] },
    });
    expect(asMember.statusCode).toBe(403);
    expect(ApiErrorSchema.parse(asMember.json()).error).toBe('forbidden');
    const guest = await t.app.inject({ method: 'GET', url: API.adminSchedules(a.id) });
    expect(guest.statusCode).toBe(401);
  });
});
