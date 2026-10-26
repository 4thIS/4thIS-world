import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { API, WorldResponseSchema } from '@4this/shared';
import { makeTestApp, signupAs, type TestApp } from '../testing';

describe('GET /api/world', () => {
  let t: TestApp;
  beforeEach(async () => {
    t = await makeTestApp();
  });
  afterEach(() => t.close());

  it('누구나 볼 수 있고 승인된 멤버와 시간표, 서버 시각을 준다', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    await signupAs(t, '대기중');
    await t.app.inject({
      method: 'PUT',
      url: API.mySchedules,
      headers: { cookie: a.cookie },
      payload: {
        items: [
          { day: 2, start: '13:00', end: '15:00', kind: 'external', title: '알바' },
          { day: 2, start: '09:00', end: '12:00', kind: 'lecture1' },
        ],
      },
    });

    const before = Date.now();
    const res = await t.app.inject({ method: 'GET', url: API.world });
    expect(res.statusCode).toBe(200);
    const world = WorldResponseSchema.parse(res.json());
    expect(world.serverTime).toBeGreaterThanOrEqual(before);
    expect(world.members.map((m) => m.username)).toEqual(['철수']);
    expect(world.members[0]!.schedules).toEqual([
      { day: 2, start: '09:00', end: '12:00', kind: 'lecture1' },
      { day: 2, start: '13:00', end: '15:00', kind: 'external', title: '알바' },
    ]);
  });

  it('거절된 멤버도 나오지 않는다', async () => {
    const a = await signupAs(t, '철수', { approve: true });
    t.db.prepare("UPDATE members SET status = 'rejected' WHERE id = ?").run(a.id);
    const world = WorldResponseSchema.parse((await t.app.inject(API.world)).json());
    expect(world.members).toEqual([]);
  });
});
