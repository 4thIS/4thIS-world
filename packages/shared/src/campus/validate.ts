import { CAMPUS_HALF, PLACE_IDS, type Campus, type PlaceId, type Vec2 } from './types';

/** 설계 문서 §5.2의 최소 좌석 수 */
export const MIN_SEATS: Record<PlaceId, number> = {
  'eng-1f': 6,
  'eng-2f': 6,
  'eng-3f': 6,
  'lab-2f': 6,
  'main-1f': 16,
  'main-2f': 12,
  'main-3f': 8,
  cafe: 8,
  'dorm-1f': 8,
  'dorm-2f': 6,
  'dorm-3f': 6,
};

const inside = (p: Vec2, min: Vec2, max: Vec2) =>
  p[0] >= min[0] && p[0] <= max[0] && p[1] >= min[1] && p[1] <= max[1];

/** 캠퍼스 데이터의 앞뒤가 맞는지 검사한다. 문제가 없으면 빈 배열 */
export function validateCampus(c: Campus): string[] {
  const errors: string[] = [];
  const nodes = c.graph.nodes;

  for (const [a, b] of c.graph.edges) {
    if (!nodes[a]) errors.push(`간선 ${a}-${b}: 노드 ${a} 없음`);
    if (!nodes[b]) errors.push(`간선 ${a}-${b}: 노드 ${b} 없음`);
  }
  for (const key of ['gateNode', 'parkNode'] as const) {
    if (!nodes[c[key]]) errors.push(`${key} ${c[key]} 없음`);
  }
  for (const b of Object.values(c.buildings)) {
    if (!nodes[b.doorNode]) errors.push(`${b.id}.doorNode ${b.doorNode} 없음`);
  }

  // 모든 노드가 gateNode에서 닿아야 한다
  const adj = new Map<string, string[]>();
  for (const [a, b] of c.graph.edges) {
    adj.set(a, [...(adj.get(a) ?? []), b]);
    adj.set(b, [...(adj.get(b) ?? []), a]);
  }
  const seen = new Set([c.gateNode]);
  const queue = [c.gateNode];
  while (queue.length) {
    for (const next of adj.get(queue.shift()!) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  for (const id of Object.keys(nodes)) {
    if (!seen.has(id)) errors.push(`노드 ${id}: 정문에서 닿지 않음`);
  }

  for (const id of PLACE_IDS) {
    const place = c.places[id];
    const building = c.buildings[place.building];
    if (place.id !== id) errors.push(`${id}: id 불일치 (${place.id})`);
    if (place.floor < 1 || place.floor > building.floors)
      errors.push(`${id}: ${place.floor}층 없음`);
    if (place.seats.length < MIN_SEATS[id]) {
      errors.push(`${id}: 좌석 ${place.seats.length}개 < ${MIN_SEATS[id]}`);
    }
    if (!inside(place.landing, building.min, building.max)) errors.push(`${id}: landing이 건물 밖`);
    place.seats.forEach((s, i) => {
      if (!inside(s.pos, building.min, building.max)) errors.push(`${id}: 좌석 ${i}가 건물 밖`);
    });
  }

  const all: [string, Vec2][] = [
    ...Object.entries(nodes),
    ['gateSpawn', c.gateSpawn],
    ['boardPos', c.boardPos],
    ...c.parkSpots.map((s, i): [string, Vec2] => [`parkSpots[${i}]`, s.pos]),
    ...c.benchSpots.map((s, i): [string, Vec2] => [`benchSpots[${i}]`, s.pos]),
  ];
  for (const [name, p] of all) {
    if (Math.abs(p[0]) > CAMPUS_HALF || Math.abs(p[1]) > CAMPUS_HALF)
      errors.push(`${name}: 캠퍼스 밖`);
  }
  return errors;
}
