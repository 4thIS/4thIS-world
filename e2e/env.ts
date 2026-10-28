/** E2E 서버 설정. playwright.config.ts와 테스트가 같은 값을 쓴다 */
export const E2E_PORT = Number(process.env.E2E_PORT ?? 8080);
export const ADMIN_PASSWORD = 'e2e-admin-password';
export const SESSION_SECRET = 'e2e-session-secret-0123456789abcdef';
