import { DEFAULT_FEATURES, FeaturesSchema, type Features } from '@4this/shared';
import type { Db } from './db';

/** 관리자가 켜고 끄는 기능은 settings 테이블 한 줄(JSON) */
const KEY = 'features';

export function getFeatures(db: Db): Features {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(KEY) as
    { value: string } | undefined;
  if (!row) return DEFAULT_FEATURES;
  try {
    const parsed = FeaturesSchema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data : DEFAULT_FEATURES;
  } catch {
    return DEFAULT_FEATURES;
  }
}

export function setFeatures(db: Db, features: Features): void {
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run(KEY, JSON.stringify(features));
}
