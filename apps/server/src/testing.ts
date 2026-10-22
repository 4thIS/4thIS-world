import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { buildApp } from './app';
import type { Config } from './config';
import { openDb, type Db } from './db';

/** 테스트 전용 설정 */
export function testConfig(overrides: Partial<Config> = {}): Config {
  return {
    port: 0,
    dbPath: ':memory:',
    adminPassword: 'admin-pass',
    sessionSecret: 'test-secret-test-secret-test-secret',
    webDist: null,
    production: false,
    trustProxy: false,
    ...overrides,
  };
}

export interface TestApp {
  app: FastifyInstance;
  db: Db;
  config: Config;
  close: () => Promise<void>;
}

/** 메모리 DB로 앱을 만든다 */
export async function makeTestApp(overrides: Partial<Config> = {}): Promise<TestApp> {
  const config = testConfig(overrides);
  const db = openDb(':memory:');
  const app = buildApp({ config, db });
  await app.ready();
  return {
    app,
    db,
    config,
    close: async () => {
      await app.close();
      db.close();
    },
  };
}

/** 응답의 Set-Cookie에서 sid를 꺼내 다음 요청의 cookie 헤더로 쓴다 */
export function sidCookie(res: LightMyRequestResponse): string {
  const cookie = res.cookies.find((c) => c.name === 'sid');
  if (!cookie) throw new Error('sid 쿠키가 없습니다');
  return `sid=${cookie.value}`;
}
