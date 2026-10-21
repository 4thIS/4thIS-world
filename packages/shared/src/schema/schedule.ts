import { z } from 'zod';
import type { PlaceId } from '../campus/types';
import { toMinutes } from '../time';
import type { PoseKind } from './pose';

export const KINDS = [
  'lecture1',
  'lecture2',
  'lecture3',
  'liberal',
  'research',
  'library',
  'external',
] as const;
export type Kind = (typeof KINDS)[number];

/** 일정 종류 하나 = 장소 하나. external은 캠퍼스 밖이라 장소가 없다 */
export const KIND_INFO: Record<
  Kind,
  { label: string; place: PlaceId | null; pose: PoseKind | null; color: string }
> = {
  lecture1: { label: '1학년 강의', place: 'eng-1f', pose: 'sitType', color: '#ffd6e2' },
  lecture2: { label: '2학년 강의', place: 'eng-2f', pose: 'sitType', color: '#ffe3c9' },
  lecture3: { label: '3학년 강의', place: 'eng-3f', pose: 'sitType', color: '#fff1a8' },
  liberal: { label: '교양 강의', place: 'main-2f', pose: 'sitType', color: '#cdeedd' },
  research: { label: '연구', place: 'lab-2f', pose: 'sitType', color: '#cfe6fb' },
  library: { label: '도서관', place: 'main-3f', pose: 'sitRead', color: '#e2dcf3' },
  external: { label: '외부 일정', place: null, pose: null, color: '#e4e1e8' },
};

/** 06:00 ~ 24:00, 30분 단위 */
const HHMM = z
  .string()
  .regex(/^(?:(?:0[6-9]|1\d|2[0-3]):(?:00|30)|24:00)$/, '06:00~24:00, 30분 단위로 입력하세요');

export const ScheduleItemSchema = z
  .object({
    day: z.number().int().min(0).max(6),
    start: HHMM,
    end: HHMM,
    kind: z.enum(KINDS),
    title: z.string().trim().max(20).optional(),
  })
  .refine((i) => toMinutes(i.start) < toMinutes(i.end), {
    message: '끝 시각이 시작보다 늦어야 합니다',
    path: ['end'],
  });
export type ScheduleItem = z.infer<typeof ScheduleItemSchema>;

/**
 * 같은 요일에 겹치는 두 일정의 인덱스 [앞, 뒤]. 없으면 null.
 * 맞닿는 것(10~12, 12~14)은 겹침이 아니다.
 */
export function findOverlap(items: readonly ScheduleItem[]): [number, number] | null {
  const order = items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => a.item.day - b.item.day || toMinutes(a.item.start) - toMinutes(b.item.start));
  for (let k = 1; k < order.length; k++) {
    const prev = order[k - 1]!;
    const cur = order[k]!;
    if (prev.item.day === cur.item.day && toMinutes(cur.item.start) < toMinutes(prev.item.end)) {
      return [prev.index, cur.index];
    }
  }
  return null;
}

export const ScheduleListSchema = z
  .array(ScheduleItemSchema)
  .max(60)
  .superRefine((items, ctx) => {
    const overlap = findOverlap(items);
    if (overlap) {
      ctx.addIssue({ code: 'custom', message: '겹치는 일정이 있습니다', path: [overlap[1]] });
    }
  });
