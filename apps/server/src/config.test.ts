import { describe, expect, it } from 'vitest';
import { loadConfig } from './config';

const base = { ADMIN_PASSWORD: 'admin-pass', SESSION_SECRET: 'x'.repeat(32) };

describe('loadConfig', () => {
  it('필수 값만 있으면 기본값을 채운다', () => {
    expect(loadConfig(base)).toEqual({
      port: 8080,
      dbPath: './data/world.db',
      adminPassword: 'admin-pass',
      sessionSecret: 'x'.repeat(32),
      webDist: null,
      production: false,
      trustProxy: false,
    });
  });

  it('ADMIN_PASSWORD가 없으면 시작하지 않는다', () => {
    expect(() => loadConfig({ SESSION_SECRET: 's' })).toThrow(
      'ADMIN_PASSWORD 환경변수가 필요합니다',
    );
  });

  it('SESSION_SECRET이 없거나 빈 값이면 시작하지 않는다', () => {
    expect(() => loadConfig({ ADMIN_PASSWORD: 'a' })).toThrow(
      'SESSION_SECRET 환경변수가 필요합니다',
    );
    expect(() => loadConfig({ ADMIN_PASSWORD: 'a', SESSION_SECRET: '  ' })).toThrow(
      'SESSION_SECRET 환경변수가 필요합니다',
    );
  });

  it('나머지 값을 읽는다', () => {
    const config = loadConfig({
      ...base,
      PORT: '9000',
      DB_PATH: '/data/world.db',
      WEB_DIST: '/app/apps/web/dist',
      NODE_ENV: 'production',
      TRUST_PROXY: '1',
    });
    expect(config).toMatchObject({
      port: 9000,
      dbPath: '/data/world.db',
      webDist: '/app/apps/web/dist',
      production: true,
      trustProxy: true,
    });
  });

  it('PORT가 숫자가 아니면 실패한다', () => {
    expect(() => loadConfig({ ...base, PORT: 'abc' })).toThrow('PORT 값이 올바르지 않습니다');
  });
});
