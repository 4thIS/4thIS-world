import { randomBytes } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Session } from '@4this/shared';
import type { Config } from '../config';
import type { Db } from '../db';
import { forbidden, unauthorized } from '../errors';
import { getMember, toMe, type MemberRow } from '../members';

export const SESSION_COOKIE = 'sid';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** 요청을 보낸 사람 */
export type Auth =
  | { kind: 'guest' }
  | { kind: 'member'; sessionId: string; member: MemberRow }
  | { kind: 'admin'; sessionId: string };

export const GUEST: Auth = { kind: 'guest' };

interface SessionRow {
  id: string;
  member_id: string | null;
  is_admin: number;
  expires_at: number;
}

/** 무작위 토큰을 만들어 sessions에 저장하고 돌려준다 */
export function createSession(
  db: Db,
  owner: { memberId: string } | { admin: true },
  now = Date.now(),
): string {
  const id = randomBytes(32).toString('base64url');
  const memberId = 'memberId' in owner ? owner.memberId : null;
  db.prepare('INSERT INTO sessions (id, member_id, is_admin, expires_at) VALUES (?, ?, ?, ?)').run(
    id,
    memberId,
    memberId === null ? 1 : 0,
    now + SESSION_TTL_MS,
  );
  return id;
}

export function deleteSession(db: Db, id: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
}

/** 한 멤버의 세션을 모두 지운다 (비밀번호 변경·초기화). exceptId는 남긴다 */
export function deleteMemberSessions(db: Db, memberId: string, exceptId?: string): void {
  db.prepare('DELETE FROM sessions WHERE member_id = ? AND id != ?').run(memberId, exceptId ?? '');
}

/** 세션 토큰 → 사용자. 만료됐거나 없으면 guest (만료된 줄은 지운다) */
export function resolveSession(db: Db, id: string | null, now = Date.now()): Auth {
  if (!id) return GUEST;
  const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRow | undefined;
  if (!row) return GUEST;
  if (row.expires_at <= now) {
    deleteSession(db, id);
    return GUEST;
  }
  if (row.is_admin) return { kind: 'admin', sessionId: row.id };
  const member = row.member_id ? getMember(db, row.member_id) : undefined;
  return member ? { kind: 'member', sessionId: row.id, member } : GUEST;
}

/** 서명된 sid 쿠키 값 → 세션 토큰. 위조됐으면 null */
export function readSessionToken(request: FastifyRequest): string | null {
  const raw = request.cookies[SESSION_COOKIE];
  if (!raw) return null;
  const unsigned = request.unsignCookie(raw);
  return unsigned.valid ? unsigned.value : null;
}

export function setSessionCookie(reply: FastifyReply, token: string, config: Config): void {
  reply.setCookie(SESSION_COOKIE, token, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: config.production,
    signed: true,
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function toSession(auth: Auth): Session {
  if (auth.kind === 'member') return { kind: 'member', me: toMe(auth.member) };
  if (auth.kind === 'admin') return { kind: 'admin' };
  return { kind: 'guest' };
}

/** 로그인한 멤버만 (상태 무관: 승인 대기·거절도 자기 정보는 본다) */
export function requireMember(request: FastifyRequest): MemberRow {
  if (request.auth.kind !== 'member') throw unauthorized();
  return request.auth.member;
}

/** 관리자만 */
export function requireAdmin(request: FastifyRequest): void {
  if (request.auth.kind === 'guest') throw unauthorized('관리자 로그인이 필요합니다');
  if (request.auth.kind !== 'admin') throw forbidden('관리자만 할 수 있습니다');
}
