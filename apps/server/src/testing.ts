import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { API, SessionSchema } from '@4this/shared';
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
    weather: null,
    ...overrides,
  };
}

export interface TestApp {
  app: FastifyInstance;
  db: Db;
  config: Config;
  close: () => Promise<void>;
}

/** 메모리 DB로 앱을 만든다. beforeReady에서 훅·플러그인을 더 붙일 수 있다 (예: attachRealtime) */
export async function makeTestApp(
  overrides: Partial<Config> = {},
  beforeReady?: (app: FastifyInstance) => void,
): Promise<TestApp> {
  const config = testConfig(overrides);
  const db = openDb(':memory:');
  const app = buildApp({ config, db });
  beforeReady?.(app);
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

export interface TestMember {
  id: string;
  cookie: string;
}

/** 가입하고 { id, cookie }를 돌려준다. approve면 DB에서 바로 승인한다 */
export async function signupAs(
  t: TestApp,
  username: string,
  { password = 'secret1', approve = false } = {},
): Promise<TestMember> {
  const res = await t.app.inject({
    method: 'POST',
    url: API.signup,
    payload: { username, password },
  });
  const session = SessionSchema.parse(res.json());
  if (session.kind !== 'member') throw new Error('가입 실패');
  if (approve)
    t.db.prepare("UPDATE members SET status = 'approved' WHERE id = ?").run(session.me.id);
  return { id: session.me.id, cookie: sidCookie(res) };
}

/** 관리자 로그인 쿠키 */
export async function adminCookie(t: TestApp): Promise<string> {
  const res = await t.app.inject({
    method: 'POST',
    url: API.adminLogin,
    payload: { password: t.config.adminPassword },
  });
  return sidCookie(res);
}

/** world:changed가 몇 번 났는지 센다 */
export function countWorldChanged(t: TestApp): () => number {
  let count = 0;
  t.app.events.on('world:changed', () => count++);
  return () => count;
}
