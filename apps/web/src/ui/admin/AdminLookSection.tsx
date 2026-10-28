import { useState } from 'react';
import { ADMIN_ID, DEFAULT_ADMIN_LOOK, randomLook, type Look } from '@4this/shared';
import { api } from '../../api/endpoints';
import { useWorld } from '../../store/world';
import { LookChips } from '../customize/LookChips';
import { LookPreview } from '../customize/LookPreview';
import { errorMessage } from '../errors';

/** 관리자 화면 맨 위: 광장 중앙에 서 있는 관리자 캐릭터 꾸미기 */
export function AdminLookSection() {
  const current = useWorld((s) => s.members.find((m) => m.id === ADMIN_ID)?.look);
  const [look, setLook] = useState<Look>(current ?? DEFAULT_ADMIN_LOOK);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const change = (next: Look) => {
    setLook(next);
    setSaved(false);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.adminLook({ look });
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="관리자 캐릭터">
      <h3 className="adm-title">관리자 캐릭터</h3>
      <p className="ui-note">
        광장 한가운데에 24시간 서 있어요. 관리자로 로그인하면 조종할 수 있어요.
      </p>
      <div className="ui-customize">
        <LookPreview look={look} />
        <div className="ui-form">
          <LookChips look={look} onChange={change} />
          {error && (
            <p className="ui-alert" role="alert">
              {error}
            </p>
          )}
          {saved && <p className="ui-note">저장했어요. 캠퍼스에 곧 반영돼요.</p>}
          <div className="ui-row ui-row--between">
            <button type="button" className="ui-btn" onClick={() => change(randomLook())}>
              🎲 랜덤
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--primary"
              onClick={() => void save()}
              disabled={busy}
            >
              {busy ? '저장하는 중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
