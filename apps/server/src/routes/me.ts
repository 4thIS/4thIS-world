import type { FastifyInstance } from 'fastify';
import {
  API,
  findOverlap,
  PatchMeRequestSchema,
  PutSchedulesRequestSchema,
  ScheduleItemSchema,
  type Me,
  type SchedulesResponse,
} from '@4this/shared';
import { hashPassword, verifyPassword } from '../auth/password';
import { clearSessionCookie, deleteMemberSessions, requireMember } from '../auth/session';
import { forbidden, HttpError, parse } from '../errors';
import { deleteMember, toMe, updateMember, type MemberRow } from '../members';
import { listSchedules, replaceSchedules } from '../schedules';

/** 겹치는 시간표면 409 overlap. detail = { indices: [앞, 뒤], items: [앞 일정, 뒤 일정] } */
function assertNoOverlap(body: unknown): void {
  const items = (body as { items?: unknown } | null)?.items;
  const list = ScheduleItemSchema.array().safeParse(items);
  if (!list.success) return;
  const overlap = findOverlap(list.data);
  if (!overlap) return;
  const [a, b] = overlap;
  throw new HttpError(409, 'overlap', '겹치는 일정이 있습니다', {
    indices: [a, b],
    items: [list.data[a], list.data[b]],
  });
}

export function registerMeRoutes(app: FastifyInstance): void {
  const { db, events } = app;

  /** 승인된 멤버가 바뀌었을 때만 월드에 알린다 */
  const changed = (member: MemberRow) => {
    if (member.status === 'approved') events.emit('world:changed');
  };

  app.get(API.me, async (request): Promise<Me> => toMe(requireMember(request)));

  app.patch(API.me, async (request): Promise<Me> => {
    const member = requireMember(request);
    const body = parse(PatchMeRequestSchema, request.body);
    let passwordHash: string | undefined;
    if (body.password) {
      if (!(await verifyPassword(body.password.current, member.password_hash))) {
        throw forbidden('현재 비밀번호가 틀렸습니다');
      }
      passwordHash = await hashPassword(body.password.next);
    }
    const updated = updateMember(db, member.id, {
      look: body.look,
      dorm: body.dorm,
      passwordHash,
    })!;
    if (passwordHash && request.auth.kind === 'member') {
      // 다른 기기의 세션은 끊고 지금 세션만 남긴다
      deleteMemberSessions(db, member.id, request.auth.sessionId);
    }
    if (body.look || body.dorm !== undefined) changed(updated);
    return toMe(updated);
  });

  app.delete(API.me, async (request, reply) => {
    const member = requireMember(request);
    deleteMember(db, member.id);
    clearSessionCookie(reply);
    changed(member);
    return { ok: true as const };
  });

  app.get(API.mySchedules, async (request): Promise<SchedulesResponse> => {
    const member = requireMember(request);
    return { items: listSchedules(db, member.id) };
  });

  app.put(API.mySchedules, async (request): Promise<SchedulesResponse> => {
    const member = requireMember(request);
    assertNoOverlap(request.body);
    const { items } = parse(PutSchedulesRequestSchema, request.body);
    replaceSchedules(db, member.id, items);
    changed(member);
    return { items: listSchedules(db, member.id) };
  });
}
