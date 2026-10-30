import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AdminSettingsSchema,
  API,
  WeatherResponseSchema,
  WorldResponseSchema,
} from '@4this/shared';
import { adminCookie, countWorldChanged, makeTestApp, signupAs, type TestApp } from '../testing';

describe('관리자 설정 (장난감 쏘기·날씨·시간)', () => {
  let t: TestApp;
  let admin: string;
  beforeEach(async () => {
    t = await makeTestApp();
    admin = await adminCookie(t);
  });
  afterEach(() => t.close());

  const patch = (payload: object, cookie = admin) =>
    t.app.inject({ method: 'PATCH', url: API.adminSettings, headers: { cookie }, payload });
  const world = async () =>
    WorldResponseSchema.parse((await t.app.inject({ url: API.world })).json());

  it('기본: 물총 켜짐, 실제 날씨, 실제 시각', async () => {
    const res = await t.app.inject({ url: API.adminSettings, headers: { cookie: admin } });
    expect(AdminSettingsSchema.parse(res.json())).toEqual({
      weapon: 'water',
      weather: 'auto',
      clockOffsetMs: 0,
    });
    expect((await world()).features).toEqual({ weapon: 'water' });
  });

  it('장난감은 하나만 고르거나 끈다. 바꾸면 world:changed', async () => {
    const changed = countWorldChanged(t);
    await patch({ weapon: 'ray' });
    expect((await world()).features).toEqual({ weapon: 'ray' });
    await patch({ weapon: null });
    expect((await world()).features).toEqual({ weapon: null });
    expect(changed()).toBe(2);
    expect((await patch({ weapon: 'gun' })).statusCode).toBe(400);
  });

  it('날씨를 고정하면 /api/weather가 그 날씨를 주고, auto로 되돌린다', async () => {
    let weatherChanged = 0;
    t.app.events.on('weather:changed', () => weatherChanged++);
    await patch({ weather: 'snow' });
    const w = WeatherResponseSchema.parse((await t.app.inject({ url: API.weather })).json());
    expect(w.now.kind).toBe('snow');
    expect(w.hours.every((h) => h === 'snow')).toBe(true);
    expect(weatherChanged).toBe(1);
    await patch({ weather: 'auto' });
    const back = WeatherResponseSchema.parse((await t.app.inject({ url: API.weather })).json());
    expect(back.now.kind).toBe('clear'); // 테스트는 실제 날씨를 받지 않아 맑음
  });

  it('시간을 옮기면 /api/world의 서버 시각이 그만큼 옮겨진다', async () => {
    await patch({ clockOffsetMs: 3 * 60 * 60 * 1000 });
    const shifted = (await world()).serverTime - Date.now();
    expect(Math.abs(shifted - 3 * 60 * 60 * 1000)).toBeLessThan(1000);
  });

  it('멤버는 403, 게스트는 401', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    expect((await patch({ weapon: null }, a.cookie)).statusCode).toBe(403);
    const guest = await t.app.inject({ method: 'PATCH', url: API.adminSettings, payload: {} });
    expect(guest.statusCode).toBe(401);
  });
});
