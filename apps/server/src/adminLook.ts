import { DEFAULT_ADMIN_LOOK, LookSchema, type Look } from '@4this/shared';
import type { Db } from './db';

/** 관리자 캐릭터 생김새는 settings 테이블 한 줄(JSON)로 둔다. 멤버 표에는 넣지 않는다 */
const KEY = 'admin_look';

export function getAdminLook(db: Db): Look {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(KEY) as
    { value: string } | undefined;
  if (!row) return DEFAULT_ADMIN_LOOK;
  try {
    const parsed = LookSchema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data : DEFAULT_ADMIN_LOOK;
  } catch {
    return DEFAULT_ADMIN_LOOK;
  }
}

export function setAdminLook(db: Db, look: Look): void {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(KEY, JSON.stringify(look));
}
