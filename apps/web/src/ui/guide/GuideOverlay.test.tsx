import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScreenHost } from '../ScreenHost';
import { useUi } from '../store';

beforeEach(() => useUi.setState({ screen: 'guide', guideAfterClose: false }));
afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

const guide = () => screen.queryByRole('dialog', { name: '조작법' });

/** 가이드가 가리킬 실제 버튼들 (UiRoot 대신) */
function addTargets({ control }: { control: boolean }) {
  const html =
    '<button class="ov-topbar__home">🏠</button><div class="ov-presence__head"></div>' +
    (control ? '<button class="ov-control">🎮 조종하기</button>' : '');
  document.body.insertAdjacentHTML('beforeend', html);
}

describe('GuideOverlay', () => {
  it('마우스 조작 세 가지와 키보드 줄, 실제 버튼을 가리키는 말풍선', () => {
    addTargets({ control: true });
    render(<ScreenHost />);
    expect(guide()).toBeTruthy();
    expect(screen.getByText('왼쪽 드래그')).toBeTruthy();
    expect(screen.getByText('오른쪽 드래그')).toBeTruthy();
    expect(screen.getByText('휠')).toBeTruthy();
    expect(screen.getByText(/WASD/)).toBeTruthy();
    expect(screen.getByText('처음 시야로')).toBeTruthy();
    expect(screen.getByText('이름을 누르면 그 캐릭터로')).toBeTruthy();
    expect(screen.getByText('내 캐릭터 움직이기')).toBeTruthy();
  });

  it('조종 버튼이 없으면(구경꾼) 그 말풍선은 없다', () => {
    addTargets({ control: false });
    render(<ScreenHost />);
    expect(screen.queryByText('내 캐릭터 움직이기')).toBeNull();
  });

  it('터치 화면이면 손가락 조작을 보여 주고 키보드 줄은 뺀다', () => {
    vi.stubGlobal('matchMedia', (q: string) => ({
      matches: q === '(pointer: coarse)',
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(<ScreenHost />);
    expect(screen.getByText('한 손가락')).toBeTruthy();
    expect(screen.getByText('두 손가락')).toBeTruthy();
    expect(screen.queryByText(/WASD/)).toBeNull();
  });

  it('아무 곳이나 누르거나, 키를 누르거나, 휠을 굴리면 닫힌다', () => {
    const inputs = [
      () => fireEvent.pointerDown(window),
      () => fireEvent.keyDown(window, { key: 'w', code: 'KeyW' }),
      () => fireEvent.wheel(window),
    ];
    for (const input of inputs) {
      useUi.setState({ screen: 'guide' });
      const { unmount } = render(<ScreenHost />);
      input();
      expect(useUi.getState().screen).toBeNull();
      unmount();
    }
  });

  it('언제든 다시 열 수 있다 (상단 바 ❔)', () => {
    useUi.getState().close();
    useUi.getState().open('guide');
    render(<ScreenHost />);
    expect(guide()).toBeTruthy();
  });
});
