import { sampleAt, type Pose } from '@4this/shared';
import { useWorld } from '../../store/world';

/**
 * 멤버가 시각 t에 보여야 할 모습. 매 프레임 MemberAvatar가 부른다.
 * cw#3: placement 결과 그대로. cw#4에서 직접 조종·복귀 걷기를 먼저 확인하도록 넓힌다.
 */
export function resolvePose(memberId: string, t: number): Pose | null {
  return sampleAt(useWorld.getState().ensurePlan(), memberId, t);
}
