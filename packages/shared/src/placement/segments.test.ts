import { describe, expect, it } from 'vitest';
import type { ScheduleItem } from '../schema/schedule';
import { freeChoice, gapBlocks, planBlocks, type Block } from './segments';
import { LINE_CAMPUS, WED, WEDNESDAY, idWithFree } from './test-fixtures';

const item = (start: string, end: string, kind: ScheduleItem['kind'], title?: string) =>
  ({ day: WEDNESDAY, start, end, kind, ...(title ? { title } : {}) }) as ScheduleItem;

/** 구간을 [시작, 끝, 종류]로 줄여 비교하기 쉽게 */
const brief = (blocks: Block[]) => blocks.map((b) => [b.from, b.to, b.activity.kind]);

const H = (h: number, m = 0) => h * 60 + m;

describe('planBlocks', () => {
  it('일정이 없으면 빈 목록 (부재)', () => {
    expect(planBlocks('m', WED, [], LINE_CAMPUS)).toEqual([]);
  });

  it('외부 일정만 있어도 등교해서 카페에 앉아 있다 (외부 일정은 카페)', () => {
    const blocks = planBlocks('m', WED, [item('10:00', '12:00', 'external')], LINE_CAMPUS);
    expect(brief(blocks)).toEqual([
      [H(9, 55), H(10), 'wait'],
      [H(10), H(12), 'class'],
      [H(12), H(12), 'home'],
    ]);
    expect(blocks[0]!.activity).toEqual({ kind: 'wait', node: 'cafe-door' });
    expect(blocks[1]!.activity).toEqual({
      kind: 'class',
      placeId: 'cafe',
      pose: 'sitSip',
      status: '외부 일정 ☕',
    });
  });

  it('첫 캠퍼스 일정 5분 전에 등교해 건물 앞에서 기다린다', () => {
    const blocks = planBlocks('m', WED, [item('09:00', '10:00', 'lecture1')], LINE_CAMPUS);
    expect(brief(blocks)).toEqual([
      [H(8, 55), H(9), 'wait'],
      [H(9), H(10), 'class'],
      [H(10), H(10), 'home'],
    ]);
    expect(blocks[0]!.activity).toEqual({ kind: 'wait', node: 'eng-door' });
    expect(blocks[1]!.activity).toEqual({
      kind: 'class',
      placeId: 'eng-1f',
      pose: 'sitType',
      status: '1학년 강의',
    });
  });

  it('지우의 수요일: 외부 일정(알바)도 카페에서 보낸다', () => {
    const id = idWithFree('cafe');
    const blocks = planBlocks(
      id,
      WED,
      [
        item('16:00', '18:00', 'research'),
        item('09:00', '12:00', 'lecture1'),
        item('13:00', '15:00', 'external', '알바'),
      ],
      LINE_CAMPUS,
    );
    expect(brief(blocks)).toEqual([
      [H(8, 55), H(9), 'wait'],
      [H(9), H(12), 'class'],
      [H(12), H(13), 'lunch'],
      [H(13), H(15), 'class'],
      [H(15), H(16), 'cafe'],
      [H(16), H(18), 'class'],
      [H(18), H(18), 'home'],
    ]);
    expect(blocks[3]!.activity).toMatchObject({ placeId: 'cafe', status: '알바 ☕' });
  });

  it('외부 일정이 첫 일정이면 그 5분 전에 등교하고, 마지막이면 끝나고 하교한다', () => {
    const blocks = planBlocks(
      'm',
      WED,
      [item('07:00', '08:00', 'external'), item('10:00', '11:00', 'library')],
      LINE_CAMPUS,
    );
    expect(brief(blocks)[0]).toEqual([H(6, 55), H(7), 'wait']);
    const last = planBlocks(
      'm',
      WED,
      [item('09:00', '10:00', 'lecture2'), item('11:00', '12:00', 'external')],
      LINE_CAMPUS,
    );
    expect(brief(last).at(-1)).toEqual([H(12), H(12), 'home']);
  });

  it('다음 일정이 외부 일정이면 카페 앞에서 기다린다', () => {
    const blocks = planBlocks(
      'm',
      WED,
      [
        item('09:00', '10:00', 'lecture1'),
        item('10:10', '11:00', 'external'),
        item('14:00', '15:00', 'liberal'),
      ],
      LINE_CAMPUS,
    );
    expect(blocks[2]).toEqual({
      from: H(10),
      to: H(10, 10),
      activity: { kind: 'wait', node: 'cafe-door' },
    });
    expect(blocks[3]!.activity).toMatchObject({ kind: 'class', placeId: 'cafe' });
  });

  it('맞닿은 같은 일정은 하나로 합친다 (자리를 옮기지 않는다)', () => {
    const blocks = planBlocks(
      'm',
      WED,
      [
        item('09:00', '10:00', 'lecture3', '알고리즘'),
        item('10:00', '11:00', 'lecture3', '알고리즘'),
      ],
      LINE_CAMPUS,
    );
    expect(brief(blocks)).toEqual([
      [H(8, 55), H(9), 'wait'],
      [H(9), H(11), 'class'],
      [H(11), H(11), 'home'],
    ]);
    expect(blocks[1]!.activity).toMatchObject({ status: '3학년 강의 · 알고리즘' });
  });
});

describe('gapBlocks', () => {
  const park = idWithFree('park');

  it('20분 미만이면 다음 건물 입구에서 기다린다', () => {
    expect(gapBlocks(park, WED, H(10), H(10, 19), 'lab-door')).toEqual([
      { from: H(10), to: H(10, 19), activity: { kind: 'wait', node: 'lab-door' } },
    ]);
  });

  it('점심은 11:30~13:30과 겹친 부분, 최대 60분', () => {
    expect(brief(gapBlocks(park, WED, H(11), H(14), 'eng-door'))).toEqual([
      [H(11), H(11, 30), 'park'],
      [H(11, 30), H(12, 30), 'lunch'],
      [H(12, 30), H(14), 'park'],
    ]);
    expect(brief(gapBlocks(park, WED, H(12, 30), H(15), 'eng-door'))).toEqual([
      [H(12, 30), H(13, 30), 'lunch'],
      [H(13, 30), H(15), 'park'],
    ]);
    expect(brief(gapBlocks(park, WED, H(14), H(16), 'eng-door'))).toEqual([[H(14), H(16), 'park']]);
  });

  it('10분 미만 조각은 앞 조각에, 첫 조각이면 뒤 조각에 붙인다', () => {
    expect(brief(gapBlocks(park, WED, H(11, 25), H(12), 'eng-door'))).toEqual([
      [H(11, 25), H(12), 'lunch'],
    ]);
    expect(brief(gapBlocks(park, WED, H(10), H(11, 35), 'eng-door'))).toEqual([
      [H(10), H(11, 35), 'park'],
    ]);
  });

  it('공원/카페는 멤버·날짜마다 고정이고 둘 다 나온다', () => {
    const cafe = idWithFree('cafe');
    expect(brief(gapBlocks(cafe, WED, H(14), H(15), 'eng-door'))).toEqual([[H(14), H(15), 'cafe']]);
    expect(freeChoice(cafe, WED)).toBe(freeChoice(cafe, WED));
    const choices = new Set(Array.from({ length: 20 }, (_, i) => freeChoice(`m${i}`, WED)));
    expect(choices).toEqual(new Set(['park', 'cafe']));
  });
});
