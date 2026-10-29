import { describe, expect, it } from 'vitest';
import { CAMPUS, FLOOR_HEIGHT } from '@4this/shared';
import {
  BUILDING_MARKER_LIFT,
  MEMBER_MARKER_HEIGHT,
  bobOffset,
  markerAnchor,
} from './markerAnchor';

describe('markerAnchor', () => {
  it('건물에 포커스하면 지붕 이름표 위', () => {
    const b = CAMPUS.buildings.eng;
    expect(markerAnchor('eng', null, CAMPUS)).toEqual({
      kind: 'building',
      position: [
        (b.min[0] + b.max[0]) / 2,
        b.floors * FLOOR_HEIGHT + BUILDING_MARKER_LIFT,
        (b.min[1] + b.max[1]) / 2,
      ],
    });
  });

  it('캐릭터에 포커스하면 그 캐릭터를 따라간다 (건물보다 먼저)', () => {
    expect(markerAnchor('eng', 'm1', CAMPUS)).toEqual({
      kind: 'member',
      memberId: 'm1',
      height: MEMBER_MARKER_HEIGHT,
    });
  });

  it('포커스가 없으면 표시하지 않는다', () => {
    expect(markerAnchor(null, null, CAMPUS)).toBeNull();
  });
});

describe('bobOffset', () => {
  it('위아래로 작게 둥둥 뜬다', () => {
    for (const t of [0, 0.3, 1, 2.7]) expect(Math.abs(bobOffset(t))).toBeLessThanOrEqual(0.2);
    expect(bobOffset(0)).not.toBe(bobOffset(0.5));
  });
});
