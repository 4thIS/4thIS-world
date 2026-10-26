import { describe, expect, it } from 'vitest';
import { API, ApiErrorSchema, PutSchedulesRequestSchema, SignupRequestSchema } from './api';
import { SessionSchema } from './member';

describe('API 경로', () => {
  it('관리자 경로는 id를 인코딩한다', () => {
    expect(API.adminApprove('a/b')).toBe('/api/admin/members/a%2Fb/approve');
  });
});

describe('SignupRequestSchema', () => {
  it('아이디 2~12자, 비밀번호 6자 이상', () => {
    expect(SignupRequestSchema.safeParse({ username: '철수', password: '123456' }).success).toBe(
      true,
    );
    expect(SignupRequestSchema.safeParse({ username: '철', password: '123456' }).success).toBe(
      false,
    );
    expect(SignupRequestSchema.safeParse({ username: '철수', password: '12345' }).success).toBe(
      false,
    );
    expect(SignupRequestSchema.safeParse({ username: '철 수', password: '123456' }).success).toBe(
      false,
    );
  });
});

describe('PutSchedulesRequestSchema', () => {
  it('겹치는 시간표를 거부한다', () => {
    const items = [
      { day: 0, start: '09:00', end: '11:00', kind: 'lecture1' },
      { day: 0, start: '10:00', end: '12:00', kind: 'research' },
    ];
    expect(PutSchedulesRequestSchema.safeParse({ items }).success).toBe(false);
  });
});

describe('SessionSchema', () => {
  it('kind로 구분한다', () => {
    expect(SessionSchema.parse({ kind: 'guest' })).toEqual({ kind: 'guest' });
    expect(SessionSchema.safeParse({ kind: 'member' }).success).toBe(false);
  });
});

describe('ApiErrorSchema', () => {
  it('서버 내부 오류는 internal 코드로 구분한다', () => {
    expect(ApiErrorSchema.parse({ error: 'internal', message: '서버 오류' }).error).toBe(
      'internal',
    );
  });
});
