import type { FastifyInstance } from 'fastify';
import { API, type WorldResponse } from '@4this/shared';
import { getAdminLook } from '../adminLook';
import { listApprovedMembers, parseLook } from '../members';
import { listSchedulesByMember } from '../schedules';

export function registerWorldRoutes(app: FastifyInstance): void {
  const { db } = app;

  /** 누구나: 승인된 멤버 전체와 시간표, 관리자 캐릭터 생김새, 서버 시각 */
  app.get(API.world, async (): Promise<WorldResponse> => {
    const schedules = listSchedulesByMember(db);
    const members = listApprovedMembers(db).map((row) => ({
      id: row.id,
      username: row.username,
      look: parseLook(row),
      schedules: schedules.get(row.id) ?? [],
      dorm: row.dorm === 1,
    }));
    return { serverTime: Date.now(), members, admin: { look: getAdminLook(db) } };
  });
}
