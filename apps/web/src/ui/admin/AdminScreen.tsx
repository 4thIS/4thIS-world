import { useEffect, useState } from 'react';
import { kstDate, type AdminMember } from '@4this/shared';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { AnimalFace } from '../common/AnimalFace';
import { Modal } from '../common/Modal';
import { errorMessage } from '../errors';
import { useUi } from '../store';
import { MemberRow } from './MemberRow';
import './admin.css';

/** 관리자 화면: 승인 대기(배지)·멤버 관리·백업 (설계 문서 §9) */
export function AdminScreen() {
  const isAdmin = useSession((s) => s.session.kind === 'admin');
  const close = useUi((s) => s.close);
  const [members, setMembers] = useState<AdminMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let alive = true;
    api
      .adminMembers()
      .then((res) => alive && setMembers(res.members))
      .catch((err: unknown) => alive && setError(errorMessage(err)));
    return () => {
      alive = false;
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Modal title="관리자" onClose={close}>
        <p className="ui-note">관리자로 로그인해야 볼 수 있어요.</p>
      </Modal>
    );
  }

  const replace = (m: AdminMember) =>
    setMembers((list) => list?.map((x) => (x.id === m.id ? m : x)) ?? null);
  const remove = (id: string) => setMembers((list) => list?.filter((x) => x.id !== id) ?? null);

  const decide = async (id: string, approve: boolean) => {
    setError(null);
    try {
      replace(await (approve ? api.adminApprove(id) : api.adminReject(id)));
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const pending = members?.filter((m) => m.status === 'pending') ?? [];

  return (
    <Modal title="관리자" onClose={close} wide>
      <div className="ui-form">
        <div className="ui-row ui-row--between">
          <h3 className="adm-title">
            승인 대기 <span className="adm-badge">{pending.length}</span>
          </h3>
          <a className="ui-btn ui-btn--small" href={api.backupUrl} download>
            💾 백업 다운로드
          </a>
        </div>
        {error && (
          <p className="ui-alert" role="alert">
            {error}
          </p>
        )}
        {members === null ? (
          !error && <p className="ui-note">불러오는 중…</p>
        ) : (
          <>
            {pending.length === 0 ? (
              <p className="ui-note">기다리는 가입이 없어요.</p>
            ) : (
              <ul className="adm-pending" aria-label="승인 대기 목록">
                {pending.map((m) => (
                  <li key={m.id} className="adm-pending__item">
                    <AnimalFace look={m.look} size={30} />
                    <b>{m.username}</b>
                    <small>{kstDate(m.createdAt)} 가입</small>
                    <span className="adm-spacer" />
                    <button
                      type="button"
                      className="ui-btn ui-btn--small ui-btn--primary"
                      onClick={() => void decide(m.id, true)}
                    >
                      승인
                    </button>
                    <button
                      type="button"
                      className="ui-btn ui-btn--small"
                      onClick={() => void decide(m.id, false)}
                    >
                      거절
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="adm-title">멤버 {members.length}</h3>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>생김새</th>
                    <th>이름</th>
                    <th>상태</th>
                    <th>일정</th>
                    <th>가입일</th>
                    <th>관리</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <MemberRow key={m.id} member={m} onUpdated={replace} onDeleted={remove} />
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
