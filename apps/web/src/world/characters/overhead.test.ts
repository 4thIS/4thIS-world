import { describe, expect, it } from 'vitest';
import {
  EMOTE_DURATION_MS,
  emoteFrame,
  LABEL_FULL_DIST,
  LABEL_NAME_DIST,
  labelMode,
  labelText,
} from './overhead';

describe('labelMode', () => {
  it('가까우면 전체, 중간이면 이름만, 멀면 숨김', () => {
    expect(labelMode(5)).toBe('full');
    expect(labelMode(LABEL_FULL_DIST - 0.01)).toBe('full');
    expect(labelMode(LABEL_FULL_DIST)).toBe('name');
    expect(labelMode(LABEL_NAME_DIST - 0.01)).toBe('name');
    expect(labelMode(LABEL_NAME_DIST)).toBe('hidden');
  });
});

describe('labelText', () => {
  it('모드에 따라 문구를 줄인다', () => {
    expect(labelText('철수', '2학년 강의', 'full')).toBe('철수 · 2학년 강의');
    expect(labelText('철수', '2학년 강의', 'name')).toBe('철수');
    expect(labelText('철수', '2학년 강의', 'hidden')).toBeNull();
    expect(labelText('철수', undefined, 'full')).toBe('철수');
    expect(labelText(undefined, '공강', 'full')).toBeNull();
  });
});

describe('emoteFrame', () => {
  it('튀어나왔다가 1배로 돌아온다', () => {
    expect(emoteFrame(0)?.scale).toBe(0);
    expect(emoteFrame(200)?.scale).toBeCloseTo(1.2);
    expect(emoteFrame(1000)?.scale).toBe(1);
    expect(emoteFrame(1000)?.rise).toBe(12);
  });

  it('마지막 0.4초에 흐려지고 3초 뒤 사라진다', () => {
    expect(emoteFrame(2000)?.opacity).toBe(1);
    expect(emoteFrame(2800)?.opacity).toBeCloseTo(0.5);
    expect(emoteFrame(EMOTE_DURATION_MS)).toBeNull();
    expect(emoteFrame(-50)?.scale).toBe(0);
  });
});
