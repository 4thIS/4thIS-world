import { z } from 'zod';
import { LookSchema } from './look';
import { ScheduleItemSchema } from './schedule';

export const UsernameSchema = z
  .string()
  .trim()
  .min(2, '2자 이상')
  .max(12, '12자 이하')
  .regex(/^[가-힣a-zA-Z0-9_]+$/, '한글·영문·숫자·_ 만 쓸 수 있습니다');

export const PasswordSchema = z.string().min(6, '6자 이상').max(72, '72자 이하');

export const MEMBER_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type MemberStatus = (typeof MEMBER_STATUSES)[number];

/** 월드에 보이는 멤버 (승인된 사람만) */
export const PublicMemberSchema = z.object({
  id: z.string(),
  username: z.string(),
  look: LookSchema,
  schedules: z.array(ScheduleItemSchema),
  /** 기숙사생이면 정문 대신 기숙사에서 등하교하고 밤엔 기숙사에서 잔다. 없으면 false */
  dorm: z.boolean().optional(),
});
export type PublicMember = z.infer<typeof PublicMemberSchema>;

/** 로그인한 본인 */
export const MeSchema = z.object({
  id: z.string(),
  username: z.string(),
  status: z.enum(MEMBER_STATUSES),
  look: LookSchema,
  /** 기숙사생인가 (예전 서버 응답에는 없다) */
  dorm: z.boolean().optional(),
});
export type Me = z.infer<typeof MeSchema>;

export const SessionSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('guest') }),
  z.object({ kind: z.literal('member'), me: MeSchema }),
  z.object({ kind: z.literal('admin') }),
]);
export type Session = z.infer<typeof SessionSchema>;

/** 관리자 화면의 멤버 한 줄 */
export const AdminMemberSchema = MeSchema.extend({
  createdAt: z.number(),
  scheduleCount: z.number().int(),
});
export type AdminMember = z.infer<typeof AdminMemberSchema>;
