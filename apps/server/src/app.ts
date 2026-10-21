import Fastify, { type FastifyInstance } from 'fastify';
import { API } from '@4this/shared';

/** 서버 앱을 만든다. 테스트는 listen 없이 app.inject()로 부른다 */
export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: false });
  app.get(API.health, async () => ({ ok: true }));
  return app;
}
