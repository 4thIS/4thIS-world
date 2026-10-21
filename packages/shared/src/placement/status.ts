import type { Kind } from '../schema/schedule';

/** 이름표 문구 (설계 문서 §7.1, §9) */
export const STATUS = {
  free: '공강',
  cafe: '카페 ☕',
  lunch: '점심 🍚',
  arriving: '등교 중',
  leaving: '하교 중',
  goingOut: '외출 중',
} as const;

const CLASS_LABEL: Record<Exclude<Kind, 'external'>, string> = {
  lecture1: '1학년 강의',
  lecture2: '2학년 강의',
  lecture3: '3학년 강의',
  liberal: '교양 강의',
  research: '연구 중',
  library: '도서관',
};

const WITH_TITLE: ReadonlySet<Kind> = new Set(['lecture1', 'lecture2', 'lecture3', 'liberal']);

/** 캠퍼스 일정의 이름표. 강의 계열은 제목을 붙인다: '2학년 강의 · 자료구조' */
export function classStatus(kind: Exclude<Kind, 'external'>, title?: string): string {
  const label = CLASS_LABEL[kind];
  return title && WITH_TITLE.has(kind) ? `${label} · ${title}` : label;
}

/** 외부 일정 게시판 제목. 제목이 없으면 '외부 일정' */
export function externalTitle(title?: string): string {
  return title ? title : '외부 일정';
}
