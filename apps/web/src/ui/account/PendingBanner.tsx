import { useSession } from '../../store/session';

/** 승인 전 멤버에게 상단 배너를 띄운다 (설계 문서 §9 가입 흐름) */
export function PendingBanner() {
  const session = useSession((s) => s.session);
  if (session.kind !== 'member' || session.me.status === 'approved') return null;
  if (session.me.status === 'rejected') {
    return (
      <p className="ui-banner ui-banner--rejected" role="status">
        가입이 승인되지 않았어요. 관리자에게 문의해 주세요.
      </p>
    );
  }
  return (
    <p className="ui-banner" role="status">
      ⏳ 관리자 승인 대기 중이에요. 승인되면 캠퍼스에 캐릭터가 나타나요.
    </p>
  );
}
