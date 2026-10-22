import { createHash, timingSafeEqual } from 'node:crypto';
import { compare, hash } from 'bcryptjs';

const COST = 10;

export function hashPassword(password: string): Promise<string> {
  return hash(password, COST);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

/** 없는 아이디로 로그인할 때도 같은 시간이 걸리도록 비교할 가짜 해시 */
let dummyHash: Promise<string> | null = null;
export async function burnPasswordCheck(password: string): Promise<void> {
  dummyHash ??= hash('dummy-password', COST);
  await compare(password, await dummyHash);
}

/** 길이와 상관없이 일정한 시간에 두 문자열을 비교한다 (ADMIN_PASSWORD) */
export function safeEqual(a: string, b: string): boolean {
  const da = createHash('sha256').update(a).digest();
  const db = createHash('sha256').update(b).digest();
  return timingSafeEqual(da, db);
}
