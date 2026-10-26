import { useWorld } from '../../store/world';
import { MemberAvatar } from './MemberAvatar';

/** 승인된 멤버마다 캐릭터 하나 */
export function SimMembers() {
  const members = useWorld((s) => s.members);
  return (
    <>
      {members.map((m) => (
        <MemberAvatar key={m.id} member={m} />
      ))}
    </>
  );
}
