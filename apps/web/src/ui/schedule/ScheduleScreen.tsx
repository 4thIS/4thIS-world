import { useEffect, useMemo, useState } from 'react';
import type { Kind, ScheduleItem } from '@4this/shared';
import { api } from '../../api/endpoints';
import { useSession } from '../../store/session';
import { Modal } from '../common/Modal';
import { MOBILE_QUERY, useMediaQuery } from '../common/useMediaQuery';
import { errorMessage } from '../errors';
import { useUi } from '../store';
import { BlockEditor } from './BlockEditor';
import { DormToggle } from './DormToggle';
import { cleanItems, overlapping } from './grid';
import { KindLegend } from './KindLegend';
import { ScheduleListEditor } from './ScheduleListEditor';
import { WeekGrid } from './WeekGrid';
import './schedule.css';

/** 끌어 만들 때 처음 종류 (일정 창에서 바꾼다) */
const NEW_KIND: Kind = 'lecture1';

type Status =
  { kind: 'loading' } | { kind: 'ready' } | { kind: 'saved' } | { kind: 'error'; message: string };

/** 내 시간표 편집 (설계 문서 §7.1, §9). 데스크톱은 주간 격자, 모바일은 목록 + 폼 */
export function ScheduleScreen() {
  const session = useSession((s) => s.session);
  const { onboarding, close } = useUi();
  const mobile = useMediaQuery(MOBILE_QUERY);
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  /** 겹쳐 뜨는 일정 창: 고치는 일정 번호와 방금 만든 것인지 */
  const [editing, setEditing] = useState<{ index: number; isNew: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  /** 저장이 끝날 때마다 늘려 목록 편집기를 새로 띄운다: 서버가 정렬해 돌려주면 편집 중 번호가 어긋난다 */
  const [saveCount, setSaveCount] = useState(0);
  /** 서버 시간표를 한 번이라도 불러왔는지. 실패한 채 저장하면 서버 목록을 덮어쓴다 */
  const [loaded, setLoaded] = useState(false);
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
        setLoaded(true);
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

  const save = async () => {
    setBusy(true);
    try {
      const res = await api.putMySchedules({ items: cleanItems(items) });
      setItems(res.items);
      setSaveCount((n) => n + 1);
      setSelected(null);
      setStatus({ kind: 'saved' });
      if (onboarding) close();
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="내 시간표" onClose={close} wide>
      <div className="ui-form">
        {onboarding && (
          <p className="ui-note">마지막 단계예요! 매주 반복되는 일정을 넣어 주세요.</p>
        )}
        <DormToggle />
        <KindLegend />
        {status.kind === 'loading' ? (
          <p className="ui-note">불러오는 중…</p>
        ) : mobile ? (
          <ScheduleListEditor
            key={saveCount}
            items={items}
            overlaps={overlaps}
            onChange={(next) => change(next, null)}
          />
        ) : (
          <>
            <p className="ui-note">
              빈 칸을 끌어 만들고, 블록을 끌어 옮기고, 위·아래 끝을 끌어 길이를 바꿔요. 블록을
              누르면 제목·시간·종류를 고칠 수 있어요.
            </p>
            <WeekGrid
              items={items}
              overlaps={overlaps}
              selected={selected}
              kind={NEW_KIND}
              onChange={change}
              onSelect={setSelected}
              onCreated={(index) => setEditing({ index, isNew: true })}
              onOpen={(index) => setEditing({ index, isNew: false })}
            />
            {editing && items[editing.index] && (
              <BlockEditor
                key={editing.index}
                item={items[editing.index]!}
                isNew={editing.isNew}
                onDone={(item) => {
                  change(items.map((it, i) => (i === editing.index ? item : it)));
                  setEditing(null);
                }}
                onDelete={() => {
                  change(
                    items.filter((_, i) => i !== editing.index),
                    null,
                  );
                  setEditing(null);
                }}
                onCancel={() => {
                  if (editing.isNew) {
                    change(
                      items.filter((_, i) => i !== editing.index),
                      null,
                    );
                  }
                  setEditing(null);
                }}
              />
            )}
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
            disabled={busy || !loaded || status.kind === 'loading' || overlaps.size > 0}
          >
            {busy ? '저장하는 중…' : '저장'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
