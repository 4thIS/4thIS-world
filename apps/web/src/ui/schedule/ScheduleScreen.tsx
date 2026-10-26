import { useEffect, useMemo, useState } from 'react';
import type { Kind, ScheduleItem } from '@4this/shared';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { Modal } from '../common/Modal';
import { MOBILE_QUERY, useMediaQuery } from '../common/useMediaQuery';
import { errorMessage } from '../errors';
import { useUi } from '../store';
import { cleanItems, overlapping } from './grid';
import { KindChips } from './KindChips';
import { ScheduleListEditor } from './ScheduleListEditor';
import { WeekGrid } from './WeekGrid';
import './schedule.css';

type Status =
  { kind: 'loading' } | { kind: 'ready' } | { kind: 'saved' } | { kind: 'error'; message: string };

/** 내 시간표 편집 (설계 문서 §7.1, §9). 데스크톱은 주간 격자, 모바일은 목록 + 폼 */
export function ScheduleScreen() {
  const session = useSession((s) => s.session);
  const { onboarding, close } = useUi();
  const mobile = useMediaQuery(MOBILE_QUERY);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [kind, setKind] = useState<Kind>('lecture1');
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [busy, setBusy] = useState(false);
  const overlaps = useMemo(() => overlapping(items), [items]);
  const isMember = session.kind === 'member';

  useEffect(() => {
    if (!isMember) return;
    let alive = true;
    api
      .mySchedules()
      .then((res) => {
        if (!alive) return;
        setItems(res.items);
        setStatus({ kind: 'ready' });
      })
      .catch((err: unknown) => {
        if (alive) setStatus({ kind: 'error', message: errorMessage(err) });
      });
    return () => {
      alive = false;
    };
  }, [isMember]);

  if (!isMember) {
    return (
      <Modal title="내 시간표" onClose={close}>
        <p className="ui-note">로그인한 멤버만 시간표를 만들 수 있어요.</p>
      </Modal>
    );
  }

  const change = (next: ScheduleItem[], nextSelected: number | null = selected) => {
    setItems(next);
    setSelected(nextSelected);
    if (status.kind === 'saved') setStatus({ kind: 'ready' });
  };

  const updateSelected = (patch: Partial<ScheduleItem>) => {
    if (selected === null) return;
    change(items.map((it, i) => (i === selected ? { ...it, ...patch } : it)));
  };

  const pickKind = (k: Kind) => {
    setKind(k);
    updateSelected({ kind: k });
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await api.putMySchedules({ items: cleanItems(items) });
      setItems(res.items);
      setSelected(null);
      setStatus({ kind: 'saved' });
      if (onboarding) close();
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const current = selected === null ? null : (items[selected] ?? null);

  return (
    <Modal title="내 시간표" onClose={close} wide>
      <div className="ui-form">
        {onboarding && (
          <p className="ui-note">마지막 단계예요! 매주 반복되는 일정을 넣어 주세요.</p>
        )}
        {status.kind === 'loading' ? (
          <p className="ui-note">불러오는 중…</p>
        ) : mobile ? (
          <ScheduleListEditor
            items={items}
            overlaps={overlaps}
            onChange={(next) => change(next, null)}
          />
        ) : (
          <>
            <p className="ui-note">
              빈 칸을 끌어 만들고, 블록을 끌어 옮기고, 위·아래 끝을 끌어 길이를 바꿔요.
            </p>
            <KindChips value={current?.kind ?? kind} onChange={pickKind} />
            <WeekGrid
              items={items}
              overlaps={overlaps}
              selected={selected}
              kind={kind}
              onChange={change}
              onSelect={setSelected}
            />
            {/* 선택이 없어도 자리를 지켜 모달 높이가 바뀌지 않게 한다 */}
            <div className="ui-row sch-selected">
              <label className="ui-field sch-selected__title">
                제목 (선택, 20자까지)
                <input
                  className="ui-input"
                  maxLength={20}
                  disabled={!current}
                  placeholder={current ? '예: 자료구조, 알바' : '블록을 누르면 제목을 쓸 수 있어요'}
                  value={current?.title ?? ''}
                  onChange={(e) => updateSelected({ title: e.target.value })}
                />
              </label>
              <button
                type="button"
                className="ui-btn"
                disabled={!current}
                onClick={() =>
                  change(
                    items.filter((_, i) => i !== selected),
                    null,
                  )
                }
              >
                일정 삭제
              </button>
            </div>
          </>
        )}
        {overlaps.size > 0 && (
          <p className="ui-alert" role="alert">
            겹치는 일정이 있어요. 빨간 일정을 옮기거나 줄여 주세요.
          </p>
        )}
        {status.kind === 'error' && (
          <p className="ui-alert" role="alert">
            {status.message}
          </p>
        )}
        <div className="ui-row ui-row--end">
          {status.kind === 'saved' && <span className="ui-note">저장했어요 ✨</span>}
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            onClick={save}
            disabled={busy || status.kind === 'loading' || overlaps.size > 0}
          >
            {busy ? '저장하는 중…' : '저장'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
