import { afterEach, describe, expect, it } from 'vitest';
import { ADMIN_ID, DEFAULT_LOOK } from '@4this/shared';
import { myMemberId } from './realtime';
import { useSession } from './session';

afterEach(() => useSession.setState({ session: { kind: 'guest' } }));

describe('myMemberId', () => {
  it('관리자로 로그인하면 내 캐릭터는 관리자 캐릭터다', () => {
    useSession.setState({ session: { kind: 'admin' } });
    expect(myMemberId()).toBe(ADMIN_ID);
  });

  it('승인된 멤버는 자기 id, 승인 대기·게스트는 없음', () => {
    const me = { id: 'm1', username: '철수', look: DEFAULT_LOOK };
    useSession.setState({ session: { kind: 'member', me: { ...me, status: 'approved' } } });
    expect(myMemberId()).toBe('m1');
    useSession.setState({ session: { kind: 'member', me: { ...me, status: 'pending' } } });
    expect(myMemberId()).toBeNull();
    useSession.setState({ session: { kind: 'guest' } });
    expect(myMemberId()).toBeNull();
  });
});
