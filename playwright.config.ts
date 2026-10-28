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
  // CI 러너는 GPU 없이 소프트웨어 WebGL로 두 페이지를 그려 느리다. 넉넉히 기다린다
  timeout: process.env.CI ? 240_000 : 90_000,
  expect: { timeout: process.env.CI ? 45_000 : 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${E2E_PORT}`,
    trace: 'retain-on-failure',
    // 화면을 작게 해서 소프트웨어 렌더링이 메인 스레드를 오래 붙잡지 않게 한다
    // (붙잡으면 소켓이 ping에 답하지 못해 끊기고, 접속자 수·조종 상태가 늦게 온다)
    viewport: { width: 800, height: 500 },
    deviceScaleFactor: 1,
    // CI에는 GPU가 없어 소프트웨어 WebGL을 쓴다
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 800, height: 500 } },
    },
  ],
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
