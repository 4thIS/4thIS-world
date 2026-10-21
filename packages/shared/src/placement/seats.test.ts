import { describe, expect, it } from 'vitest';
import { assignSeats, type SeatRequest } from './seats';
import { LINE_CAMPUS } from './test-fixtures';

const req = (
  memberId: string,
  from: number,
  to: number,
  placeId: SeatRequest['placeId'] = 'eng-1f',
) => ({
  memberId,
  placeId,
  from,
  to,
});

describe('assignSeats', () => {
  it('(시작, memberId) 순으로 비어 있는 가장 앞 좌석을 준다', () => {
    const result = assignSeats(
      [req('b', 540, 600), req('a', 540, 600), req('c', 570, 630), req('d', 600, 660)],
      LINE_CAMPUS,
    );
    expect(result.map((r) => r.index)).toEqual([1, 0, 2, 0]);
    expect(result[1]!.seat).toEqual(LINE_CAMPUS.places['eng-1f'].seats[0]);
    expect(result[3]!.seat).toEqual(LINE_CAMPUS.places['eng-1f'].seats[0]);
  });

  it('좌석이 모자라면 넘침 자리에 서고, 넘침 자리도 모자라면 돌려 쓴다', () => {
    const result = assignSeats(
      ['a', 'b', 'c', 'd'].map((id) => req(id, 540, 600)),
      LINE_CAMPUS,
    );
    const overflow = LINE_CAMPUS.places['eng-1f'].overflow[0];
    expect(result[2]).toEqual({ index: 2, seat: overflow, overflow: true, sit: false });
    expect(result[3]).toEqual({ index: 3, seat: overflow, overflow: true, sit: false });
  });

  it('카페 넘침 자리(테라스)는 앉는다', () => {
    const result = assignSeats(
      ['a', 'b', 'c'].map((id) => req(id, 900, 960, 'cafe')),
      LINE_CAMPUS,
    );
    expect(result[2]).toMatchObject({ index: 2, overflow: true, sit: true });
  });

  it('장소가 다르면 서로 영향이 없다', () => {
    const result = assignSeats([req('a', 540, 600), req('b', 540, 600, 'eng-2f')], LINE_CAMPUS);
    expect(result.map((r) => r.index)).toEqual([0, 0]);
  });

  it('입력 순서가 달라도 같은 결과', () => {
    const reqs = [req('c', 570, 630), req('a', 540, 600), req('b', 540, 600), req('d', 600, 660)];
    const forward = assignSeats(reqs, LINE_CAMPUS);
    const backward = assignSeats([...reqs].reverse(), LINE_CAMPUS).reverse();
    expect(backward).toEqual(forward);
  });
});
