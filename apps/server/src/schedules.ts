import { nanoid } from 'nanoid';
import type { Kind, ScheduleItem } from '@4this/shared';
import type { Db } from './db';

interface ScheduleRow {
  id: string;
  member_id: string;
  day: number;
  start: string;
  end: string;
  kind: Kind;
  title: string | null;
}

function toItem(row: ScheduleRow): ScheduleItem {
  const item: ScheduleItem = { day: row.day, start: row.start, end: row.end, kind: row.kind };
  if (row.title) item.title = row.title;
  return item;
}

/** 한 멤버의 시간표 (요일, 시작 순) */
export function listSchedules(db: Db, memberId: string): ScheduleItem[] {
  const rows = db
    .prepare('SELECT * FROM schedules WHERE member_id = ? ORDER BY day, "start"')
    .all(memberId) as ScheduleRow[];
  return rows.map(toItem);
}

/** 여러 멤버의 시간표를 한 번에 읽는다 (GET /world) */
export function listSchedulesByMember(db: Db): Map<string, ScheduleItem[]> {
  const rows = db
    .prepare('SELECT * FROM schedules ORDER BY member_id, day, "start"')
    .all() as ScheduleRow[];
  const byMember = new Map<string, ScheduleItem[]>();
  for (const row of rows) {
    const list = byMember.get(row.member_id) ?? [];
    list.push(toItem(row));
    byMember.set(row.member_id, list);
  }
  return byMember;
}

/** 시간표를 통째로 바꾼다. 하나의 트랜잭션이라 중간에 실패하면 원래대로 남는다 */
export function replaceSchedules(db: Db, memberId: string, items: readonly ScheduleItem[]): void {
  const remove = db.prepare('DELETE FROM schedules WHERE member_id = ?');
  const insert = db.prepare(
    'INSERT INTO schedules (id, member_id, day, "start", "end", kind, title) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  db.transaction(() => {
    remove.run(memberId);
    for (const item of items) {
      insert.run(nanoid(), memberId, item.day, item.start, item.end, item.kind, item.title || null);
    }
  })();
}
