import { useState } from 'react';
import { kstDate, PasswordSchema, UsernameSchema, type AdminMember } from '@4this/shared';
import { api } from '../../api/endpoints';
import { AnimalFace } from '../common/AnimalFace';
import { errorMessage } from '../errors';

export const STATUS_LABELS: Record<AdminMember['status'], string> = {
  pending: '승인 대기',
  approved: '승인',
  rejected: '거절',
};

type Mode = 'view' | 'rename' | 'password' | 'delete';

interface MemberRowProps {
  member: AdminMember;
  onUpdated: (member: AdminMember) => void;
  onDeleted: (id: string) => void;
}

/**
 * 멤버 표의 한 줄. 이름 변경·비밀번호 초기화·삭제는 그 줄 안에서 펼쳐
 * 확인 버튼을 한 번 더 누르게 한다(브라우저 confirm 대신).
 */
export function MemberRow({ member, onUpdated, onDeleted }: MemberRowProps) {
  const [mode, setMode] = useState<Mode>('view');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const start = (next: Mode) => {
    setMode(next);
    setValue(next === 'rename' ? member.username : '');
    setError(null);
    setNotice(null);
  };

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setMode('view');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = () => {
    if (mode === 'rename') {
      const parsed = UsernameSchema.safeParse(value);
      if (!parsed.success) return setError(parsed.error.issues[0]!.message);
      return run(async () => onUpdated(await api.adminPatch(member.id, { username: parsed.data })));
    }
    if (mode === 'password') {
      const parsed = PasswordSchema.safeParse(value);
      if (!parsed.success) return setError(parsed.error.issues[0]!.message);
      return run(async () => {
        onUpdated(await api.adminPatch(member.id, { newPassword: parsed.data }));
        setNotice('새 비밀번호로 바꿨어요. 본인에게 알려 주세요.');
      });
    }
    if (mode === 'delete') {
      return run(async () => {
        await api.adminDelete(member.id);
        onDeleted(member.id);
      });
    }
  };

  return (
    <tr>
      <td>
        <AnimalFace look={member.look} size={30} />
      </td>
      <td className="adm-name">{member.username}</td>
      <td>
        <span className={`adm-status adm-status--${member.status}`}>
          {STATUS_LABELS[member.status]}
        </span>
      </td>
      <td>{member.scheduleCount}</td>
      <td>{kstDate(member.createdAt)}</td>
      <td className="adm-actions">
        {mode === 'view' ? (
          <div className="ui-row">
            <button type="button" className="ui-btn ui-btn--small" onClick={() => start('rename')}>
              이름 변경
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--small"
              onClick={() => start('password')}
            >
              비밀번호 초기화
            </button>
            <button type="button" className="ui-btn ui-btn--small" onClick={() => start('delete')}>
              삭제
            </button>
          </div>
        ) : (
          <div className="ui-row">
            {mode === 'delete' ? (
              <span className="adm-confirm">{member.username}님을 정말 삭제할까요?</span>
            ) : (
              <input
                className="ui-input adm-input"
                aria-label={mode === 'rename' ? '새 이름' : '새 비밀번호'}
                type={mode === 'password' ? 'password' : 'text'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoFocus
              />
            )}
            <button
              type="button"
              className={
                mode === 'delete'
                  ? 'ui-btn ui-btn--small ui-btn--danger'
                  : 'ui-btn ui-btn--small ui-btn--primary'
              }
              disabled={busy}
              onClick={() => void confirm()}
            >
              {mode === 'delete' ? '삭제 확인' : '확인'}
            </button>
            <button type="button" className="ui-btn ui-btn--small" onClick={() => start('view')}>
              취소
            </button>
          </div>
        )}
        {error && (
          <p className="ui-field__error" role="alert">
            {error}
          </p>
        )}
        {notice && <p className="ui-note">{notice}</p>}
      </td>
    </tr>
  );
}
