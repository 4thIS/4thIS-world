import { KIND_INFO, WEEKDAY_LABELS } from '@4this/shared';
import { useWorld } from '../../store/world';
import { Modal } from '../common/Modal';
import { MOBILE_QUERY, useMediaQuery } from '../common/useMediaQuery';
import type { ScheduleOwner } from '../store';
import { useUi } from '../store';
import { sortedEntries } from './grid';
import { KindLegend } from './KindLegend';
import { WeekGrid } from './WeekGrid';

const NONE = new Set<number>();

/** 다른 사람 시간표 보기 (로그인한 멤버). 고칠 수 없다. 월드에 있는 시간표를 그대로 보여 준다 */
export function ScheduleViewer({ owner }: { owner: ScheduleOwner }) {
  const close = useUi((s) => s.close);
  const mobile = useMediaQuery(MOBILE_QUERY);
  const items = useWorld((s) => s.members.find((m) => m.id === owner.id)?.schedules) ?? [];

  return (
    <Modal title={`${owner.username}의 시간표`} onClose={close} wide>
      <div className="ui-form">
        <KindLegend />
        {items.length === 0 ? (
          <p className="ui-note">아직 시간표가 없어요.</p>
        ) : mobile ? (
          <ul className="sch-list">
            {sortedEntries(items).map(([i, item]) => (
              <li key={i} className="sch-list__item">
                <span className="sch-dot" style={{ background: KIND_INFO[item.kind].color }} />
                <span className="sch-list__text">
                  {WEEKDAY_LABELS[item.day]} {item.start}~{item.end} · {KIND_INFO[item.kind].label}
                  {item.title ? ` · ${item.title}` : ''}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <WeekGrid
            items={items}
            overlaps={NONE}
            selected={null}
            kind="lecture1"
            onChange={() => {}}
            onSelect={() => {}}
            readOnly
          />
        )}
      </div>
    </Modal>
  );
}
