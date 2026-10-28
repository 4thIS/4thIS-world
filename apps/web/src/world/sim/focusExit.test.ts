import { describe, expect, it } from 'vitest';
import { isTap, shouldClearOnEscape, shouldClearOnMiss, type FocusExitState } from './focusExit';

const base: FocusExitState = {
  focusedBuilding: 'eng',
  focusedMember: null,
  modalOpen: false,
  controlling: false,
};

describe('shouldClearOnEscape', () => {
  it('건물이나 캐릭터에 포커스가 있으면 푼다', () => {
    expect(shouldClearOnEscape(base)).toBe(true);
    expect(shouldClearOnEscape({ ...base, focusedBuilding: null, focusedMember: 'm1' })).toBe(true);
  });

  it('포커스가 없으면 할 일이 없다', () => {
    expect(shouldClearOnEscape({ ...base, focusedBuilding: null })).toBe(false);
  });

  it('모달이 열려 있으면 모달 닫기가 먼저다', () => {
    expect(shouldClearOnEscape({ ...base, modalOpen: true })).toBe(false);
  });

  it('조종 중에는 카메라가 나를 따라가야 하므로 풀지 않는다', () => {
    expect(shouldClearOnEscape({ ...base, focusedMember: 'me', controlling: true })).toBe(false);
  });
});

describe('isTap', () => {
  it('제자리에서 누르고 떼면 클릭', () => {
    expect(isTap({ x: 100, y: 100 }, { x: 103, y: 98 })).toBe(true);
  });

  it('끌어서 카메라를 돌렸으면 클릭이 아니다', () => {
    expect(isTap({ x: 100, y: 100 }, { x: 180, y: 120 })).toBe(false);
  });

  it('누른 곳을 모르면 클릭으로 보지 않는다', () => {
    expect(isTap(null, { x: 0, y: 0 })).toBe(false);
  });
});

describe('shouldClearOnMiss', () => {
  it('빈 곳을 클릭하면 푼다', () => {
    expect(shouldClearOnMiss(base, true)).toBe(true);
  });

  it('끌기였거나 조종 중이면 풀지 않는다 (조종 중 바닥 클릭은 이동)', () => {
    expect(shouldClearOnMiss(base, false)).toBe(false);
    expect(shouldClearOnMiss({ ...base, controlling: true }, true)).toBe(false);
  });

  it('포커스가 없으면 할 일이 없다', () => {
    expect(shouldClearOnMiss({ ...base, focusedBuilding: null }, true)).toBe(false);
  });
});
