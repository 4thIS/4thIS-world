import { fromMinutes } from '../time';
import { planMinutes } from './sample';
import type { BoardEntry, DayPlan } from './types';

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/** 정문 게시판: 시각 t에 외부 일정 중인 멤버들. 끝나는 시각, 이름 순 (§7.2-4) */
export function boardAt(plan: DayPlan, t: number): BoardEntry[] {
  const m = planMinutes(plan, t);
  const entries: BoardEntry[] = [];
  for (const [memberId, segments] of plan.segments) {
    for (const seg of segments) {
      if (seg.kind === 'away' && seg.since <= m && m < seg.to) {
        entries.push({
          memberId,
          username: plan.usernames.get(memberId) ?? '',
          title: seg.title,
          until: fromMinutes(seg.to),
        });
      }
    }
  }
  return entries.sort(
    (a, b) => cmp(a.until, b.until) || cmp(a.username, b.username) || cmp(a.memberId, b.memberId),
  );
}
