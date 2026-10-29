import { describe, expect, it } from 'vitest';
import { CAMPUS } from '../campus/data';
import { FLOOR_HEIGHT } from '../campus/types';
import type { ScheduleItem } from '../schema/schedule';
import { DORM_SLOT_MIN, SLEEP_START_MIN, WAKE_MIN } from './constants';
import { computeDay, sampleAt } from './index';
import { dormFree, planDormBlocks, type Block } from './segments';
import { LINE_CAMPUS, WED, WEDNESDAY, member } from './test-fixtures';

const item = (start: string, end: string, kind: ScheduleItem['kind']) =>
  ({ day: WEDNESDAY, start, end, kind }) as ScheduleItem;
const brief = (blocks: Block[]) => blocks.map((b) => [b.from, b.to, b.activity.kind]);
const H = (h: number, m = 0) => h * 60 + m;
const at = (hhmm: string) => Date.parse(`${WED}T${hhmm}:00+09:00`);

describe('planDormBlocks', () => {
  it('일정이 없는 날: 밤엔 자고, 낮(07~23시)엔 자유 시간과 점심', () => {
    const blocks = planDormBlocks('m', WED, [], LINE_CAMPUS, 0);
    expect(blocks[0]).toMatchObject({ from: 0, to: WAKE_MIN, activity: { kind: 'sleep', bed: 0 } });
    expect(blocks.at(-1)).toMatchObject({
      from: SLEEP_START_MIN,
      to: H(24),
      activity: { kind: 'sleep', bed: 0 },
    });
    const day = blocks.slice(1, -1);
    expect(day[0]!.from).toBe(WAKE_MIN);
    expect(day.at(-1)!.to).toBe(SLEEP_START_MIN);
    for (const b of day) expect(['lounge', 'park', 'cafe', 'lunch']).toContain(b.activity.kind);
    expect(day.some((b) => b.activity.kind === 'lunch')).toBe(true);
    // 빈틈 없이 이어진다
    blocks.slice(1).forEach((b, i) => expect(b.from).toBe(blocks[i]!.to));
  });

  it('일정이 있으면 기숙사에서 나와 강의를 듣고, 끝나면 자유 시간 뒤 23시에 잔다', () => {
    const blocks = planDormBlocks('m', WED, [item('09:00', '10:00', 'lecture1')], LINE_CAMPUS, 1);
    const kinds = brief(blocks);
    expect(kinds[0]).toEqual([0, WAKE_MIN, 'sleep']);
    expect(kinds).toContainEqual([H(9), H(10), 'class']);
    expect(kinds.at(-1)).toEqual([SLEEP_START_MIN, H(24), 'sleep']);
    expect(kinds.some(([, , k]) => k === 'home')).toBe(false);
  });

  it('7시 전 일정이면 그 5분 전까지만 자고, 23시 넘어 끝나는 일정 뒤에 잔다', () => {
    const blocks = planDormBlocks(
      'm',
      WED,
      [item('06:00', '07:00', 'research'), item('22:00', '23:30', 'library')],
      LINE_CAMPUS,
      0,
    );
    expect(brief(blocks)[0]).toEqual([0, H(5, 55), 'sleep']);
    expect(brief(blocks).at(-1)).toEqual([H(23, 30), H(24), 'sleep']);
  });

  it('외부 일정은 카페에서 보낸다', () => {
    const blocks = planDormBlocks('m', WED, [item('13:00', '15:00', 'external')], LINE_CAMPUS, 0);
    expect(brief(blocks)).toContainEqual([H(13), H(15), 'class']);
    expect(blocks.find((b) => b.from === H(13))!.activity).toMatchObject({ placeId: 'cafe' });
  });

  it('자유 시간 장소는 90분 칸마다 휴게실·공원·카페 중 하나로 정해진다 (결정적)', () => {
    expect(dormFree('m', WED, 5)).toBe(dormFree('m', WED, 5));
    const seen = new Set(
      Array.from({ length: 30 }, (_, i) =>
        dormFree(`m${i}`, WED, Math.floor(H(15) / DORM_SLOT_MIN)),
      ),
    );
    expect(seen).toEqual(new Set(['lounge', 'park', 'cafe']));
  });
});

describe('기숙사생의 하루 (computeDay·sampleAt)', () => {
  const dormer = { ...member([], 'd1', '기숙'), dorm: true };
  const second = { ...member([], 'd2', '기숙2'), dorm: true };
  const commuter = member([], 'c1', '통학');
  const plan = computeDay({ date: WED, campus: CAMPUS, members: [dormer, second, commuter] });

  it('새벽에는 기숙사 침대에 누워 잔다', () => {
    const pose = sampleAt(plan, 'd1', at('03:00'))!;
    expect(pose).toMatchObject({ pose: 'sleep', status: '자는 중 😴', opacity: 1 });
    expect(['dorm-2f', 'dorm-3f']).toContain(pose.placeId);
    expect(pose.position[1]).toBeCloseTo((pose.floor - 1) * FLOOR_HEIGHT);
  });

  it('기숙사생마다 다른 침대를 쓴다', () => {
    const a = sampleAt(plan, 'd1', at('03:00'))!;
    const b = sampleAt(plan, 'd2', at('03:00'))!;
    expect(a.position).not.toEqual(b.position);
  });

  it('밤 11시 반에도 자고 있다', () => {
    expect(sampleAt(plan, 'd1', at('23:30'))).toMatchObject({ pose: 'sleep' });
  });

  it('일정 없는 낮에도 캠퍼스 어딘가에 있다', () => {
    expect(sampleAt(plan, 'd1', at('15:00'))).not.toBeNull();
  });

  it('기숙사생이 아니면 일정 없는 날엔 캠퍼스에 없다 (그대로)', () => {
    expect(sampleAt(plan, 'c1', at('03:00'))).toBeNull();
    expect(sampleAt(plan, 'c1', at('15:00'))).toBeNull();
  });
});
