import type { FastifyError, FastifyInstance } from 'fastify';
import type { z } from 'zod';
import type { ApiErrorBody, ApiErrorCode } from '@4this/shared';

/** 라우트에서 throw하면 ApiErrorSchema 모양으로 응답한다 */
export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const unauthorized = (message = '로그인이 필요합니다') =>
  new HttpError(401, 'unauthorized', message);
export const forbidden = (message = '권한이 없습니다') => new HttpError(403, 'forbidden', message);
export const notFound = (message = '찾을 수 없습니다') => new HttpError(404, 'not_found', message);

/** shared zod 스키마로 검사한다. 실패하면 400 invalid, detail에 zod 이슈 목록 */
export function parse<S extends z.ZodType>(schema: S, value: unknown): z.infer<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new HttpError(400, 'invalid', '입력값이 올바르지 않습니다', result.error.issues);
  }
  return result.data;
}

function body(code: ApiErrorCode, message: string, detail?: unknown): ApiErrorBody {
  return detail === undefined ? { error: code, message } : { error: code, message, detail };
}

/** 모든 오류와 404를 ApiErrorSchema 모양으로 바꾼다 */
export function registerErrorHandlers(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | HttpError, request, reply) => {
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send(body(error.code, error.message, error.detail));
    }
    const status = error.statusCode ?? 500;
    if (status === 429) {
      return reply.status(429).send(body('rate_limited', '잠시 후 다시 시도하세요'));
    }
    if (status >= 400 && status < 500) {
      return reply.status(status).send(body('invalid', error.message));
    }
    request.log.error(error);
    return reply.status(500).send(body('invalid', '서버 오류가 발생했습니다'));
  });
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(body('not_found', `${request.method} ${request.url} 경로가 없습니다`));
  });
}
