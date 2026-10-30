import type { Ref } from 'react';
import type { Group } from 'three';
import type { BuildingId, Emoji, Look, PoseKind, WeatherNow } from '@4this/shared';

/** 사자 교수님 전용 생김새 (학생은 고를 수 없다) */
export interface LionLook {
  animal: 'lion';
  color: 'default';
  head: 'none';
  eyes: 'glasses';
  neck: 'bowtie';
}
export const PROFESSOR_LOOK: LionLook = {
  animal: 'lion',
  color: 'default',
  head: 'none',
  eyes: 'glasses',
  neck: 'bowtie',
};
export type CharacterLook = Look | LionLook;

/** 머리 위 말풍선 채팅 한 개 */
export interface ActiveChat {
  /** 받은 순서 번호 (React key) */
  id: number;
  text: string;
  /** 받은 시각 performance.now() ms. 3초 뒤 사라진다 */
  at: number;
}

export interface ActiveEmote {
  emoji: Emoji;
  /** 받은 시각 performance.now() ms. 3초 뒤 사라진다 */
  at: number;
}

/**
 * th가 만드는 <Character>의 props. 위치·방향은 props가 아니라 ref로 받은 Group을
 * sim(cw)이 매 프레임 직접 움직인다. Character는 Group 원점(발밑)에 서 있게 그린다.
 */
export interface CharacterProps {
  look: CharacterLook;
  pose: PoseKind;
  name?: string;
  status?: string;
  emote?: ActiveEmote | null;
  /** 머리 위 말풍선 (오래된 것부터, 최대 3개) */
  chats?: readonly ActiveChat[];
  /** 내 캐릭터 발밑 링 */
  highlight?: boolean;
  /** 0~1, 출입 페이드 */
  opacity?: number;
  /** 비·눈 올 때 바깥에서 우산을 쓴다 */
  umbrella?: boolean;
  onClick?: () => void;
  ref?: Ref<Group>;
}

/** 'eng:2'처럼 건물과 층 */
export type FloorKey = `${BuildingId}:${number}`;

/** hm이 만드는 <Campus>의 props */
export interface CampusProps {
  /** 지금 시각 epoch ms (하늘·조명·밤 창문) */
  now: number;
  /** 사람이 있는 층 (밤 창문 불빛) */
  occupiedFloors: ReadonlySet<FloorKey>;
  /** 클릭해서 다가간 건물 */
  focusedBuilding: BuildingId | null;
  /** 이 층보다 위층은 숨긴다. null이면 모두 보임 */
  hiddenAboveFloor: number | null;
  /** 실시간 날씨. 없으면 맑음 */
  weather?: WeatherNow | null;
  /** 내가 조종해 들어가 있는 건물과 층. 그 건물은 이 층보다 위를 숨긴다 (포커스가 먼저) */
  cutaway?: { building: BuildingId; floor: number } | null;
  onBuildingClick?: (id: BuildingId) => void;
}
