import { describe, expect, it } from 'vitest';
import { CAMPUS } from '../campus/data';
import { facingOf, nearestNode, pathLength, shortestPath } from './graph';
import { LINE_CAMPUS } from './test-fixtures';

describe('shortestPath', () => {
  it('직선 그래프는 지나는 노드를 모두 거친다', () => {
    expect(shortestPath(LINE_CAMPUS, 'gate', 'park')).toEqual([
      'gate',
      'eng-door',
      'main-door',
      'lab-door',
      'cafe-door',
      'park',
    ]);
    expect(shortestPath(LINE_CAMPUS, 'lab-door', 'eng-door')).toEqual([
      'lab-door',
      'main-door',
      'eng-door',
    ]);
    expect(shortestPath(LINE_CAMPUS, 'gate', 'gate')).toEqual(['gate']);
  });

  it('실제 캠퍼스에서 가장 짧은 길을 고른다', () => {
    expect(shortestPath(CAMPUS, 'gate', 'eng-door')).toEqual([
      'gate',
      'south',
      'plaza',
      'plaza-e',
      'eng-door',
    ]);
    expect(shortestPath(CAMPUS, 'gate', 'cafe-door')).toEqual(['gate', 'south', 'sw', 'cafe-door']);
  });

  it('결과를 캐시한다 (같은 배열을 돌려준다)', () => {
    expect(shortestPath(CAMPUS, 'gate', 'lab-door')).toBe(shortestPath(CAMPUS, 'gate', 'lab-door'));
  });
});

describe('기하 유틸', () => {
  it('pathLength는 꺾은선 길이', () => {
    expect(
      pathLength([
        [0, 0],
        [3, 4],
        [3, 10],
      ]),
    ).toBe(11);
    expect(pathLength([[1, 1]])).toBe(0);
  });

  it('nearestNode는 가장 가까운 노드', () => {
    expect(nearestNode(CAMPUS, [1, 21])).toBe('gate');
    expect(nearestNode(LINE_CAMPUS, [40, 5])).toBe('lab-door');
  });

  it('facingOf: +z는 0, +x는 π/2', () => {
    expect(facingOf([0, 0], [0, 1])).toBe(0);
    expect(facingOf([0, 0], [1, 0])).toBeCloseTo(Math.PI / 2);
    expect(Math.abs(facingOf([0, 0], [0, -1]))).toBeCloseTo(Math.PI);
  });
});
