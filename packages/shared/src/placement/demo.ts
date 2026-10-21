import { rand01 } from '../hash';
import { randomLook } from '../schema/look';
import { KINDS, type ScheduleItem } from '../schema/schedule';
import { fromMinutes } from '../time';
import type { MemberForPlacement } from './types';

/**
 * 개발·테스트용 가짜 멤버 n명. 같은 n이면 항상 같은 결과다.
 * 평일·주말 모두 09:00~22:00 사이에 30분 단위로 겹치지 않는 일정 1~4개를 만든다.
 */
export function demoMembers(n: number): MemberForPlacement[] {
  const names = ['철수', '영희', '지우', '민준', '서연', '하준', '지민', '도윤', '수아', '예준'];
  return Array.from({ length: n }, (_, i) => {
    const schedules: ScheduleItem[] = [];
    for (let day = 0; day < 7; day++) {
      let cur = 9 * 60 + Math.floor(rand01('demo', i, day, 'start') * 4) * 30;
      const count = 1 + Math.floor(rand01('demo', i, day, 'count') * 4);
      for (let k = 0; k < count; k++) {
        const len = (2 + Math.floor(rand01('demo', i, day, k, 'len') * 4)) * 30;
        if (cur + len > 22 * 60) break;
        const kind = KINDS[Math.floor(rand01('demo', i, day, k, 'kind') * KINDS.length)]!;
        schedules.push({
          day,
          start: fromMinutes(cur),
          end: fromMinutes(cur + len),
          kind,
          ...(kind === 'external' ? { title: '알바' } : {}),
        });
        cur += len + Math.floor(rand01('demo', i, day, k, 'gap') * 4) * 30;
      }
    }
    let seed = 0;
    const look = randomLook(() => rand01('demo', i, 'look', seed++));
    const username = `${names[i % names.length]}${i >= names.length ? Math.floor(i / names.length) : ''}`;
    return { id: `demo-${i}`, username, look, schedules };
  });
}
