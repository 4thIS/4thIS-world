import { CAMPUS, KIND_INFO, type Kind, type PlaceId } from '@4this/shared';

/** 외부 일정 시간은 카페에서 보낸다 (placement와 같다) */
const EXTERNAL_PLACE: PlaceId = 'cafe';

/** 일정 종류 → 캠퍼스 위치 설명: '공학관 1층'. 1층짜리 건물은 층을 빼고 이름만 */
export function kindPlace(kind: Kind): string {
  const place = CAMPUS.places[KIND_INFO[kind].place ?? EXTERNAL_PLACE];
  const b = CAMPUS.buildings[place.building];
  return b.floors > 1 ? `${b.name} ${place.floor}층` : b.name;
}
