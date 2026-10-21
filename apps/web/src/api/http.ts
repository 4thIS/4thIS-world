import type { z } from 'zod';
import { ApiErrorSchema, type ApiErrorCode } from '@4this/shared';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** 같은 출처 쿠키 세션으로 요청하고, 응답을 shared 스키마로 검증한다 */
export async function request<S extends z.ZodType>(
  method: Method,
  url: string,
  schema: S,
  body?: unknown,
): Promise<z.infer<S>> {
  const res = await fetch(url, {
    method,
    credentials: 'same-origin',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data: unknown = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const parsed = ApiErrorSchema.safeParse(data);
    if (parsed.success) {
      throw new ApiError(res.status, parsed.data.error, parsed.data.message, parsed.data.detail);
    }
    throw new ApiError(res.status, 'invalid', `HTTP ${res.status}`);
  }
  return schema.parse(data);
}
