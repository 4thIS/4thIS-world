import { nanoid } from 'nanoid';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  AdminLoginRequestSchema,
  API,
  LoginRequestSchema,
  randomLook,
  SignupRequestSchema,
} from '@4this/shared';
import { burnPasswordCheck, hashPassword, safeEqual, verifyPassword } from '../auth/password';
import {
  clearSessionCookie,
  createSession,
  deleteSession,
  setSessionCookie,
  toSession,
} from '../auth/session';
import { HttpError, parse } from '../errors';
import { getMemberByUsername, insertMember, isUniqueViolation } from '../members';

/** 로그인·관리자 로그인: IP당 분당 5회 */
const LOGIN_LIMIT = { rateLimit: { max: 5, timeWindow: '1 minute' } };

const usernameTaken = () => new HttpError(409, 'username_taken', '이미 있는 아이디입니다');
const wrongLogin = () => new HttpError(401, 'unauthorized', '아이디 또는 비밀번호가 틀렸습니다');

export function registerAuthRoutes(app: FastifyInstance): void {
  const { db, config } = app;

  /** 이미 로그인돼 있으면 그 세션을 지운다 (계정 전환·로그아웃) */
  const dropCurrent = (request: FastifyRequest) => {
    if (request.auth.kind !== 'guest') deleteSession(db, request.auth.sessionId);
  };

  app.get(API.session, async (request) => toSession(request.auth));

  app.post(API.signup, async (request, reply) => {
    const { username, password } = parse(SignupRequestSchema, request.body);
    if (getMemberByUsername(db, username)) throw usernameTaken();
    const passwordHash = await hashPassword(password);
    let member;
    try {
      member = insertMember(db, {
        id: nanoid(),
        username,
        passwordHash,
        look: randomLook(),
        createdAt: Date.now(),
      });
    } catch (error) {
      // 해시를 만드는 사이에 같은 아이디가 먼저 들어온 경우
      if (isUniqueViolation(error)) throw usernameTaken();
      throw error;
    }
    dropCurrent(request);
    const sessionId = createSession(db, { memberId: member.id });
    setSessionCookie(reply, sessionId, config);
    app.events.emit('signup:pending', member.username);
    return toSession({ kind: 'member', sessionId, member });
  });

  app.post(API.login, { config: LOGIN_LIMIT }, async (request, reply) => {
    const { username, password } = parse(LoginRequestSchema, request.body);
    const member = getMemberByUsername(db, username);
    if (!member) {
      await burnPasswordCheck(password);
      throw wrongLogin();
    }
    if (!(await verifyPassword(password, member.password_hash))) throw wrongLogin();
    dropCurrent(request);
    const sessionId = createSession(db, { memberId: member.id });
    setSessionCookie(reply, sessionId, config);
    return toSession({ kind: 'member', sessionId, member });
  });

  app.post(API.logout, async (request, reply) => {
    dropCurrent(request);
    clearSessionCookie(reply);
    return { ok: true as const };
  });

  app.post(API.adminLogin, { config: LOGIN_LIMIT }, async (request, reply) => {
    const { password } = parse(AdminLoginRequestSchema, request.body);
    if (!safeEqual(password, config.adminPassword)) {
      throw new HttpError(401, 'unauthorized', '관리자 비밀번호가 틀렸습니다');
    }
    dropCurrent(request);
    const sessionId = createSession(db, { admin: true });
    setSessionCookie(reply, sessionId, config);
    return toSession({ kind: 'admin', sessionId });
  });
}
