import {
  PLACE_IDS,
  WEEKDAY_LABELS,
  fromMinutes,
  kstDate,
  kstMinutes,
  kstWeekday,
  rand01,
  type Animal,
  type Campus,
  type PlaceId,
  type Pose,
} from '@4this/shared';

/** 상단 시계 '수 14:10' (KST) */
export function formatClock(t: number): string {
  return `${WEEKDAY_LABELS[kstWeekday(t)]} ${fromMinutes(kstMinutes(t))}`;
}

/** 하늘 아이콘: 06–09 아침, 09–17 낮, 17–19 노을, 19–06 밤 (§5.5) */
export function skyIconAt(t: number): string {
  const h = kstMinutes(t) / 60;
  if (h >= 6 && h < 9) return '🌅';
  if (h >= 9 && h < 17) return '☀️';
  if (h >= 17 && h < 19) return '🌇';
  return '🌙';
}

export const ANIMAL_ICON: Record<Animal | 'lion', string> = {
  dog: '🐶',
  cat: '🐱',
  bear: '🐻',
  duck: '🦆',
  lion: '🦁',
};

const PLACES: ReadonlySet<string> = new Set(PLACE_IDS);

/** "누가 어디 있나" 한 줄 (WebGL 미지원 목록) */
export function describeWhere(pose: Pose | null, campus: Campus): string {
  if (!pose) return '캠퍼스 밖';
  if (PLACES.has(pose.placeId)) {
    const b = campus.buildings[campus.places[pose.placeId as PlaceId].building];
    const where = b.floors > 1 ? `${b.name} ${pose.floor}층` : b.name;
    return `${where} · ${pose.status}`;
  }
  switch (pose.placeId) {
    case 'park':
      return `공원 · ${pose.status}`;
    case 'plaza':
      // 관리자 캐릭터 자리. 이름표 문구도 "광장"이라 한 번만 쓴다
      return '광장';
    case 'door':
      return `건물 앞 · ${pose.status}`;
    case 'gate':
      return `정문 · ${pose.status}`;
    default:
      return `이동 중 · ${pose.status}`;
  }
}

/** 사자 교수님 말풍선 문구 (§6.4) */
export const PROFESSOR_LINES = [
  '오늘도 연구 열심히!',
  '논문은 잘 되어 가나?',
  '커피 한 잔 하고 하게나.',
  '질문은 언제든 환영이야.',
  '실험 결과 기대하고 있네!',
] as const;

/** 클릭할 때마다 바뀌는 한 줄. 같은 날·같은 횟수면 모두에게 같은 문구 */
export function professorLine(t: number, clicks: number): string {
  return PROFESSOR_LINES[
    Math.floor(rand01('professor', kstDate(t), clicks) * PROFESSOR_LINES.length)
  ]!;
}
