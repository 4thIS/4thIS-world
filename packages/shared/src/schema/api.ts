import { z } from 'zod';
import { DAY_MS } from '../time';
import { FeaturesSchema, WEAPONS } from './shot';
import { WEATHER_MODES } from './weather';
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
  /** 관리자: 다른 사람 시간표 보기·바꾸기 */
  adminSchedules: (id: string) => `/api/admin/members/${encodeURIComponent(id)}/schedules`,
  adminBackup: '/api/admin/backup',
  adminLook: '/api/admin/look',
  /** 관리자 설정: 장난감 쏘기·날씨·시간 */
  adminSettings: '/api/admin/settings',
  weather: '/api/weather',
} as const;

export const ERROR_CODES = [
  'invalid',
  'unauthorized',
  'forbidden',
  'not_found',
  'username_taken',
  'overlap',
  'rate_limited',
  /** 서버 안에서 난 예상하지 못한 오류 (500) */
  'internal',
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
  /** 관리자 캐릭터 (사이트에 하나, 24시간 광장 중앙). 서버는 항상 보낸다 */
  admin: z.object({ look: LookSchema }).optional(),
  /** 관리자가 켜고 끄는 기능. 없으면 기본값(DEFAULT_FEATURES) */
  features: FeaturesSchema.optional(),
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

/** 관리자 캐릭터 생김새 바꾸기 (관리자만). 응답도 같은 모양 */
export const AdminLookSchema = z.object({ look: LookSchema });
export type AdminLook = z.infer<typeof AdminLookSchema>;

/** 관리자 설정 (사이트 전체). 날씨·시간을 고정하면 모든 사람의 캠퍼스가 그 날씨·시각이 된다 */
export const AdminSettingsSchema = z.object({
  /** 쏠 수 있는 장난감 하나. null이면 끔 */
  weapon: z.enum(WEAPONS).nullable(),
  weather: z.enum(WEATHER_MODES),
  /** 캠퍼스 시계를 실제보다 얼마나 앞뒤로 (ms). 0이면 실제 시각 */
  clockOffsetMs: z
    .number()
    .int()
    .min(-7 * DAY_MS)
    .max(7 * DAY_MS),
});
export type AdminSettings = z.infer<typeof AdminSettingsSchema>;

/** 바꿀 것만 보낸다 */
export const PatchAdminSettingsSchema = AdminSettingsSchema.partial();
export type PatchAdminSettings = z.infer<typeof PatchAdminSettingsSchema>;
