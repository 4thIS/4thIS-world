import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LookPreview } from './LookPreview';

// jsdom에는 WebGL이 없다. WebGL이 없는 브라우저와 같은 경우로 고정한다
vi.mock('../../world/sim/webgl', () => ({ hasWebGL: () => false }));
// 3D 쪽은 그리지 않으므로 불러오지도 않는다 (R3F의 CJS 경고를 피한다)
vi.mock('@react-three/fiber', () => ({ Canvas: () => null, useFrame: () => {} }));
vi.mock('../../world/characters/Character', () => ({ Character: () => null }));

afterEach(cleanup);

describe('LookPreview', () => {
  it('WebGL이 없으면 3D 대신 동물 이모지와 안내를 보여 준다 (설계 문서 §10)', () => {
    const { container } = render(
      <LookPreview
        look={{ animal: 'cat', color: 'mint', head: 'none', eyes: 'none', neck: 'none' }}
      />,
    );
    expect(container.querySelector('canvas')).toBeNull();
    expect(screen.getByText('🐱')).toBeTruthy();
    expect(screen.getByText('3D 미리보기를 표시할 수 없어요')).toBeTruthy();
  });
});
