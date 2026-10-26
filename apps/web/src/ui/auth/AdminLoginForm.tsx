import { useState, type FormEvent } from 'react';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { Modal } from '../common/Modal';
import { errorMessage } from '../errors';
import { useUi } from '../store';

/** 관리자 로그인 모달 (ADMIN_PASSWORD 하나로 들어간다) */
export function AdminLoginForm() {
  const { open, close } = useUi();
  const setSession = useSession((s) => s.setSession);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('관리자 비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setSession(await api.adminLogin({ password }));
      open('admin');
    } catch (err) {
      setError(errorMessage(err, 'admin'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="관리자 로그인" onClose={close}>
      <form className="ui-form" onSubmit={submit} noValidate>
        <label className="ui-field">
          관리자 비밀번호
          <input
            className="ui-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            autoFocus
          />
        </label>
        {error && (
          <p className="ui-alert" role="alert">
            {error}
          </p>
        )}
        <button className="ui-btn ui-btn--primary" type="submit" disabled={busy}>
          {busy ? '확인하는 중…' : '관리자로 들어가기'}
        </button>
      </form>
    </Modal>
  );
}
