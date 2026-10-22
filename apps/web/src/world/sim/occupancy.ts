import {
  PLACE_IDS,
  professorAt,
  sampleAt,
  type BuildingId,
  type Campus,
  type DayPlan,
  type PlaceId,
  type Pose,
  type PublicMember,
} from '@4this/shared';
import type { FloorKey } from '../contracts';

const PLACES: ReadonlySet<string> = new Set(PLACE_IDS);

export const PROFESSOR_ID = 'professor';
export const PROFESSOR_NAME = '사자 교수님';

export interface Snapshot {
  id: string;
  username: string;
  pose: Pose | null;
}

/** 시각 t에 모든 멤버(+ 사자 교수님)가 어디 있는지 */
export function snapshotAt(
  plan: DayPlan,
  members: readonly PublicMember[],
  t: number,
  campus: Campus,
): Snapshot[] {
  return [
    ...members.map((m) => ({ id: m.id, username: m.username, pose: sampleAt(plan, m.id, t) })),
    { id: PROFESSOR_ID, username: PROFESSOR_NAME, pose: professorAt(t, campus) },
  ];
}

/** 장소(강의실·식당 등)에 있는 포즈면 그 건물. 걷는 중·바깥이면 null */
export function buildingOf(pose: Pose | null, campus: Campus): BuildingId | null {
  if (!pose || !PLACES.has(pose.placeId)) return null;
  return campus.places[pose.placeId as PlaceId].building;
}

/** 사람이 있는 층들 ('eng:2'). 밤에 창문 불빛을 켤 때 쓴다 */
export function occupiedFloors(snapshot: readonly Snapshot[], campus: Campus): Set<FloorKey> {
  const floors = new Set<FloorKey>();
  for (const { pose } of snapshot) {
    const building = buildingOf(pose, campus);
    if (building && pose) floors.add(`${building}:${pose.floor}`);
  }
  return floors;
}

export function sameFloors(a: ReadonlySet<FloorKey>, b: ReadonlySet<FloorKey>): boolean {
  if (a.size !== b.size) return false;
  for (const key of a) if (!b.has(key)) return false;
  return true;
}

/** 건물 패널: 지금 그 건물에 있는 사람. 층, 이름 순 */
export function peopleIn(
  snapshot: readonly Snapshot[],
  building: BuildingId,
  campus: Campus,
): { id: string; username: string; status: string; floor: number }[] {
  return snapshot
    .filter((s) => buildingOf(s.pose, campus) === building)
    .map((s) => ({ id: s.id, username: s.username, status: s.pose!.status, floor: s.pose!.floor }))
    .sort((a, b) => a.floor - b.floor || (a.username < b.username ? -1 : 1));
}

/** 다가간 건물에서 숨긴 층보다 위에 있는 캐릭터는 그리지 않는다 */
export function hiddenByCutaway(
  pose: Pose,
  focused: BuildingId | null,
  hiddenAboveFloor: number | null,
  campus: Campus,
): boolean {
  if (!focused || hiddenAboveFloor === null || pose.floor <= hiddenAboveFloor) return false;
  const { min, max } = campus.buildings[focused];
  const [x, , z] = pose.position;
  return x >= min[0] && x <= max[0] && z >= min[1] && z <= max[1];
}
