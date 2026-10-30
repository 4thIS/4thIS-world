import {
  AdminSettingsSchema,
  type AdminSettings,
  type Features,
  type PatchAdminSettings,
} from '@4this/shared';
import type { Db } from './db';

/** 관리자 설정(장난감 쏘기·날씨·시간)은 settings 테이블 한 줄(JSON) */
const KEY = 'admin_settings';

export const DEFAULT_ADMIN_SETTINGS: AdminSettings = {
  weapon: 'water',
  weather: 'auto',
  clockOffsetMs: 0,
};

export function getAdminSettings(db: Db): AdminSettings {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(KEY) as
    { value: string } | undefined;
  if (!row) return DEFAULT_ADMIN_SETTINGS;
  try {
    const parsed = AdminSettingsSchema.safeParse({
      ...DEFAULT_ADMIN_SETTINGS,
      ...(JSON.parse(row.value) as object),
    });
    return parsed.success ? parsed.data : DEFAULT_ADMIN_SETTINGS;
  } catch {
    return DEFAULT_ADMIN_SETTINGS;
  }
}

/** 바꿀 것만 합쳐 저장하고, 저장한 전체를 돌려준다 */
export function setAdminSettings(db: Db, patch: PatchAdminSettings): AdminSettings {
  const next = { ...getAdminSettings(db), ...patch };
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(KEY, JSON.stringify(next));
  return next;
}

/** 모두에게 보내는 기능 (/api/world) */
export function getFeatures(db: Db): Features {
  return { weapon: getAdminSettings(db).weapon };
}

/** 캠퍼스 시각: 실제 시각 + 관리자가 정한 만큼 */
export function worldNow(db: Db, now = Date.now()): number {
  return now + getAdminSettings(db).clockOffsetMs;
}
