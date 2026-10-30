import { useState } from 'react';
import { api } from '../../api/endpoints';
import { useWorld } from '../../store/world';
import { errorMessage } from '../errors';

/** 관리자 화면: 기능 켜기·끄기. 바꾸면 모두의 화면에 바로 반영된다 */
export function AdminFeatures() {
  const features = useWorld((s) => s.features);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (shooting: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const next = await api.adminFeatures({ ...features, shooting });
      useWorld.setState({ features: next });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-label="기능">
      <h3 className="adm-title">기능</h3>
      <label className="adm-feature">
        <input
          type="checkbox"
          checked={features.shooting}
          disabled={busy}
          onChange={(e) => void toggle(e.target.checked)}
        />
        💦 장난감 쏘기 (물총·눈덩이·광선총)
        <small>조종 중인 멤버가 F 키나 버튼으로 쏠 수 있어요</small>
      </label>
      {error && (
        <p className="ui-alert" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
