import type { FastifyInstance } from 'fastify';
import { API } from '@4this/shared';
import { toSession } from '../auth/session';

/** 인증 라우트. 다음 Task에서 가입·로그인·로그아웃·관리자 로그인을 더한다 */
export function registerAuthRoutes(app: FastifyInstance): void {
  app.get(API.session, async (request) => toSession(request.auth));
}
