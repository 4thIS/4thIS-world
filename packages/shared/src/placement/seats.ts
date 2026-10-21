import type { Campus, PlaceId, Seat } from '../campus/types';

/** 좌석이 필요한 구간 하나 (강의·연구·도서관·점심·카페) */
export interface SeatRequest {
  memberId: string;
  placeId: PlaceId;
  from: number;
  to: number;
}

export interface SeatAssignment {
  /** 0부터. seats.length 이상이면 넘침 자리 */
  index: number;
  seat: Seat;
  overflow: boolean;
  /** 넘침 자리라도 앉는 곳인가 (카페 테라스) */
  sit: boolean;
}

/**
 * 넘침 자리 중 앞의 몇 개가 앉는 자리인지. 나머지는 서 있는 자리다.
 * 카페: 테라스 4자리(앉음) + 스탠딩 (shared/campus/data.ts의 cafe.overflow 순서)
 */
export const SITTING_OVERFLOW: Partial<Record<PlaceId, number>> = { cafe: 4 };

/** 코드 포인트 순 비교. localeCompare는 실행 환경마다 다를 수 있어 쓰지 않는다 */
function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * 구간 색칠로 좌석을 준다 (§7.4). 결과는 requests와 같은 순서.
 * 장소마다 (시작, memberId) 순으로 정렬하고, 그 구간 동안 비어 있는 가장 앞 번호를 준다.
 * 좌석이 모자라면 넘침 자리를 같은 규칙으로 쓰고, 그것도 모자라면 넘침 자리를 다시 돌려 쓴다.
 */
export function assignSeats(requests: readonly SeatRequest[], campus: Campus): SeatAssignment[] {
  const result: SeatAssignment[] = new Array(requests.length);
  const byPlace = new Map<PlaceId, number[]>();
  requests.forEach((r, i) => {
    const list = byPlace.get(r.placeId) ?? [];
    list.push(i);
    byPlace.set(r.placeId, list);
  });

  for (const [placeId, indices] of byPlace) {
    const place = campus.places[placeId];
    indices.sort((a, b) => {
      const ra = requests[a]!;
      const rb = requests[b]!;
      return ra.from - rb.from || cmp(ra.memberId, rb.memberId);
    });
    /** 좌석 번호별로 비는 시각 */
    const busyUntil: number[] = [];
    for (const i of indices) {
      const r = requests[i]!;
      let index = busyUntil.findIndex((until) => until <= r.from);
      if (index === -1) index = busyUntil.length;
      busyUntil[index] = r.to;

      const k = index - place.seats.length;
      if (k < 0) {
        result[i] = { index, seat: place.seats[index]!, overflow: false, sit: true };
      } else if (place.overflow.length > 0) {
        result[i] = {
          index,
          seat: place.overflow[k % place.overflow.length]!,
          overflow: true,
          sit: k < (SITTING_OVERFLOW[placeId] ?? 0),
        };
      } else {
        result[i] = {
          index,
          seat: place.seats[index % place.seats.length]!,
          overflow: true,
          sit: true,
        };
      }
    }
  }
  return result;
}
