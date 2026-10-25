import { useState, type FormEvent } from 'react';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { Modal } from '../common/Modal';
import { errorMessage } from '../errors';
import { useUi } from '../store';

/** 로그인 모달 */
export function LoginForm() {
  const { open, close } = useUi();
  const setSession = useSession((s) => s.setSession);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('이름과 비밀번호를 입력해 주세요.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      setSession(await api.login({ username: username.trim(), password }));
      close();
    } catch (err) {
      setError(errorMessage(err, 'login'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="로그인" onClose={close}>
      <form className="ui-form" onSubmit={submit} noValidate>
        <label className="ui-field">
          이름
          <input
            className="ui-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            autoFocus
          />
        </label>
        <label className="ui-field">
          비밀번호
          <input
            className="ui-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && (
          <p className="ui-alert" role="alert">
            {error}
          </p>
        )}
        <button className="ui-btn ui-btn--primary" type="submit" disabled={busy}>
          {busy ? '들어가는 중…' : '로그인'}
        </button>
        <div className="ui-row ui-row--between">
          <button type="button" className="ui-link" onClick={() => open('signup')}>
            처음이에요 · 가입하기
          </button>
          <button type="button" className="ui-link" onClick={() => open('adminLogin')}>
            관리자 로그인
          </button>
        </div>
      </form>
    </Modal>
  );
}
