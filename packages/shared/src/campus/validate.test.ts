import { describe, expect, it } from 'vitest';
import { CAMPUS } from './data';
import type { Campus } from './types';
import { validateCampus } from './validate';

describe('validateCampus', () => {
  it('기본 캠퍼스 데이터는 문제가 없다', () => {
    expect(validateCampus(CAMPUS)).toEqual([]);
  });

  it('끊긴 노드와 모자란 좌석을 잡아낸다', () => {
    const broken: Campus = {
      ...CAMPUS,
      graph: { ...CAMPUS.graph, nodes: { ...CAMPUS.graph.nodes, island: [1, 1] } },
      places: { ...CAMPUS.places, cafe: { ...CAMPUS.places.cafe, seats: [] } },
    };
    const errors = validateCampus(broken);
    expect(errors).toContain('노드 island: 정문에서 닿지 않음');
    expect(errors).toContain('cafe: 좌석 0개 < 8');
  });
});
