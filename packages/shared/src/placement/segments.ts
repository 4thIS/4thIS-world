import type { Campus, NodeId, PlaceId } from '../campus/types';
import { hashString, mix32 } from '../hash';
import type { PoseKind } from '../schema/pose';
import { KIND_INFO, type Kind, type ScheduleItem } from '../schema/schedule';
import { toMinutes } from '../time';
import {
  ARRIVE_EARLY_MIN,
  LUNCH_END_MIN,
  LUNCH_MAX_MIN,
  LUNCH_START_MIN,
  MIN_PIECE_MIN,
  SHORT_GAP_MIN,
} from './constants';
import { classStatus, externalTitle } from './status';

/** 한 구간 동안 하는 일. 좌석·경로는 아직 정하지 않은 상태 */
export type Activity =
  | { kind: 'class'; placeId: PlaceId; pose: PoseKind; status: string }
  | { kind: 'lunch' }
  | { kind: 'cafe' }
  | { kind: 'park' }
  /** 다음 장소 입구(건물 문 노드 또는 정문 노드) 앞에서 서서 기다린다 */
  | { kind: 'wait'; node: NodeId }
  | { kind: 'away'; title: string }
  /** 하교. 길이가 0인 표시 구간 (이 시각에 정문으로 출발) */
  | { kind: 'home' };

/** 멤버 하루의 한 구간. 시각은 KST 자정부터 지난 분, [from, to) */
export interface Block {
  from: number;
  to: number;
  activity: Activity;
}

type CampusKind = Exclude<Kind, 'external'>;

interface Item {
  from: number;
  to: number;
  kind: Kind;
  title?: string;
}

/** 그날 빈 시간을 공원에서 보낼지 카페에서 보낼지. 하루 동안 고정 (§7.2-5) */
export function freeChoice(memberId: string, date: string): 'park' | 'cafe' {
  return mix32(hashString(memberId + date)) % 2 === 0 ? 'park' : 'cafe';
}

/** 빈 시간 [g0, g1)을 조각으로 나눈다 (§7.2-5). waitNode는 다음 장소의 입구 */
export function gapBlocks(
  memberId: string,
  date: string,
  g0: number,
  g1: number,
  waitNode: NodeId,
): Block[] {
  if (g1 <= g0) return [];
  if (g1 - g0 < SHORT_GAP_MIN)
    return [{ from: g0, to: g1, activity: { kind: 'wait', node: waitNode } }];

  const free: Activity = { kind: freeChoice(memberId, date) };
  const pieces: Block[] = [];
  const ls = Math.max(g0, LUNCH_START_MIN);
  const le = Math.min(g1, LUNCH_END_MIN, ls + LUNCH_MAX_MIN);
  if (le > ls) {
    if (ls > g0) pieces.push({ from: g0, to: ls, activity: free });
    pieces.push({ from: ls, to: le, activity: { kind: 'lunch' } });
    if (g1 > le) pieces.push({ from: le, to: g1, activity: free });
  } else {
    pieces.push({ from: g0, to: g1, activity: free });
  }

  // 10분 미만 조각은 바로 앞 조각에 붙인다 (첫 조각이면 뒤 조각에)
  for (let i = 0; i < pieces.length && pieces.length > 1;) {
    const p = pieces[i]!;
    if (p.to - p.from >= MIN_PIECE_MIN) {
      i++;
      continue;
    }
    if (i > 0) pieces[i - 1]!.to = p.to;
    else pieces[1]!.from = p.from;
    pieces.splice(i, 1);
  }
  // 붙이다 보면 같은 일이 이웃할 수 있다 → 하나로 합친다
  for (let i = 1; i < pieces.length;) {
    if (pieces[i]!.activity.kind === pieces[i - 1]!.activity.kind) {
      pieces[i - 1]!.to = pieces[i]!.to;
      pieces.splice(i, 1);
    } else i++;
  }
  return pieces;
}

/** 맞닿은 같은 일정(종류·제목이 같음)은 하나로 합쳐 자리를 옮기지 않게 한다 */
function mergeContiguous(items: Item[]): Item[] {
  const out: Item[] = [];
  for (const item of items) {
    const prev = out.at(-1);
    if (prev && prev.kind === item.kind && prev.title === item.title && prev.to === item.from) {
      prev.to = item.to;
    } else out.push({ ...item });
  }
  return out;
}

function classBlock(item: Item): Block {
  const kind = item.kind as CampusKind;
  const info = KIND_INFO[kind];
  return {
    from: item.from,
    to: item.to,
    activity: {
      kind: 'class',
      placeId: info.place!,
      pose: info.pose!,
      status: classStatus(kind, item.title),
    },
  };
}

function awayBlock(item: Item): Block {
  return {
    from: item.from,
    to: item.to,
    activity: { kind: 'away', title: externalTitle(item.title) },
  };
}

/**
 * 멤버 한 명의 하루(그날 요일의 일정만)를 구간 목록으로 바꾼다 (§7.2).
 * 캠퍼스 일정이 없으면 외부 일정(게시판용)만 남는다.
 */
export function planBlocks(
  memberId: string,
  date: string,
  dayItems: readonly ScheduleItem[],
  campus: Campus,
): Block[] {
  const items = mergeContiguous(
    dayItems
      .map((i) => ({
        from: toMinutes(i.start),
        to: toMinutes(i.end),
        kind: i.kind,
        title: i.title,
      }))
      .sort((a, b) => a.from - b.from),
  );
  const onCampus = items.filter((i) => i.kind !== 'external');
  const externals = items.filter((i) => i.kind === 'external');
  if (onCampus.length === 0) return externals.map(awayBlock);

  const firstStart = onCampus[0]!.from;
  const leave = onCampus.at(-1)!.to;
  const before = externals.filter((e) => e.to <= firstStart);
  // 등교: 첫 캠퍼스 일정 5분 전. 그 앞에 외부 일정이 있으면 직전 외부 일정이 끝날 때
  const arrive = before.length > 0 ? before.at(-1)!.to : firstStart - ARRIVE_EARLY_MIN;

  const waitNodeFor = (item: Item): NodeId =>
    item.kind === 'external'
      ? campus.gateNode
      : campus.buildings[campus.places[KIND_INFO[item.kind].place!].building].doorNode;

  const blocks: Block[] = before.map(awayBlock);
  let cursor = arrive;
  for (const item of items) {
    if (item.from < arrive || item.to > leave) continue;
    blocks.push(...gapBlocks(memberId, date, cursor, item.from, waitNodeFor(item)));
    blocks.push(item.kind === 'external' ? awayBlock(item) : classBlock(item));
    cursor = item.to;
  }
  blocks.push({ from: leave, to: leave, activity: { kind: 'home' } });
  blocks.push(...externals.filter((e) => e.from >= leave).map(awayBlock));
  return blocks;
}
