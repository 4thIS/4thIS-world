import { create } from 'zustand';
import {
  ADMIN_ID,
  ADMIN_NAME,
  CAMPUS,
  DAY_MS,
  computeDay,
  kstDate,
  kstMidnight,
  type BuildingId,
  type DayPlan,
  type PublicMember,
  type WorldResponse,
} from '@4this/shared';
import { api } from '../api/endpoints';

/**
 * 월드 상태: 승인 멤버, 서버 시계, 오늘 DayPlan, 카메라 포커스.
 * 매 프레임 쓰는 값(plan, now)은 getState()로 읽어 React 렌더를 일으키지 않는다.
 */
export interface WorldState {
  members: PublicMember[];
  loaded: boolean;
  error: string | null;
  /** 시계: now = base + (Date.now() - realBase) * speed. 서버 시각으로 맞춘다 */
  clock: { base: number; realBase: number; speed: number };
  plan: DayPlan | null;
  /** plan이 유효한 마지막 순간 (다음 KST 자정) */
  planUntil: number;
  focusedBuilding: BuildingId | null;
  hiddenAboveFloor: number | null;
  /** 카메라가 따라가는 멤버 (접속자 목록 클릭·내 조종) */
  focusedMember: string | null;
  /** goHome()마다 1씩 오른다. 카메라가 보고 처음 시야로 돌아간다 */
  homeNonce: number;

  /** GET /api/world를 불러 멤버·시계·계획을 갱신한다 */
  load: () => Promise<void>;
  /** 응답(또는 개발용 픽스처)을 그대로 넣는다 */
  setWorld: (world: WorldResponse) => void;
  /** 서버 시각으로 시계를 다시 맞춘다 (소켓 time 이벤트) */
  syncClock: (serverTime: number) => void;
  /** 개발용: 시계를 start부터 speed배로 돌린다 */
  setClock: (start: number, speed: number) => void;
  /** 지금 시각 (서버 기준 epoch ms) */
  now: () => number;
  /** 지금 날짜의 계획. 날짜가 바뀌었으면 다시 계산한다 */
  ensurePlan: () => DayPlan;
  focusBuilding: (id: BuildingId | null) => void;
  setHiddenAboveFloor: (floor: number | null) => void;
  focusMember: (id: string | null) => void;
  /** 포커스를 모두 풀고 카메라를 처음 시야(캠퍼스 전체)로 돌린다 */
  goHome: () => void;
}

export const useWorld = create<WorldState>()((set, get) => ({
  members: [],
  loaded: false,
  error: null,
  clock: { base: Date.now(), realBase: Date.now(), speed: 1 },
  plan: null,
  planUntil: 0,
  focusedBuilding: null,
  hiddenAboveFloor: null,
  focusedMember: null,
  homeNonce: 0,

  load: async () => {
    try {
      get().setWorld(await api.world());
    } catch {
      set({ error: '월드 정보를 불러오지 못했습니다', loaded: true });
    }
  },

  setWorld: (world) => {
    const realBase = Date.now();
    // 관리자 캐릭터는 시간표 없는 가상 멤버로 붙인다 (위치는 sampleAt이 광장 중앙으로 돌려준다)
    const admin = world.admin
      ? [{ id: ADMIN_ID, username: ADMIN_NAME, look: world.admin.look, schedules: [] }]
      : [];
    set((s) => ({
      members: [...world.members, ...admin],
      loaded: true,
      error: null,
      clock: { base: world.serverTime, realBase, speed: s.clock.speed },
      plan: null,
      planUntil: 0,
    }));
    get().ensurePlan();
  },

  syncClock: (serverTime) => set({ clock: { base: serverTime, realBase: Date.now(), speed: 1 } }),

  setClock: (start, speed) => set({ clock: { base: start, realBase: Date.now(), speed } }),

  now: () => {
    const { base, realBase, speed } = get().clock;
    return base + (Date.now() - realBase) * speed;
  },

  ensurePlan: () => {
    const s = get();
    const t = s.now();
    if (s.plan && t < s.planUntil && t >= s.planUntil - DAY_MS) return s.plan;
    const date = kstDate(t);
    const plan = computeDay({ members: s.members, date, campus: CAMPUS });
    set({ plan, planUntil: kstMidnight(date) + DAY_MS });
    return plan;
  },

  focusBuilding: (id) => set({ focusedBuilding: id, hiddenAboveFloor: null, focusedMember: null }),
  setHiddenAboveFloor: (floor) => set({ hiddenAboveFloor: floor }),
  focusMember: (id) =>
    set({ focusedMember: id, focusedBuilding: id ? null : get().focusedBuilding }),
  goHome: () =>
    set((s) => ({
      focusedBuilding: null,
      focusedMember: null,
      hiddenAboveFloor: null,
      homeNonce: s.homeNonce + 1,
    })),
}));

/** 지금 시각 (서버 기준). 컴포넌트 밖에서도 쓸 수 있다 */
export const worldNow = () => useWorld.getState().now();
