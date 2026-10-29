import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MIGRATIONS, openDb } from './db';

describe('openDb', () => {
  const dirs: string[] = [];
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  it('메모리 DB에 스펙 §8.1 테이블을 만든다', () => {
    const db = openDb(':memory:');
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .pluck()
      .all();
    expect(tables).toEqual(['members', 'schedules', 'sessions', 'settings']);
    expect(db.pragma('user_version', { simple: true })).toBe(MIGRATIONS.length);
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    db.close();
  });

  it('파일 DB는 폴더를 만들고 WAL로 연다. 다시 열어도 마이그레이션이 두 번 돌지 않는다', () => {
    const dir = mkdtempSync(join(tmpdir(), 'world-db-'));
    dirs.push(dir);
    const path = join(dir, 'nested', 'world.db');
    const db = openDb(path);
    expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
    db.prepare(
      "INSERT INTO members (id, username, password_hash, status, look, created_at) VALUES ('m1', '철수', 'h', 'pending', '{}', 1)",
    ).run();
    db.close();

    const again = openDb(path);
    expect(again.prepare('SELECT count(*) FROM members').pluck().get()).toBe(1);
    again.close();
  });

  it('멤버를 지우면 시간표와 세션도 지워진다', () => {
    const db = openDb(':memory:');
    db.prepare(
      "INSERT INTO members (id, username, password_hash, status, look, created_at) VALUES ('m1', '철수', 'h', 'approved', '{}', 1)",
    ).run();
    db.prepare(
      "INSERT INTO schedules VALUES ('s1', 'm1', 0, '09:00', '10:00', 'lecture1', NULL)",
    ).run();
    db.prepare("INSERT INTO sessions VALUES ('t1', 'm1', 0, 99)").run();
    db.prepare("DELETE FROM members WHERE id = 'm1'").run();
    expect(db.prepare('SELECT count(*) FROM schedules').pluck().get()).toBe(0);
    expect(db.prepare('SELECT count(*) FROM sessions').pluck().get()).toBe(0);
    db.close();
  });

  it('아이디는 대소문자를 가리지 않고 중복을 막는다', () => {
    const db = openDb(':memory:');
    db.prepare(
      "INSERT INTO members (id, username, password_hash, status, look, created_at) VALUES ('m1', 'Kim', 'h', 'pending', '{}', 1)",
    ).run();
    expect(() =>
      db
        .prepare(
          "INSERT INTO members (id, username, password_hash, status, look, created_at) VALUES ('m2', 'kim', 'h', 'pending', '{}', 1)",
        )
        .run(),
    ).toThrow(/UNIQUE/);
    db.close();
  });
});
