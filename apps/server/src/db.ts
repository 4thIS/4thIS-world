import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';

export type Db = Database.Database;

/**
 * 마이그레이션 목록. 순서대로 한 번씩만 실행하고, 실행한 개수를 PRAGMA user_version에 적는다.
 * 이미 머지된 항목은 고치지 말고 새 항목을 뒤에 붙인다.
 */
export const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE members (
    id            TEXT PRIMARY KEY,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    status        TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    look          TEXT NOT NULL,
    created_at    INTEGER NOT NULL
  );
  CREATE TABLE schedules (
    id        TEXT PRIMARY KEY,
    member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    day       INTEGER NOT NULL,
    "start"   TEXT NOT NULL,
    "end"     TEXT NOT NULL,
    kind      TEXT NOT NULL,
    title     TEXT
  );
  CREATE INDEX schedules_member ON schedules(member_id);
  CREATE TABLE sessions (
    id         TEXT PRIMARY KEY,
    member_id  TEXT REFERENCES members(id) ON DELETE CASCADE,
    is_admin   INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX sessions_member ON sessions(member_id);
  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  `,
  // 기숙사생 여부 (0/1)
  `
  ALTER TABLE members ADD COLUMN dorm INTEGER NOT NULL DEFAULT 0;
  `,
];

export function migrate(db: Db): void {
  const current = db.pragma('user_version', { simple: true }) as number;
  for (let v = current; v < MIGRATIONS.length; v++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[v]!);
      db.pragma(`user_version = ${v + 1}`);
    })();
  }
}

/** DB를 열고 마이그레이션까지 끝낸다. ':memory:'는 테스트용 메모리 DB */
export function openDb(path: string): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  return db;
}
