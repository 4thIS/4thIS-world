import { vi } from 'vitest';
import type { AdminMember, Me } from '@4this/shared';

/**
 * 테스트용 가짜 서버. 서버(wj)가 없어도 화면을 만들고 검증할 수 있게
 * `'METHOD /api/경로'` → 응답을 정해 fetch를 바꿔 끼운다.
 */
type Reply = { status?: number; body: unknown };
type Route = Reply | ((body: unknown) => Reply);

export interface ApiCall {
  method: string;
  url: string;
  body: unknown;
}

export function mockApi(routes: Record<string, Route>) {
  const calls: ApiCall[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method ?? 'GET';
    const body: unknown = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url, body });
    const route = routes[`${method} ${url}`];
    if (!route) {
      return new Response(JSON.stringify({ error: 'not_found', message: '목 없음' }), {
        status: 404,
      });
    }
    const reply = typeof route === 'function' ? route(body) : route;
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls, fetchMock };
}

/** 에러 응답 본문 */
export const apiError = (status: number, error: string, message = error): Reply => ({
  status,
  body: { error, message },
});

export const ME_PENDING: Me = {
  id: 'm1',
  username: '철수',
  status: 'pending',
  look: { animal: 'dog', color: 'default', head: 'none', eyes: 'none', neck: 'none' },
};

export const ME_APPROVED: Me = { ...ME_PENDING, status: 'approved' };

export const ADMIN_MEMBERS: AdminMember[] = [
  { ...ME_PENDING, createdAt: Date.parse('2026-10-20T10:00:00+09:00'), scheduleCount: 0 },
  {
    id: 'm2',
    username: '지우',
    status: 'approved',
    look: { animal: 'duck', color: 'sky', head: 'cap', eyes: 'none', neck: 'none' },
    createdAt: Date.parse('2026-10-01T09:00:00+09:00'),
    scheduleCount: 5,
  },
];
