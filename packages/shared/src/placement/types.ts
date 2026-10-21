import type { Campus, PlaceId } from '../campus/types';
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
  placeId: PlaceId | 'park' | 'gate' | 'door' | 'transit';
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

/**
 * 하루 계획의 한 구간. 시각은 KST 자정부터 지난 분.
 * cw#2가 필요한 필드를 더한 판별 유니온으로 넓힌다. 다른 모듈은 Segment 내부를 읽지 않는다.
 */
export interface Segment {
  from: number;
  to: number;
}

/** computeDay 결과. 날짜·시간표가 바뀔 때만 다시 만든다 */
export interface DayPlan {
  date: string;
  /** 0=월 … 6=일 */
  weekday: number;
  /** 아이디 → 표시 이름 */
  usernames: ReadonlyMap<string, string>;
  segments: ReadonlyMap<string, readonly Segment[]>;
}
