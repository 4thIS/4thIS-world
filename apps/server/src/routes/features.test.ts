import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API, FeaturesSchema, WorldResponseSchema } from '@4this/shared';
import { adminCookie, countWorldChanged, makeTestApp, signupAs, type TestApp } from '../testing';

describe('관리자 기능 켜기·끄기', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(() => t.close());

  const world = async () =>
    WorldResponseSchema.parse((await t.app.inject({ url: API.world })).json());

  it('기본은 장난감 쏘기 켜짐, 관리자가 끄면 /world에 담기고 world:changed', async () => {
    expect((await world()).features).toEqual({ shooting: true });
    const changed = countWorldChanged(t);
    const res = await t.app.inject({
      method: 'PATCH',
      url: API.adminFeatures,
      headers: { cookie: await adminCookie(t) },
      payload: { shooting: false },
    });
    expect(FeaturesSchema.parse(res.json())).toEqual({ shooting: false });
    expect((await world()).features).toEqual({ shooting: false });
    expect(changed()).toBe(1);
  });

  it('멤버는 403, 게스트는 401', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    const asMember = await t.app.inject({
      method: 'PATCH',
      url: API.adminFeatures,
      headers: { cookie: a.cookie },
      payload: { shooting: false },
    });
    expect(asMember.statusCode).toBe(403);
    const guest = await t.app.inject({
      method: 'PATCH',
      url: API.adminFeatures,
      payload: { shooting: false },
    });
    expect(guest.statusCode).toBe(401);
  });
});
