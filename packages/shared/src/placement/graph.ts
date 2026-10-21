import type { Campus, NodeId, Vec2 } from '../campus/types';

/** 두 점 사이 거리 (m) */
export function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1]);
}

/** 꺾은선의 누적 거리. 결과[0] = 0, 마지막 = 전체 길이 */
export function cumulative(pts: readonly Vec2[]): number[] {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1]! + dist(pts[i - 1]!, pts[i]!));
  return cum;
}

/** 꺾은선 전체 길이 (m) */
export function pathLength(pts: readonly Vec2[]): number {
  return cumulative(pts).at(-1) ?? 0;
}

interface GraphCache {
  adj: Map<NodeId, { to: NodeId; w: number }[]>;
  paths: Map<string, readonly NodeId[]>;
}

/** 캠퍼스 객체마다 인접 목록과 최단 경로 결과를 한 번만 만든다 */
const caches = new WeakMap<Campus, GraphCache>();

function cacheOf(campus: Campus): GraphCache {
  let cache = caches.get(campus);
  if (!cache) {
    const adj = new Map<NodeId, { to: NodeId; w: number }[]>();
    const nodes = campus.graph.nodes;
    for (const [a, b] of campus.graph.edges) {
      const w = dist(nodes[a]!, nodes[b]!);
      adj.set(a, [...(adj.get(a) ?? []), { to: b, w }]);
      adj.set(b, [...(adj.get(b) ?? []), { to: a, w }]);
    }
    cache = { adj, paths: new Map() };
    caches.set(campus, cache);
  }
  return cache;
}

/**
 * 다익스트라 최단 경로. 노드 목록(양 끝 포함)을 돌려준다. 결과는 캐시한다.
 * 닿을 수 없으면 [from, to] (그래프 검사기가 막아 주므로 실제로는 생기지 않는다).
 */
export function shortestPath(campus: Campus, from: NodeId, to: NodeId): readonly NodeId[] {
  const cache = cacheOf(campus);
  const key = `${from}>${to}`;
  const hit = cache.paths.get(key);
  if (hit) return hit;

  const best = new Map<NodeId, number>([[from, 0]]);
  const prev = new Map<NodeId, NodeId>();
  const done = new Set<NodeId>();
  // 노드가 수십 개뿐이라 우선순위 큐 없이 가장 가까운 노드를 매번 찾는다
  while (true) {
    let cur: NodeId | null = null;
    let curD = Infinity;
    for (const [id, d] of best) {
      if (!done.has(id) && (d < curD || (d === curD && cur !== null && id < cur))) {
        cur = id;
        curD = d;
      }
    }
    if (cur === null || cur === to) break;
    done.add(cur);
    for (const { to: next, w } of cache.adj.get(cur) ?? []) {
      const nd = curD + w;
      if (nd < (best.get(next) ?? Infinity)) {
        best.set(next, nd);
        prev.set(next, cur);
      }
    }
  }

  let path: NodeId[];
  if (from === to) path = [from];
  else if (!prev.has(to)) path = [from, to];
  else {
    path = [to];
    while (path[0] !== from) path.unshift(prev.get(path[0]!)!);
  }
  cache.paths.set(key, path);
  return path;
}

/** 점에서 가장 가까운 그래프 노드 (같은 거리면 아이디 순) */
export function nearestNode(campus: Campus, p: Vec2): NodeId {
  let bestId = campus.gateNode;
  let bestD = Infinity;
  for (const [id, pos] of Object.entries(campus.graph.nodes)) {
    const d = dist(p, pos);
    if (d < bestD || (d === bestD && id < bestId)) {
      bestId = id;
      bestD = d;
    }
  }
  return bestId;
}

/** 진행 방향 → facing (rotation.y). 0이면 +z를 본다 */
export function facingOf(from: Vec2, to: Vec2): number {
  return Math.atan2(to[0] - from[0], to[1] - from[1]);
}
