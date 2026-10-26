import { createReadStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  AdminPatchMemberRequestSchema,
  API,
  kstDate,
  type AdminMember,
  type AdminMembersResponse,
  type MemberStatus,
} from '@4this/shared';
import { hashPassword } from '../auth/password';
import { deleteMemberSessions, requireAdmin } from '../auth/session';
import { HttpError, notFound, parse } from '../errors';
import {
  deleteMember,
  getMember,
  getMemberByUsername,
  isUniqueViolation,
  listAdminMembers,
  toAdminMember,
  updateMember,
} from '../members';

type IdParams = { Params: { id: string } };

/** API.adminMember(id) 등과 같은 경로의 라우트 패턴 (encodeURIComponent 때문에 ':id'를 직접 넣지 않는다) */
export const ADMIN_ROUTES = {
  member: `${API.adminMembers}/:id`,
  approve: `${API.adminMembers}/:id/approve`,
  reject: `${API.adminMembers}/:id/reject`,
} as const;

/** 백업 파일 이름: world-YYYYMMDD.db (KST 날짜) */
export function backupFileName(now = Date.now()): string {
  return `world-${kstDate(now).replaceAll('-', '')}.db`;
}

export function registerAdminRoutes(app: FastifyInstance): void {
  const { db, events } = app;

  const target = (request: FastifyRequest<IdParams>) => {
    requireAdmin(request);
    const member = getMember(db, request.params.id);
    if (!member) throw notFound('멤버가 없습니다');
    return member;
  };

  const setStatus = (request: FastifyRequest<IdParams>, status: MemberStatus): AdminMember => {
    const member = target(request);
    const updated = updateMember(db, member.id, { status })!;
    events.emit('world:changed');
    return toAdminMember(db, updated);
  };

  app.get(API.adminMembers, async (request): Promise<AdminMembersResponse> => {
    requireAdmin(request);
    return { members: listAdminMembers(db) };
  });

  app.post<IdParams>(ADMIN_ROUTES.approve, async (request) => setStatus(request, 'approved'));
  app.post<IdParams>(ADMIN_ROUTES.reject, async (request) => setStatus(request, 'rejected'));

  app.patch<IdParams>(ADMIN_ROUTES.member, async (request): Promise<AdminMember> => {
    const member = target(request);
    const body = parse(AdminPatchMemberRequestSchema, request.body);
    if (body.username !== undefined) {
      const other = getMemberByUsername(db, body.username);
      if (other && other.id !== member.id) {
        throw new HttpError(409, 'username_taken', '이미 있는 아이디입니다');
      }
    }
    const passwordHash = body.newPassword ? await hashPassword(body.newPassword) : undefined;
    let updated;
    try {
      updated = updateMember(db, member.id, {
        username: body.username,
        look: body.look,
        passwordHash,
      })!;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new HttpError(409, 'username_taken', '이미 있는 아이디입니다');
      }
      throw error;
    }
    // 비밀번호를 초기화하면 그 멤버의 모든 세션을 끊는다
    if (passwordHash) deleteMemberSessions(db, member.id);
    events.emit('world:changed');
    return toAdminMember(db, updated);
  });

  app.delete<IdParams>(ADMIN_ROUTES.member, async (request) => {
    const member = target(request);
    deleteMember(db, member.id);
    events.emit('world:changed');
    return { ok: true as const };
  });

  /** SQLite 온라인 백업 → 임시 파일 → 다운로드 → 임시 폴더 삭제 */
  app.get(API.adminBackup, async (request, reply) => {
    requireAdmin(request);
    const dir = await mkdtemp(join(tmpdir(), 'world-backup-'));
    const file = join(dir, 'world.db');
    try {
      await db.backup(file);
    } catch (error) {
      await rm(dir, { recursive: true, force: true });
      throw error;
    }
    const stream = createReadStream(file);
    stream.on('close', () => void rm(dir, { recursive: true, force: true }));
    return reply
      .header('content-type', 'application/vnd.sqlite3')
      .header('content-disposition', `attachment; filename="${backupFileName()}"`)
      .header('cache-control', 'no-store')
      .send(stream);
  });
}
