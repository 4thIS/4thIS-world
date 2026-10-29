/**
 * 캠퍼스 좌표계
 * - 단위 m, 원점은 캠퍼스 중앙, 바닥은 y = 0
 * - +x 동쪽, +z 남쪽(정문 방향), 캠퍼스는 x·z 모두 [-25, 25]
 * - facing은 Object3D.rotation.y (라디안). 0이면 +z(남쪽)를 바라본다
 * - n층 바닥 높이 = (n - 1) * FLOOR_HEIGHT
 */
export const CAMPUS_HALF = 25;
export const FLOOR_HEIGHT = 3.2;

export type Vec2 = readonly [x: number, z: number];

export const BUILDING_IDS = ['eng', 'main', 'lab', 'cafe', 'dorm'] as const;
export type BuildingId = (typeof BUILDING_IDS)[number];

export const PLACE_IDS = [
  'eng-1f',
  'eng-2f',
  'eng-3f',
  'lab-2f',
  'main-1f',
  'main-2f',
  'main-3f',
  'cafe',
  'dorm-1f',
  'dorm-2f',
  'dorm-3f',
] as const;
export type PlaceId = (typeof PLACE_IDS)[number];

export type NodeId = string;

export interface Seat {
  pos: Vec2;
  facing: number;
}

export interface Place {
  id: PlaceId;
  building: BuildingId;
  /** 1부터 */
  floor: number;
  /** 이 층 계단참 (문으로 들어와 페이드 후 나타나는 지점) */
  landing: Vec2;
  /** 좌석. 배열 순서 = 좌석 번호 */
  seats: Seat[];
  /** 좌석이 모자랄 때 쓰는 자리 (스탠딩, 테라스, 배식대 줄) */
  overflow: Seat[];
}

export interface Building {
  id: BuildingId;
  name: string;
  floors: number;
  /** 건물 바닥 사각형 (x, z 최소·최대) */
  min: Vec2;
  max: Vec2;
  /** 문 바로 바깥의 경로 그래프 노드. 건물 앞 대기도 여기서 한다 */
  doorNode: NodeId;
}

export type Collider =
  { kind: 'box'; min: Vec2; max: Vec2 } | { kind: 'circle'; center: Vec2; r: number };

export interface Campus {
  buildings: Record<BuildingId, Building>;
  places: Record<PlaceId, Place>;
  graph: {
    nodes: Record<NodeId, Vec2>;
    edges: ReadonlyArray<readonly [NodeId, NodeId]>;
  };
  /** 정문 안쪽 노드. 등·하교 경로의 끝 */
  gateNode: NodeId;
  /** 정문 바깥, 캐릭터가 나타나고 사라지는 지점 */
  gateSpawn: Vec2;
  /** 정문 옆 게시판 위치 */
  boardPos: Vec2;
  /** 공원 구역 입구 노드 */
  parkNode: NodeId;
  /** 공원 산책 지점 */
  parkSpots: Seat[];
  /** 공원 벤치·연못가 (앉는 곳) */
  benchSpots: Seat[];
  /** 연구동 2F 교수님 자리 */
  professorSeat: Seat;
  /** 직접 조종 시 통과할 수 없는 영역 */
  colliders: Collider[];
}
