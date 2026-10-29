import { useState } from 'react';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { errorMessage } from '../errors';

/**
 * "기숙사에 살아요" 체크. 바꾸면 바로 저장한다(시간표 저장과 따로).
 * 기숙사생은 정문 대신 기숙사에서 등하교하고, 밤(23~7시)엔 기숙사 침대에서 잔다.
 */
export function DormToggle() {
  const session = useSession((s) => s.session);
  const setSession = useSession((s) => s.setSession);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  if (session.kind !== 'member') return null;
  const dorm = session.me.dorm ?? false;

  const toggle = async (next: boolean) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const me = await api.patchMe({ dorm: next });
      setSession({ kind: 'member', me });
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sch-dorm">
      <label className="sch-dorm__label">
        <input
          type="checkbox"
          checked={dorm}
          disabled={busy}
          onChange={(e) => void toggle(e.target.checked)}
        />
        🏠 기숙사에 살아요
        <small>정문 대신 기숙사에서 등하교하고, 밤엔 기숙사에서 자요</small>
      </label>
      {saved && (
        <span className="ui-note">
          {dorm ? '저장했어요. 밤엔 기숙사에서 자요 😴' : '저장했어요. 정문으로 등하교해요'}
        </span>
      )}
      {error && (
        <p className="ui-alert" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
