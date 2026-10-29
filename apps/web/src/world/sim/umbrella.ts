import type { Pose, WeatherKind } from '@4this/shared';
import { SITTING_POSES } from '../characters/poses';
import { buildingAt } from './indoor';

/** 비·눈이 올 때 바깥(건물 밖 1층)에 서 있거나 걷는 캐릭터는 우산을 쓴다 */
export function needsUmbrella(pose: Pose, kind: WeatherKind | null): boolean {
  if (kind !== 'rain' && kind !== 'snow') return false;
  if (pose.floor > 1 || pose.pose === 'sleep' || SITTING_POSES.has(pose.pose)) return false;
  return buildingAt([pose.position[0], pose.position[2]]) === null;
}
