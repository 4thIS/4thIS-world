import { useShallow } from 'zustand/react/shallow';
import { ADMIN_ID, CAMPUS, boardAt, sampleAt } from '@4this/shared';
import type { BuildingPanelProps, OverlayProps, PresenceEntry } from '../ui/contracts';
import { formatClock, skyIconAt } from '../world/sim/labels';
import { peopleIn, snapshotAt } from '../world/sim/occupancy';
import { CONTROL_STATUS } from '../world/sim/remote';
import { useNow } from './clock';
import { myMemberId, useRealtime } from './realtime';
import { useSession } from './session';
import { weatherIcon, weatherLabel } from '../world/campus/weatherSky';
import { useSound } from './sound';
import { useWeather } from './weather';
import { useWorld } from './world';

/**
 * 오버레이에 넣을 실시간 데이터와 핸들러. th의 UiRoot가 부르고, th의 ui/overlay/* 컴포넌트에 나눠 준다.
 * 1초마다 다시 계산한다 (시계·이름표 문구).
 */
export function useOverlayProps(): OverlayProps {
  const t = useNow(1000);
  const members = useWorld((s) => s.members);
  const plan = useWorld((s) => s.plan);
  const focusedBuilding = useWorld((s) => s.focusedBuilding);
  const hiddenAboveFloor = useWorld((s) => s.hiddenAboveFloor);
  const goHome = useWorld((s) => s.goHome);
  const weather = useWeather((s) => s.now);
  const soundOn = useSound((s) => s.enabled);
  const toggleSound = useSound((s) => s.toggle);
  const focusMember = useWorld((s) => s.focusMember);
  const setHiddenAboveFloor = useWorld((s) => s.setHiddenAboveFloor);
  // 조종 중에는 local이 매 프레임 바뀌므로 필요한 값만 골라 구독한다
  const rt = useRealtime(
    useShallow((s) => ({
      connection: s.connection,
      everConnected: s.everConnected,
      presence: s.presence,
      presenceCollapsed: s.presenceCollapsed,
      controlling: s.controlling,
      boardOpen: s.boardOpen,
      togglePresence: s.togglePresence,
      sendEmote: s.sendEmote,
      startControl: s.startControl,
      stopControl: s.stopControl,
      closeBoard: s.closeBoard,
    })),
  );
  useSession((s) => s.session); // 로그인 상태가 바뀌면 다시 렌더
  const me = myMemberId();
  const online = rt.connection === 'connected';

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
      onClose: goHome,
    };
  }

  const byId = new Map(members.map((m) => [m.id, m]));
  const entries: PresenceEntry[] = [];
  for (const p of rt.presence.members) {
    const m = byId.get(p.id);
    if (!m) continue; // 방금 승인돼 아직 world를 다시 받지 않은 멤버
    const pose = plan ? sampleAt(plan, m.id, t) : null;
    entries.push({
      id: m.id,
      username: m.username,
      look: m.look,
      status: p.controlling ? CONTROL_STATUS : (pose?.status ?? '캠퍼스 밖'),
      controlling: p.controlling,
      isMe: m.id === me,
    });
  }
  // 나를 맨 위에, 나머지는 이름 순
  entries.sort((a, b) =>
    a.isMe !== b.isMe ? (a.isMe ? -1 : 1) : a.username < b.username ? -1 : 1,
  );

  // 접속하지 않은 멤버: 시간표상 지금 위치와 함께 이름 순 (관리자 캐릭터는 늘 광장이라 뺀다)
  const onlineIds = new Set(rt.presence.members.map((p) => p.id));
  const offline: PresenceEntry[] = members
    .filter((m) => !onlineIds.has(m.id) && m.id !== ADMIN_ID)
    .map((m) => ({
      id: m.id,
      username: m.username,
      look: m.look,
      status: (plan ? sampleAt(plan, m.id, t) : null)?.status ?? '캠퍼스 밖',
      controlling: false,
      isMe: m.id === me,
    }))
    .sort((a, b) => (a.username < b.username ? -1 : 1));

  return {
    topBar: {
      clock: formatClock(t),
      skyIcon: weatherIcon(weather, skyIconAt(t)),
      weatherLabel: weatherLabel(weather),
      soundOn,
      onToggleSound: toggleSound,
      onHome: goHome,
    },
    presence: {
      entries,
      offline,
      spectators: rt.presence.spectators,
      collapsed: rt.presenceCollapsed,
      onToggle: rt.togglePresence,
      onSelect: (id) => focusMember(id),
    },
    emoteBar: { disabled: !online || !me, onEmote: rt.sendEmote },
    chat: { disabled: !online || !me, onSend: useRealtime.getState().sendChat },
    control: {
      controlling: rt.controlling,
      disabled: !online || !me,
      onStart: rt.startControl,
      onStop: rt.stopControl,
    },
    // 첫 연결을 기다리는 동안은 끊긴 게 아니므로 배지를 띄우지 않는다 (조종·이모지는 online으로 막는다)
    connection: { state: rt.everConnected ? rt.connection : 'connected' },
    board: rt.boardOpen ? { entries: plan ? boardAt(plan, t) : [], onClose: rt.closeBoard } : null,
    building,
    canControl: me !== null,
  };
}
