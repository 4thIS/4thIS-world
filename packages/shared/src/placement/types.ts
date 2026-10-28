import type { Campus, PlaceId, Seat, Vec2 } from '../campus/types';
import type { PublicMember } from '../schema/member';
import type { PoseKind } from '../schema/pose';

/** placement 입력. 승인된 멤버만 넣는다 */
export type MemberForPlacement = PublicMember;

export interface ComputeDayInput {
  members: readonly MemberForPlacement[];
  /** KST 날짜 'YYYY-MM-DD' */
  date: string;
  campus: Campus;
}

/** 한 시각의 캐릭터 상태. 월드는 이것만 보고 그린다 */
export interface Pose {
  /** 월드 좌표 [x, y, z]. y는 층 바닥 높이 */
  position: [number, number, number];
  facing: number;
  pose: PoseKind;
  /** 지금 있는 곳. 'door'는 건물 앞 대기, 'transit'은 걷는 중 */
  placeId: PlaceId | 'park' | 'gate' | 'door' | 'transit' | 'plaza';
  /** 1부터. 바깥은 1 */
  floor: number;
  /** 이름표 문구 (설계 문서 §7.1, §9) */
  status: string;
  /** 0~1. 건물 출입·정문 출입 페이드 */
  opacity: number;
}

/** 정문 게시판 한 줄 */
export interface BoardEntry {
  memberId: string;
  username: string;
  /** 일정 제목, 없으면 '외부 일정' */
  title: string;
  /** 끝나는 시각 'HH:MM' */
  until: string;
}

/** 걷기 한 다리. 다리 사이에서 건물·정문을 드나들며 페이드한다. 시각은 KST 자정부터 지난 분 */
export interface WalkLeg {
  from: number;
  to: number;
  /** 지나는 점들 (바닥 좌표) */
  pts: readonly Vec2[];
  /** pts[i]까지의 누적 거리 (m). cum[0] = 0 */
  cum: readonly number[];
  /** 이 다리를 걷는 층 (바깥은 1) */
  floor: number;
  /** 시작할 때 FADE_MS 동안 제자리에서 나타난다 */
  fadeIn: boolean;
  /** 끝날 때 FADE_MS 동안 제자리에서 사라진다 */
  fadeOut: boolean;
  /** 정문 바깥에서 나타나거나 사라지는 다리 */
  gate: boolean;
}

/** 자리에 머무는 구간 (좌석·건물 앞 대기) */
export interface StaySegment {
  kind: 'stay';
  from: number;
  to: number;
  pos: Vec2;
  floor: number;
  facing: number;
  pose: PoseKind;
  placeId: PlaceId | 'door' | 'gate';
  status: string;
  /** 좌석 번호 (넘침 자리는 seats.length부터). 건물 앞 대기는 없음 */
  seat?: number;
}

/** 경로를 따라 걷는 구간 */
export interface WalkSegment {
  kind: 'walk';
  from: number;
  to: number;
  legs: readonly WalkLeg[];
  status: string;
}

/** 공원 산책 구간. 2분 칸마다 산책 지점을 고른다 (§7.5) */
export interface ParkSegment {
  kind: 'park';
  from: number;
  to: number;
  /** 공원에 들어온 지점 (첫 칸은 여기서 출발) */
  entry: Vec2;
  /** 결정적 난수 씨앗 'memberId|date' */
  seed: string;
  /** 걸어서 들르는 산책 지점 (campus.parkSpots) */
  walkSpots: readonly Seat[];
  /** 앉아 쉬는 벤치·연못가 (campus.benchSpots) */
  sitSpots: readonly Seat[];
  status: string;
}

/** 외부 일정으로 캠퍼스 밖에 있는 구간. sampleAt은 null, 게시판에는 보인다 */
export interface AwaySegment {
  kind: 'away';
  /** 정문을 나선 시각 (외부 일정 시작 + 정문까지 걷는 시간) */
  from: number;
  to: number;
  /** 외부 일정 시작 시각 (게시판은 이때부터 보인다) */
  since: number;
  title: string;
}

/**
 * 하루 계획의 한 구간. 시각은 KST 자정부터 지난 분.
 * 다른 모듈은 Segment 내부를 읽지 않는다 (sampleAt·boardAt만 쓴다).
 */
export type Segment = StaySegment | WalkSegment | ParkSegment | AwaySegment;

/** computeDay 결과. 날짜·시간표가 바뀔 때만 다시 만든다 */
export interface DayPlan {
  date: string;
  /** 0=월 … 6=일 */
  weekday: number;
  /** 아이디 → 표시 이름 */
  usernames: ReadonlyMap<string, string>;
  segments: ReadonlyMap<string, readonly Segment[]>;
}
