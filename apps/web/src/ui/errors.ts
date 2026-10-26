import type { ApiErrorCode } from '@4this/shared';
import { ApiError } from '../api/http';

/** 어떤 요청에서 난 에러인지. unauthorized 문구가 달라진다 */
export type ErrorContext = 'login' | 'admin' | 'other';

const MESSAGES: Record<ApiErrorCode, string> = {
  invalid: '입력값을 다시 확인해 주세요.',
  unauthorized: '로그인이 필요해요.',
  forbidden: '권한이 없어요.',
  not_found: '찾을 수 없어요.',
  username_taken: '이미 쓰고 있는 이름이에요. 다른 이름을 골라 주세요.',
  overlap: '겹치는 일정이 있어요.',
  rate_limited: '시도가 너무 많아요. 1분 뒤에 다시 해 주세요.',
  internal: '서버에 문제가 생겼어요. 잠시 뒤 다시 해 주세요.',
};

/** API 에러 → 화면에 보여 줄 한국어 문구 */
export function errorMessage(err: unknown, context: ErrorContext = 'other'): string {
  if (!(err instanceof ApiError)) return '서버에 연결할 수 없어요. 잠시 뒤 다시 해 주세요.';
  if (err.code === 'unauthorized' && context === 'login')
    return '이름 또는 비밀번호가 맞지 않아요.';
  if (err.code === 'unauthorized' && context === 'admin') return '관리자 비밀번호가 맞지 않아요.';
  return MESSAGES[err.code];
}

interface IssueLike {
  path: readonly PropertyKey[];
  message: string;
}

/** zod 검증 실패 → { 필드: 첫 번째 메시지 } */
export function fieldErrors(issues: readonly IssueLike[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '');
    out[key] ??= issue.message;
  }
  return out;
}
