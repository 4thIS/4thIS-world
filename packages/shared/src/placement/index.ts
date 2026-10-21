import { FLOOR_HEIGHT, type Campus } from '../campus/types';
import { kstMinutes, kstWeekday } from '../time';
import type { BoardEntry, ComputeDayInput, DayPlan, Pose } from './types';

export * from './types';

/**
 * 하루 계획을 만든다. (cw#1: 빈 계획을 돌려주는 계약용 구현, cw#2에서 §7 규칙으로 채운다)
 */
export function computeDay(input: ComputeDayInput): DayPlan {
  const weekday = kstWeekday(Date.parse(`${input.date}T12:00:00+09:00`));
  return {
    date: input.date,
    weekday,
    usernames: new Map(input.members.map((m) => [m.id, m.username])),
    segments: new Map(input.members.map((m) => [m.id, []])),
  };
}

/** 시각 t(epoch ms)에 멤버가 어디서 무엇을 하는지. 캠퍼스에 없으면 null (cw#2에서 구현) */
export function sampleAt(_plan: DayPlan, _memberId: string, _t: number): Pose | null {
  return null;
}

/** 시각 t에 외부 일정 중인 멤버 목록 (cw#2에서 구현) */
export function boardAt(_plan: DayPlan, _t: number): BoardEntry[] {
  return [];
}

export const PROFESSOR_HOURS = { start: 9 * 60, end: 18 * 60 } as const;

/** 사자 교수님: 평일 09:00~18:00 연구동 2F 책상 */
export function professorAt(t: number, campus: Campus): Pose | null {
  const min = kstMinutes(t);
  if (kstWeekday(t) > 4 || min < PROFESSOR_HOURS.start || min >= PROFESSOR_HOURS.end) return null;
  const { pos, facing } = campus.professorSeat;
  return {
    position: [pos[0], FLOOR_HEIGHT, pos[1]],
    facing,
    pose: 'sitType',
    placeId: 'lab-2f',
    floor: 2,
    status: '교수님',
    opacity: 1,
  };
}
