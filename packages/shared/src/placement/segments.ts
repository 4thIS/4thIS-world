import type { Campus, NodeId, PlaceId } from '../campus/types';
import { hashString, mix32 } from '../hash';
import type { PoseKind } from '../schema/pose';
import { KIND_INFO, type Kind, type ScheduleItem } from '../schema/schedule';
import { toMinutes } from '../time';
import {
  ARRIVE_EARLY_MIN,
  DORM_SLOT_MIN,
  SLEEP_START_MIN,
  WAKE_MIN,
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
  /** 기숙사 1층 휴게실 */
  | { kind: 'lounge' }
  /** 기숙사 침대에서 자기. bed는 기숙사생 사이의 침대 번호 */
  | { kind: 'sleep'; bed: number }
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

/** 기숙사생의 자유 시간 장소. DORM_SLOT_MIN 칸(slot)마다 휴게실·공원·카페 중 하나 */
export function dormFree(memberId: string, date: string, slot: number): 'lounge' | 'park' | 'cafe' {
  const options = ['lounge', 'park', 'cafe'] as const;
  return options[mix32(hashString(`${memberId}|${date}|${slot}`)) % options.length]!;
}

/**
 * 빈 시간 [g0, g1)을 조각으로 나눈다 (§7.2-5). waitNode는 다음 장소의 입구.
 * dorm이면 자유 시간을 DORM_SLOT_MIN 칸마다 휴게실·공원·카페로 나눈다.
 * wet[h]가 참인 시간(비·눈)에 걸친 공원 조각은 실내(통학생은 카페, 기숙사생은 휴게실)로 바꾼다.
 */
export function gapBlocks(
  memberId: string,
  date: string,
  g0: number,
  g1: number,
  waitNode: NodeId,
  dorm = false,
  wet: readonly boolean[] = [],
): Block[] {
  if (g1 <= g0) return [];
  if (g1 - g0 < SHORT_GAP_MIN)
    return [{ from: g0, to: g1, activity: { kind: 'wait', node: waitNode } }];

  const free: Activity = { kind: freeChoice(memberId, date) };
  const pieces: Block[] = [];
  const pushFree = (a: number, b: number) => {
    if (!dorm) {
      pieces.push({ from: a, to: b, activity: free });
      return;
    }
    for (let s = a; s < b;) {
      const slot = Math.floor(s / DORM_SLOT_MIN);
      const e = Math.min(b, (slot + 1) * DORM_SLOT_MIN);
      pieces.push({ from: s, to: e, activity: { kind: dormFree(memberId, date, slot) } });
      s = e;
    }
  };
  const ls = Math.max(g0, LUNCH_START_MIN);
  const le = Math.min(g1, LUNCH_END_MIN, ls + LUNCH_MAX_MIN);
  if (le > ls) {
    if (ls > g0) pushFree(g0, ls);
    pieces.push({ from: ls, to: le, activity: { kind: 'lunch' } });
    if (g1 > le) pushFree(le, g1);
  } else {
    pushFree(g0, g1);
  }

  // 비·눈 오는 시간에는 공원에 가지 않는다
  for (const p of pieces) {
    if (p.activity.kind === 'park' && isWet(wet, p.from, p.to)) {
      p.activity = { kind: dorm ? 'lounge' : 'cafe' };
    }
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

/** [from, to) 분 구간이 비·눈 오는 시간에 걸치나 */
function isWet(wet: readonly boolean[], from: number, to: number): boolean {
  for (let h = Math.floor(from / 60); h * 60 < to; h++) if (wet[h]) return true;
  return false;
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

/** 외부 일정은 캠퍼스를 떠나지 않고 카페에 앉아 있는다 (팀장 결정 2026-10-29) */
const EXTERNAL_PLACE: PlaceId = 'cafe';

/** 일정이 열리는 장소 */
const placeOf = (item: Item): PlaceId =>
  item.kind === 'external' ? EXTERNAL_PLACE : KIND_INFO[item.kind].place!;

function classBlock(item: Item): Block {
  if (item.kind === 'external') {
    return {
      from: item.from,
      to: item.to,
      activity: {
        kind: 'class',
        placeId: EXTERNAL_PLACE,
        pose: 'sitSip',
        status: `${externalTitle(item.title)} ☕`,
      },
    };
  }
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

/**
 * 멤버 한 명의 하루(그날 요일의 일정만)를 구간 목록으로 바꾼다 (§7.2).
 * 외부 일정도 카페에서 보내므로 모든 일정이 캠퍼스 일정이다. 일정이 없으면 빈 목록(부재).
 */
export function planBlocks(
  memberId: string,
  date: string,
  dayItems: readonly ScheduleItem[],
  campus: Campus,
  wet: readonly boolean[] = [],
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
  if (items.length === 0) return [];

  // 등교: 첫 일정 5분 전
  const arrive = items[0]!.from - ARRIVE_EARLY_MIN;
  const leave = items.at(-1)!.to;
  const waitNodeFor = (item: Item): NodeId =>
    campus.buildings[campus.places[placeOf(item)].building].doorNode;

  const blocks: Block[] = [];
  let cursor = arrive;
  for (const item of items) {
    blocks.push(...gapBlocks(memberId, date, cursor, item.from, waitNodeFor(item), false, wet));
    blocks.push(classBlock(item));
    cursor = item.to;
  }
  blocks.push({ from: leave, to: leave, activity: { kind: 'home' } });
  return blocks;
}

/**
 * 기숙사생의 하루. 밤(SLEEP_START_MIN~WAKE_MIN)엔 자기 침대에서 자고, 정문 대신 기숙사에서
 * 나와 일정을 소화한다. 일정 없는 낮 시간은 휴게실·공원·카페(dormFree)와 점심.
 * 외부 일정은 카페에서 보낸다. bed는 기숙사생 사이의 침대 번호.
 */
export function planDormBlocks(
  memberId: string,
  date: string,
  dayItems: readonly ScheduleItem[],
  campus: Campus,
  bed: number,
  wet: readonly boolean[] = [],
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
  const sleep: Activity = { kind: 'sleep', bed };
  const dormDoor = campus.buildings.dorm.doorNode;
  const waitNodeFor = (item: Item): NodeId =>
    campus.buildings[campus.places[placeOf(item)].building].doorNode;

  const blocks: Block[] = [];
  // 일정이 7시 전에 있으면 그 5분 전까지만 잔다
  const first = items[0];
  const wake = first ? Math.max(0, Math.min(WAKE_MIN, first.from - ARRIVE_EARLY_MIN)) : WAKE_MIN;
  if (wake > 0) blocks.push({ from: 0, to: wake, activity: sleep });

  let cursor = wake;
  for (const item of items) {
    if (item.to <= cursor) continue;
    blocks.push(...gapBlocks(memberId, date, cursor, item.from, waitNodeFor(item), true, wet));
    blocks.push(classBlock(item));
    cursor = item.to;
  }
  const night = Math.max(cursor, SLEEP_START_MIN);
  blocks.push(...gapBlocks(memberId, date, cursor, night, dormDoor, true, wet));
  if (night < 24 * 60) blocks.push({ from: night, to: 24 * 60, activity: sleep });
  return blocks;
}
