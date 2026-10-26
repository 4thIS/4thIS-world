import { describe, expect, it } from 'vitest';
import { SignupRequestSchema } from '@4this/shared';
import { ApiError } from '../api/http';
import { errorMessage, fieldErrors } from './errors';

describe('errorMessage', () => {
  it('에러 코드를 한국어 문구로 바꾼다', () => {
    expect(errorMessage(new ApiError(409, 'username_taken', 'x'))).toContain('이미 쓰고 있는 이름');
    expect(errorMessage(new ApiError(429, 'rate_limited', 'x'))).toContain('1분 뒤');
  });

  it('unauthorized는 어디서 났는지에 따라 다르다', () => {
    const err = new ApiError(401, 'unauthorized', 'x');
    expect(errorMessage(err, 'login')).toBe('이름 또는 비밀번호가 맞지 않아요.');
    expect(errorMessage(err, 'admin')).toBe('관리자 비밀번호가 맞지 않아요.');
    expect(errorMessage(err)).toBe('로그인이 필요해요.');
  });

  it('네트워크 에러는 연결 문구', () => {
    expect(errorMessage(new TypeError('Failed to fetch'))).toContain('서버에 연결할 수 없어요');
  });
});

describe('fieldErrors', () => {
  it('필드마다 첫 메시지만 남긴다', () => {
    const r = SignupRequestSchema.safeParse({ username: '철', password: '1' });
    expect(r.success).toBe(false);
    expect(fieldErrors(r.error!.issues)).toEqual({ username: '2자 이상', password: '6자 이상' });
  });
});
