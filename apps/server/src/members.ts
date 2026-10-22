import { LookSchema, type Look, type Me, type MemberStatus } from '@4this/shared';
import type { Db } from './db';

/** members 테이블 한 줄 */
export interface MemberRow {
  id: string;
  username: string;
  password_hash: string;
  status: MemberStatus;
  look: string;
  created_at: number;
}

export function getMember(db: Db, id: string): MemberRow | undefined {
  return db.prepare('SELECT * FROM members WHERE id = ?').get(id) as MemberRow | undefined;
}

export function getMemberByUsername(db: Db, username: string): MemberRow | undefined {
  return db.prepare('SELECT * FROM members WHERE username = ?').get(username) as
    MemberRow | undefined;
}

export function insertMember(
  db: Db,
  m: { id: string; username: string; passwordHash: string; look: Look; createdAt: number },
): MemberRow {
  db.prepare(
    `INSERT INTO members (id, username, password_hash, status, look, created_at)
     VALUES (?, ?, ?, 'pending', ?, ?)`,
  ).run(m.id, m.username, m.passwordHash, JSON.stringify(m.look), m.createdAt);
  return getMember(db, m.id)!;
}

export function parseLook(row: MemberRow): Look {
  return LookSchema.parse(JSON.parse(row.look));
}

export function toMe(row: MemberRow): Me {
  return { id: row.id, username: row.username, status: row.status, look: parseLook(row) };
}

/** SQLite UNIQUE 제약 위반인지 (아이디 중복 경쟁 상태 대비) */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as { code: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}
