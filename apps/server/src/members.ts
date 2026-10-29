import { LookSchema, type AdminMember, type Look, type Me, type MemberStatus } from '@4this/shared';
import type { Db } from './db';

/** members 테이블 한 줄 */
export interface MemberRow {
  id: string;
  username: string;
  password_hash: string;
  status: MemberStatus;
  look: string;
  created_at: number;
  /** 기숙사생이면 1 */
  dorm: number;
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
    // 새 멤버는 기본으로 기숙사생 (시간표 화면에서 끌 수 있다)
    `INSERT INTO members (id, username, password_hash, status, look, created_at, dorm)
     VALUES (?, ?, ?, 'pending', ?, ?, 1)`,
  ).run(m.id, m.username, m.passwordHash, JSON.stringify(m.look), m.createdAt);
  return getMember(db, m.id)!;
}

/** 바꿀 필드만 넘긴다. 바뀐 줄을 돌려주고, 멤버가 없으면 undefined */
export function updateMember(
  db: Db,
  id: string,
  patch: {
    username?: string;
    passwordHash?: string;
    status?: MemberStatus;
    look?: Look;
    dorm?: boolean;
  },
): MemberRow | undefined {
  const sets: string[] = [];
  const values: (string | number)[] = [];
  if (patch.username !== undefined) {
    sets.push('username = ?');
    values.push(patch.username);
  }
  if (patch.passwordHash !== undefined) {
    sets.push('password_hash = ?');
    values.push(patch.passwordHash);
  }
  if (patch.status !== undefined) {
    sets.push('status = ?');
    values.push(patch.status);
  }
  if (patch.look !== undefined) {
    sets.push('look = ?');
    values.push(JSON.stringify(patch.look));
  }
  if (patch.dorm !== undefined) {
    sets.push('dorm = ?');
    values.push(patch.dorm ? 1 : 0);
  }
  if (sets.length > 0) {
    db.prepare(`UPDATE members SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
  }
  return getMember(db, id);
}

/** 멤버를 지운다. 시간표·세션은 ON DELETE CASCADE로 같이 지워진다 */
export function deleteMember(db: Db, id: string): boolean {
  return db.prepare('DELETE FROM members WHERE id = ?').run(id).changes > 0;
}

/** 승인된 멤버 (가입 순) */
export function listApprovedMembers(db: Db): MemberRow[] {
  return db
    .prepare("SELECT * FROM members WHERE status = 'approved' ORDER BY created_at, id")
    .all() as MemberRow[];
}

export function parseLook(row: MemberRow): Look {
  return LookSchema.parse(JSON.parse(row.look));
}

export function toMe(row: MemberRow): Me {
  return {
    id: row.id,
    username: row.username,
    status: row.status,
    look: parseLook(row),
    dorm: row.dorm === 1,
  };
}

function scheduleCount(db: Db, id: string): number {
  return db.prepare('SELECT count(*) FROM schedules WHERE member_id = ?').pluck().get(id) as number;
}

export function toAdminMember(db: Db, row: MemberRow): AdminMember {
  return { ...toMe(row), createdAt: row.created_at, scheduleCount: scheduleCount(db, row.id) };
}

/** 관리자 화면 목록: 승인 대기 먼저, 그다음 가입 순 */
export function listAdminMembers(db: Db): AdminMember[] {
  const rows = db
    .prepare(
      `SELECT m.*, (SELECT count(*) FROM schedules s WHERE s.member_id = m.id) AS schedule_count
       FROM members m
       ORDER BY (m.status = 'pending') DESC, m.created_at, m.id`,
    )
    .all() as (MemberRow & { schedule_count: number })[];
  return rows.map((row) => ({
    ...toMe(row),
    createdAt: row.created_at,
    scheduleCount: row.schedule_count,
  }));
}

/** SQLite UNIQUE 제약 위반인지 (아이디 중복 경쟁 상태 대비) */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error as { code: unknown }).code === 'SQLITE_CONSTRAINT_UNIQUE'
  );
}
