import { useState } from 'react';
import { DEFAULT_LOOK, randomLook, type Look } from '@4this/shared';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { Modal } from '../common/Modal';
import { errorMessage } from '../errors';
import { useUi } from '../store';
import { LookChips } from './LookChips';
import { LookPreview } from './LookPreview';

/**
 * 캐릭터 꾸미기. 항상 서버에 저장된 내 생김새로 시작한다.
 * 가입 직후에도 서버가 가입 때 뽑아 저장한 랜덤 조합이 보이므로, 저장하지 않고 닫아도 화면과 같다.
 */
export function CustomizeScreen() {
  const session = useSession((s) => s.session);
  const setSession = useSession((s) => s.setSession);
  const { onboarding, open, close } = useUi();
  const [look, setLook] = useState<Look>(() =>
    session.kind === 'member' ? session.me.look : DEFAULT_LOOK,
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session.kind !== 'member') {
    return (
      <Modal title="캐릭터 꾸미기" onClose={close}>
        <p className="ui-note">로그인한 멤버만 꾸밀 수 있어요.</p>
      </Modal>
    );
  }

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const me = await api.patchMe({ look });
      setSession({ kind: 'member', me });
      // 가입 흐름이면 다음은 시간표
      if (onboarding) open('schedule', { onboarding: true });
      else close();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={onboarding ? '내 캐릭터 만들기' : '캐릭터 꾸미기'} onClose={close} wide>
      <div className="ui-customize">
        <LookPreview look={look} />
        <div className="ui-form">
          <LookChips look={look} onChange={setLook} />
          {error && (
            <p className="ui-alert" role="alert">
              {error}
            </p>
          )}
          <div className="ui-row ui-row--between">
            <button type="button" className="ui-btn" onClick={() => setLook(randomLook())}>
              🎲 랜덤
            </button>
            <button type="button" className="ui-btn ui-btn--primary" onClick={save} disabled={busy}>
              {busy ? '저장하는 중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
