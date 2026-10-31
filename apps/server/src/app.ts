import { EventEmitter } from 'node:events';
import fastifyCookie from '@fastify/cookie';
import fastifyRateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyInstance } from 'fastify';
import { API, CLEAR_WEATHER, fixedWeather } from '@4this/shared';
import { getAdminSettings } from './adminSettings';
import { readSessionToken, resolveSession, type Auth } from './auth/session';
import type { Config } from './config';
import type { Db } from './db';
import { registerErrorHandlers, sendNotFound } from './errors';
import { registerAdminRoutes } from './routes/admin';
import { registerAuthRoutes } from './routes/auth';
import { registerMeRoutes } from './routes/me';
import { registerWorldRoutes } from './routes/world';
import { registerWebStatic } from './static';
import { WeatherService } from './weather';

/** 서버 안에서 주고받는 이벤트. wj#3의 소켓 계층이 world:changed를 받아 브로드캐스트한다 */
export type ServerEvents = {
  'world:changed': [];
  'weather:changed': [];
  /** 새 가입 신청 (관리자에게 알린다) */
  'signup:pending': [username: string];
};

declare module 'fastify' {
  interface FastifyInstance {
    config: Config;
    db: Db;
    events: EventEmitter<ServerEvents>;
    /** 실시간 날씨. 설정에서 끄면 null (늘 맑음) */
    weather: WeatherService | null;
  }
  interface FastifyRequest {
    auth: Auth;
  }
}

export interface AppOptions {
  config: Config;
  db: Db;
}

/** 서버 앱을 만든다. 테스트는 listen 없이 app.inject()로 부른다 */
export function buildApp({ config, db }: AppOptions): FastifyInstance {
  const app = Fastify({
    logger: false,
    // 같은 기기·사설망(nginx, Docker)의 프록시만 믿는다. true면 X-Forwarded-For 위조로 시도 제한을 우회할 수 있다
    trustProxy: config.trustProxy ? 'loopback,uniquelocal' : false,
  });
  app.decorate('config', config);
  app.decorate('db', db);
  const events = new EventEmitter<ServerEvents>();
  app.decorate('events', events);
  // 받기 시작은 main.ts가 한다 (테스트는 네트워크를 쓰지 않게)
  app.decorate(
    'weather',
    config.weather
      ? new WeatherService(config.weather, { onChange: () => events.emit('weather:changed') })
      : null,
  );
  app.addHook('onClose', async () => app.weather?.stop());
  // 객체는 기본값으로 못 넣는다(Fastify 5). 자리만 잡고 onRequest 훅에서 채운다
  app.decorateRequest('auth');

  registerErrorHandlers(app);
  app.register(fastifyCookie, { secret: config.sessionSecret });
  app.register(fastifyRateLimit, { global: false });

  app.register(async (api) => {
    // 쿠키 sid → sessions → member/admin. 없거나 만료면 guest
    api.addHook('onRequest', async (request) => {
      request.auth = resolveSession(db, readSessionToken(request));
    });
    api.get(API.health, async () => ({ ok: true }));
    api.get(API.weather, async () => {
      // 관리자가 날씨를 고정했으면 그 날씨, 아니면 실제 날씨
      const mode = getAdminSettings(db).weather;
      if (mode !== 'auto') return fixedWeather(mode);
      return app.weather?.get() ?? CLEAR_WEATHER;
    });
    registerAuthRoutes(api);
    registerWorldRoutes(api);
    registerMeRoutes(api);
    registerAdminRoutes(api);
  });

  // WEB_DIST가 있으면 웹 빌드를 같이 서빙한다 (컨테이너 1개 배포)
  if (config.webDist) registerWebStatic(app, config.webDist);
  else app.setNotFoundHandler(sendNotFound);

  return app;
}
