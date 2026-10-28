import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
import { ADMIN_PASSWORD, E2E_PORT, SESSION_SECRET } from './e2e/env';

/**
 * E2E: 웹을 VITE_E2E=1로 빌드하고(window.__world 노출), 서버가 그 빌드를 정적 서빙한다(wj#4).
 * DB는 실행마다 새 임시 파일이라 테스트끼리 섞이지 않는다.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: 'retain-on-failure',
    // CI에는 GPU가 없어 소프트웨어 WebGL을 쓴다
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start -w @4this/server',
    url: `http://localhost:${E2E_PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      VITE_E2E: '1',
      WEB_DIST: resolve('apps/web/dist'),
      ADMIN_PASSWORD,
      SESSION_SECRET,
      DB_PATH: join(tmpdir(), `4this-e2e-${Date.now()}.db`),
      PORT: String(E2E_PORT),
      NODE_ENV: 'test',
    },
  },
});
