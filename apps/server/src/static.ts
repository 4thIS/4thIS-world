import { relative, resolve, sep } from 'node:path';
import fastifyStatic from '@fastify/static';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { sendNotFound } from './errors';

/** 해시가 붙은 Vite 산출물(dist/assets 바로 아래 파일)은 1년, index.html은 매번 확인, 나머지는 1시간 */
export function cacheControlFor(relPath: string): string {
  const path = relPath.split(sep).join('/');
  if (path === 'index.html') return 'no-cache';
  if (/^assets\/[^/]+$/.test(path)) return 'public, max-age=31536000, immutable';
  return 'public, max-age=3600';
}

/** index.html로 돌려보낼 화면 경로인지: GET/HEAD, /api·/socket.io 밖, 확장자 없음 */
export function isSpaRoute(method: string, url: string): boolean {
  if (method !== 'GET' && method !== 'HEAD') return false;
  const pathname = url.split('?')[0] ?? '/';
  if (pathname === '/api' || pathname.startsWith('/api/')) return false;
  if (pathname === '/socket.io' || pathname.startsWith('/socket.io/')) return false;
  return !/\.[A-Za-z0-9]+$/.test(pathname);
}

/** WEB_DIST 폴더를 정적 서빙하고, 화면 경로는 index.html로 돌려준다 */
export function registerWebStatic(app: FastifyInstance, webDist: string): void {
  const root = resolve(webDist);
  app.register(fastifyStatic, {
    root,
    wildcard: true,
    cacheControl: false,
    setHeaders: (reply, path) => {
      reply.header('cache-control', cacheControlFor(relative(root, path)));
    },
  });
  app.setNotFoundHandler((request: FastifyRequest, reply: FastifyReply) => {
    if (isSpaRoute(request.method, request.url)) {
      return reply.header('cache-control', 'no-cache').sendFile('index.html');
    }
    return sendNotFound(request, reply);
  });
}
