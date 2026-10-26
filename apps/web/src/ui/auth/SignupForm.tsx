import { useState, type FormEvent } from 'react';
import { SignupRequestSchema } from '@4this/shared';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { Modal } from '../common/Modal';
import { errorMessage, fieldErrors } from '../errors';
import { useUi } from '../store';

/** 가입 모달. 성공하면 바로 로그인 상태가 되고 꾸미기 화면으로 넘어간다 */
export function SignupForm() {
  const { open, close } = useUi();
  const setSession = useSession((s) => s.setSession);
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm({ ...form, [key]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = SignupRequestSchema.safeParse({
      username: form.username,
      password: form.password,
    });
    const errs = parsed.success ? {} : fieldErrors(parsed.error.issues);
    if (form.password !== form.confirm) errs.confirm = '비밀번호가 서로 달라요';
    setFields(errs);
    if (!parsed.success || errs.confirm) return;

    setBusy(true);
    try {
      setSession(await api.signup(parsed.data));
      open('customize', { onboarding: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="가입하기" onClose={close}>
      <form className="ui-form" onSubmit={submit} noValidate>
        <p className="ui-note">가입하면 관리자가 승인한 뒤 캠퍼스에 캐릭터가 나타나요.</p>
        <label className="ui-field">
          이름 (2~12자, 로그인 아이디로도 써요)
          <input
            className="ui-input"
            value={form.username}
            onChange={set('username')}
            autoComplete="username"
            autoFocus
          />
          {fields.username && <span className="ui-field__error">{fields.username}</span>}
        </label>
        <label className="ui-field">
          비밀번호 (6자 이상)
          <input
            className="ui-input"
            type="password"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
          />
          {fields.password && <span className="ui-field__error">{fields.password}</span>}
        </label>
        <label className="ui-field">
          비밀번호 확인
          <input
            className="ui-input"
            type="password"
            value={form.confirm}
            onChange={set('confirm')}
            autoComplete="new-password"
          />
          {fields.confirm && <span className="ui-field__error">{fields.confirm}</span>}
        </label>
        {error && (
          <p className="ui-alert" role="alert">
            {error}
          </p>
        )}
        <button className="ui-btn ui-btn--primary" type="submit" disabled={busy}>
          {busy ? '가입하는 중…' : '가입하고 캐릭터 꾸미기'}
        </button>
        <button type="button" className="ui-link" onClick={() => open('login')}>
          이미 가입했어요 · 로그인
        </button>
      </form>
    </Modal>
  );
}
