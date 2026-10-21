import { z } from 'zod';
import { LookSchema } from './look';
import { AdminMemberSchema, PasswordSchema, PublicMemberSchema, UsernameSchema } from './member';
import { ScheduleItemSchema, ScheduleListSchema } from './schedule';

/** REST 경로. 서버 라우트와 웹 클라이언트가 같은 값을 쓴다 */
export const API = {
  health: '/api/health',
  world: '/api/world',
  session: '/api/auth/session',
  signup: '/api/auth/signup',
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  adminLogin: '/api/auth/admin',
  me: '/api/me',
  mySchedules: '/api/me/schedules',
  adminMembers: '/api/admin/members',
  adminMember: (id: string) => `/api/admin/members/${encodeURIComponent(id)}`,
  adminApprove: (id: string) => `/api/admin/members/${encodeURIComponent(id)}/approve`,
  adminReject: (id: string) => `/api/admin/members/${encodeURIComponent(id)}/reject`,
  adminBackup: '/api/admin/backup',
} as const;

export const ERROR_CODES = [
  'invalid',
  'unauthorized',
  'forbidden',
  'not_found',
  'username_taken',
  'overlap',
  'rate_limited',
] as const;
export type ApiErrorCode = (typeof ERROR_CODES)[number];

/** 모든 4xx·5xx 응답 본문 */
export const ApiErrorSchema = z.object({
  error: z.enum(ERROR_CODES),
  message: z.string(),
  detail: z.unknown().optional(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;

export const OkSchema = z.object({ ok: z.literal(true) });

export const WorldResponseSchema = z.object({
  serverTime: z.number(),
  members: z.array(PublicMemberSchema),
});
export type WorldResponse = z.infer<typeof WorldResponseSchema>;

export const SignupRequestSchema = z.object({ username: UsernameSchema, password: PasswordSchema });
export type SignupRequest = z.infer<typeof SignupRequestSchema>;

export const LoginRequestSchema = z.object({ username: z.string().trim(), password: z.string() });
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const AdminLoginRequestSchema = z.object({ password: z.string() });
export type AdminLoginRequest = z.infer<typeof AdminLoginRequestSchema>;

export const PatchMeRequestSchema = z.object({
  look: LookSchema.optional(),
  password: z.object({ current: z.string(), next: PasswordSchema }).optional(),
});
export type PatchMeRequest = z.infer<typeof PatchMeRequestSchema>;

export const PutSchedulesRequestSchema = z.object({ items: ScheduleListSchema });
export type PutSchedulesRequest = z.infer<typeof PutSchedulesRequestSchema>;

export const SchedulesResponseSchema = z.object({ items: z.array(ScheduleItemSchema) });
export type SchedulesResponse = z.infer<typeof SchedulesResponseSchema>;

export const AdminMembersResponseSchema = z.object({ members: z.array(AdminMemberSchema) });
export type AdminMembersResponse = z.infer<typeof AdminMembersResponseSchema>;

export const AdminPatchMemberRequestSchema = z.object({
  username: UsernameSchema.optional(),
  look: LookSchema.optional(),
  newPassword: PasswordSchema.optional(),
});
export type AdminPatchMemberRequest = z.infer<typeof AdminPatchMemberRequestSchema>;
