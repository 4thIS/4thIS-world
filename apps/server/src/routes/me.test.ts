import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  API,
  ApiErrorSchema,
  MeSchema,
  SchedulesResponseSchema,
  WorldResponseSchema,
  type Look,
  type ScheduleItem,
} from '@4this/shared';
import { countWorldChanged, makeTestApp, signupAs, type TestApp } from '../testing';

const LOOK: Look = {
  animal: 'duck',
  color: 'mint',
  head: 'ribbon',
  eyes: 'glasses',
  neck: 'scarf',
};

describe('/api/me', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(() => t.close());

  const req = (
    method: 'GET' | 'PATCH' | 'PUT' | 'DELETE',
    url: string,
    cookie: string,
    payload?: object,
  ) => t.app.inject({ method, url, headers: { cookie }, payload });

  it('남의 쿠키로는 남의 정보·시간표만 바뀐다 (본인과 섞이지 않는다)', async () => {
    const a = await signupAs(t, '철수');
    const b = await signupAs(t, '영희');
    await req('PUT', API.mySchedules, b.cookie, {
      items: [{ day: 1, start: '09:00', end: '10:00', kind: 'library' }],
    });
    expect((await req('GET', API.mySchedules, a.cookie)).json()).toEqual({ items: [] });
    expect(MeSchema.parse((await req('GET', API.me, b.cookie)).json()).id).toBe(b.id);
  });

  it('GET /me는 내 정보', async () => {
    const a = await signupAs(t, '철수');
    const res = await req('GET', API.me, a.cookie);
    expect(MeSchema.parse(res.json())).toMatchObject({
      id: a.id,
      username: '철수',
      status: 'pending',
    });
  });

  it('PATCH /me로 생김새를 바꾼다. 승인 대기 멤버도 된다', async () => {
    const a = await signupAs(t, '철수');
    const res = await req('PATCH', API.me, a.cookie, { look: LOOK });
    expect(res.statusCode).toBe(200);
    expect(MeSchema.parse(res.json()).look).toEqual(LOOK);
    expect(MeSchema.parse((await req('GET', API.me, a.cookie)).json()).look).toEqual(LOOK);
  });

  it('PATCH /me로 기숙사생 여부를 바꾸면 내 정보와 /world에 담기고 world:changed', async () => {
    const a = await signupAs(t, '기숙', { approve: true });
    expect(MeSchema.parse((await req('GET', API.me, a.cookie)).json()).dorm).toBe(false);
    const changed = countWorldChanged(t);
    const res = await req('PATCH', API.me, a.cookie, { dorm: true });
    expect(MeSchema.parse(res.json()).dorm).toBe(true);
    expect(changed()).toBe(1);
    const world = WorldResponseSchema.parse((await req('GET', API.world, a.cookie)).json());
    expect(world.members.find((m) => m.id === a.id)?.dorm).toBe(true);
  });

  it('잘못된 생김새는 400', async () => {
    const a = await signupAs(t, '철수');
    const res = await req('PATCH', API.me, a.cookie, { look: { ...LOOK, animal: 'lion' } });
    expect(res.statusCode).toBe(400);
    expect(ApiErrorSchema.parse(res.json()).error).toBe('invalid');
  });

  it('비밀번호 변경은 현재 비밀번호를 확인하고, 다른 세션을 끊는다', async () => {
    const a = await signupAs(t, '철수', { password: 'secret1' });
    const other = await t.app.inject({
      method: 'POST',
      url: API.login,
      payload: { username: '철수', password: 'secret1' },
    });
    const otherCookie = `sid=${other.cookies.find((c) => c.name === 'sid')!.value}`;

    const wrong = await req('PATCH', API.me, a.cookie, {
      password: { current: 'nope!!', next: 'newpass1' },
    });
    expect(wrong.statusCode).toBe(403);
    expect(ApiErrorSchema.parse(wrong.json()).error).toBe('forbidden');

    const ok = await req('PATCH', API.me, a.cookie, {
      password: { current: 'secret1', next: 'newpass1' },
    });
    expect(ok.statusCode).toBe(200);
    // 지금 세션은 그대로, 다른 기기 세션은 끊긴다
    expect((await req('GET', API.me, a.cookie)).statusCode).toBe(200);
    expect((await req('GET', API.me, otherCookie)).statusCode).toBe(401);

    const login = await t.app.inject({
      method: 'POST',
      url: API.login,
      payload: { username: '철수', password: 'newpass1' },
    });
    expect(login.statusCode).toBe(200);
  });

  it('DELETE /me는 멤버·시간표·세션을 모두 지운다', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    await req('PUT', API.mySchedules, a.cookie, {
      items: [{ day: 0, start: '09:00', end: '10:00', kind: 'lecture1' }],
    });
    const changes = countWorldChanged(t);
    const res = await req('DELETE', API.me, a.cookie);
    expect(res.json()).toEqual({ ok: true });
    expect(changes()).toBe(1);
    for (const table of ['members', 'schedules', 'sessions']) {
      expect(t.db.prepare(`SELECT count(*) FROM ${table}`).pluck().get()).toBe(0);
    }
    expect((await req('GET', API.me, a.cookie)).statusCode).toBe(401);
  });
});

describe('/api/me/schedules', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(() => t.close());

  const put = (cookie: string, items: unknown) =>
    t.app.inject({ method: 'PUT', url: API.mySchedules, headers: { cookie }, payload: { items } });
  const get = (cookie: string) =>
    t.app.inject({ method: 'GET', url: API.mySchedules, headers: { cookie } });

  const lecture: ScheduleItem = { day: 0, start: '09:00', end: '11:00', kind: 'lecture1' };
  const research: ScheduleItem = {
    day: 0,
    start: '13:00',
    end: '15:00',
    kind: 'research',
    title: '논문',
  };

  it('통째로 교체하고 정렬해서 돌려준다', async () => {
    const a = await signupAs(t, '철수');
    expect(SchedulesResponseSchema.parse((await get(a.cookie)).json())).toEqual({ items: [] });

    const first = await put(a.cookie, [research, lecture]);
    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ items: [lecture, research] });

    const second = await put(a.cookie, [research]);
    expect(second.json()).toEqual({ items: [research] });
    expect((await get(a.cookie)).json()).toEqual({ items: [research] });
  });

  it('겹치면 409 overlap + 겹친 두 일정', async () => {
    const a = await signupAs(t, '철수');
    await put(a.cookie, [lecture]);
    const clash: ScheduleItem = { day: 0, start: '10:00', end: '12:00', kind: 'library' };
    const res = await put(a.cookie, [research, lecture, clash]);
    expect(res.statusCode).toBe(409);
    const body = ApiErrorSchema.parse(res.json());
    expect(body.error).toBe('overlap');
    expect(body.detail).toEqual({ indices: [1, 2], items: [lecture, clash] });
    // 실패하면 원래 시간표가 그대로 남는다
    expect((await get(a.cookie)).json()).toEqual({ items: [lecture] });
  });

  it('형식이 틀리면 400 invalid', async () => {
    const a = await signupAs(t, '철수');
    const res = await put(a.cookie, [{ ...lecture, start: '09:15' }]);
    expect(res.statusCode).toBe(400);
    expect(ApiErrorSchema.parse(res.json()).error).toBe('invalid');
  });

  it('승인된 멤버가 바꾸면 world:changed, 승인 대기 멤버는 조용히 저장만', async () => {
    const changes = countWorldChanged(t);
    const pending = await signupAs(t, '대기');
    await put(pending.cookie, [lecture]);
    expect(changes()).toBe(0);

    const approved = await signupAs(t, '승인', { approve: true });
    await put(approved.cookie, [lecture]);
    expect(changes()).toBe(1);
    await t.app.inject({
      method: 'PATCH',
      url: API.me,
      headers: { cookie: approved.cookie },
      payload: { look: LOOK },
    });
    expect(changes()).toBe(2);
  });
});
