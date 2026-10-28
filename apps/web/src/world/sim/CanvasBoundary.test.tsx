import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CanvasBoundary } from './CanvasBoundary';

vi.mock('./TextFallback', () => ({ TextFallback: () => <p>텍스트 목록</p> }));

afterEach(cleanup);

function Boom(): never {
  throw new Error('WebGL context could not be created');
}

describe('CanvasBoundary', () => {
  it('3D가 실패하면 텍스트 목록으로 대신한다', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <CanvasBoundary>
        <Boom />
      </CanvasBoundary>,
    );
    expect(screen.getByText('텍스트 목록')).toBeTruthy();
    err.mockRestore();
  });

  it('실패하지 않으면 그대로 그린다', () => {
    render(
      <CanvasBoundary>
        <p>캠퍼스</p>
      </CanvasBoundary>,
    );
    expect(screen.getByText('캠퍼스')).toBeTruthy();
  });
});
