import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AdminLookSchema,
  API,
  ApiErrorSchema,
  DEFAULT_ADMIN_LOOK,
  WorldResponseSchema,
  type Look,
} from '@4this/shared';
import { adminCookie, countWorldChanged, makeTestApp, signupAs, type TestApp } from '../testing';

const CAT: Look = { animal: 'cat', color: 'mint', head: 'beanie', eyes: 'glasses', neck: 'scarf' };

describe('관리자 캐릭터 생김새', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(() => t.close());

  const world = async () =>
    WorldResponseSchema.parse((await t.app.inject({ method: 'GET', url: API.world })).json());

  it('저장한 적이 없으면 /world에 기본 생김새가 온다', async () => {
    expect((await world()).admin).toEqual({ look: DEFAULT_ADMIN_LOOK });
  });

  it('관리자가 바꾸면 저장되고 world:changed를 낸다', async () => {
    const changed = countWorldChanged(t);
    const res = await t.app.inject({
      method: 'PATCH',
      url: API.adminLook,
      headers: { cookie: await adminCookie(t) },
      payload: { look: CAT },
    });
    expect(res.statusCode).toBe(200);
    expect(AdminLookSchema.parse(res.json())).toEqual({ look: CAT });
    expect((await world()).admin).toEqual({ look: CAT });
    expect(changed()).toBe(1);
  });

  it('게스트는 401, 멤버는 403, 잘못된 생김새는 400', async () => {
    const guest = await t.app.inject({
      method: 'PATCH',
      url: API.adminLook,
      payload: { look: CAT },
    });
    expect(guest.statusCode).toBe(401);

    const member = await signupAs(t, '철수', { approve: true });
    const asMember = await t.app.inject({
      method: 'PATCH',
      url: API.adminLook,
      headers: { cookie: member.cookie },
      payload: { look: CAT },
    });
    expect(asMember.statusCode).toBe(403);

    const bad = await t.app.inject({
      method: 'PATCH',
      url: API.adminLook,
      headers: { cookie: await adminCookie(t) },
      payload: { look: { ...CAT, animal: 'lion' } },
    });
    expect(bad.statusCode).toBe(400);
    expect(ApiErrorSchema.parse(bad.json()).error).toBe('invalid');
    expect((await world()).admin).toEqual({ look: DEFAULT_ADMIN_LOOK });
  });
});
