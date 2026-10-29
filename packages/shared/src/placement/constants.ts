/** placement 규칙의 숫자들 (설계 문서 §7). 시간은 분 단위 */

/** 걷는 속도 1.5 m/s를 분당 거리로 */
export const WALK_SPEED_MPS = 1.5;
export const WALK_M_PER_MIN = WALK_SPEED_MPS * 60;

/** 건물·정문 출입 페이드 (나갈 때, 들어올 때 각각) */
export const FADE_MS = 300;
export const FADE_MIN = FADE_MS / 60_000;

/** 첫 캠퍼스 일정 몇 분 전에 정문에 나타나나 */
export const ARRIVE_EARLY_MIN = 5;
/** 빈 시간이 이보다 짧으면 다음 건물 입구에서 기다린다 */
export const SHORT_GAP_MIN = 20;
/** 점심 시간대와 최대 길이 */
export const LUNCH_START_MIN = 11 * 60 + 30;
export const LUNCH_END_MIN = 13 * 60 + 30;
export const LUNCH_MAX_MIN = 60;
/** 이보다 짧은 빈 시간 조각은 이웃 조각에 붙인다 */
export const MIN_PIECE_MIN = 10;
/** 공원 산책 칸 길이 */
export const PARK_SLOT_MIN = 2;
/** 산책 지점 대신 벤치·연못가에 앉을 확률 (3번 중 1번) */
export const PARK_SIT_CHANCE = 1 / 3;
/** 기숙사생: 이 시각(분)부터 다음 날 WAKE_MIN까지 자기 침대에서 잔다 */
export const SLEEP_START_MIN = 23 * 60;
export const WAKE_MIN = 7 * 60;
/** 기숙사생의 자유 시간 장소(휴게실·공원·카페)를 바꾸는 칸 길이 */
export const DORM_SLOT_MIN = 90;
/** 건물 앞에서 기다릴 때 문 노드에서 떨어지는 거리 (겹치지 않게) */
export const WAIT_SPREAD_M = 0.8;
