import { CAMPUS } from '@4this/shared';
import type { BuildingPanelProps, OverlayProps } from '../ui/contracts';
import { formatClock, skyIconAt } from '../world/sim/labels';
import { peopleIn, snapshotAt } from '../world/sim/occupancy';
import { useNow } from './clock';
import { useWorld } from './world';

const noop = () => {};

/**
 * 오버레이에 넣을 실시간 데이터와 핸들러. th의 UiRoot가 부른다.
 * cw#3: 상단 시계·하늘 아이콘, 건물 패널. cw#4에서 접속자·조종·이모지·게시판·연결 상태를 채운다.
 */
export function useOverlayProps(): OverlayProps {
  const t = useNow(1000);
  const members = useWorld((s) => s.members);
  const plan = useWorld((s) => s.plan);
  const focusedBuilding = useWorld((s) => s.focusedBuilding);
  const hiddenAboveFloor = useWorld((s) => s.hiddenAboveFloor);
  const focusBuilding = useWorld((s) => s.focusBuilding);
  const setHiddenAboveFloor = useWorld((s) => s.setHiddenAboveFloor);

  let building: BuildingPanelProps | null = null;
  if (focusedBuilding) {
    const b = CAMPUS.buildings[focusedBuilding];
    building = {
      building: focusedBuilding,
      name: b.name,
      floors: b.floors,
      hiddenAboveFloor,
      onFloor: setHiddenAboveFloor,
      people: plan ? peopleIn(snapshotAt(plan, members, t, CAMPUS), focusedBuilding, CAMPUS) : [],
      onClose: () => focusBuilding(null),
    };
  }

  return {
    topBar: { clock: formatClock(t), skyIcon: skyIconAt(t) },
    presence: { entries: [], spectators: 0, collapsed: false, onToggle: noop, onSelect: noop },
    emoteBar: { disabled: true, onEmote: noop },
    control: { controlling: false, disabled: true, onStart: noop, onStop: noop },
    connection: { state: 'connected' },
    board: null,
    building,
    canControl: false,
  };
}
