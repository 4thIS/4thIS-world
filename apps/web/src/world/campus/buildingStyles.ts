import type { BuildingId } from '@4this/shared';
import type { StairSpec } from './buildingGeometry';

export interface BuildingStyle {
  /** 외벽 */
  wall: string;
  /** 문틀·옥상 난간·이름표 */
  trim: string;
  /** 실내 바닥 */
  floor: string;
  /** 1층에서 2층으로 오르는 계단 (층마다 같은 자리). 1층짜리 건물은 null */
  stairs: StairSpec | null;
}

/** 건물별 파스텔 색과 계단 자리. 계단은 각 장소의 landing(계단참) 바로 옆에 둔다 */
export const BUILDING_STYLES: Record<BuildingId, BuildingStyle> = {
  eng: {
    wall: '#ffe3ea',
    trim: '#ffb3c7',
    floor: '#f6eadf',
    stairs: { start: [19.3, 3.4], dir: 'n', width: 1 },
  },
  lab: {
    wall: '#e3effb',
    trim: '#a9cdf0',
    floor: '#eef0f5',
    stairs: { start: [-19.3, -12.4], dir: 'n', width: 1 },
  },
  main: {
    wall: '#fff3dc',
    trim: '#f3c98b',
    floor: '#f7eee2',
    stairs: { start: [7.3, -12.4], dir: 'n', width: 1 },
  },
  cafe: {
    wall: '#e3f5e8',
    trim: '#a7dcb6',
    floor: '#f3eadf',
    stairs: null,
  },
  dorm: {
    wall: '#efe6fb',
    trim: '#c3b1ec',
    floor: '#f5ece4',
    stairs: { start: [20.3, 16.4], dir: 'n', width: 1 },
  },
};
