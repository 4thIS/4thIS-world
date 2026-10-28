import { sampleAt, type Pose } from '@4this/shared';
import { myMemberId, useRealtime } from '../../store/realtime';
import { useWorld } from '../../store/world';
import { controlPose, remotePose, sampleReturn } from './remote';

/**
 * 멤버가 시각 t에 보여야 할 모습. 매 프레임 MemberAvatar가 부른다. 우선순위:
 * 1) 내가 조종 중이면 내 로컬 위치 2) 다른 사람이 조종 중이면 받은 상태(보간)
 * 3) 조종이 풀려 걸어서 돌아가는 중이면 그 길 4) placement 결과
 */
export function resolvePose(memberId: string, t: number): Pose | null {
  const rt = useRealtime.getState();
  if (rt.controlling && rt.local && memberId === myMemberId()) return controlPose(rt.local);
  const wall = Date.now();
  const remote = rt.remotes[memberId];
  if (remote) return remotePose(remote, wall);
  const walk = rt.returning[memberId];
  if (walk) {
    const pose = sampleReturn(walk, wall);
    if (pose) return pose;
  }
  return sampleAt(useWorld.getState().ensurePlan(), memberId, t);
}
