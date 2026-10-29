import { useEffect, useRef } from 'react';
import { useRealtime } from '../../store/realtime';
import { useWorld } from '../../store/world';
import { useUi } from '../../ui/store';

export interface FocusExitState {
  focusedBuilding: string | null;
  focusedMember: string | null;
  /** 로그인·꾸미기 같은 모달이 열려 있는가 (Esc는 모달 닫기가 먼저) */
  modalOpen: boolean;
  /** 내 캐릭터를 조종 중인가 (카메라가 나를 따라가야 하고, 바닥 클릭은 이동이다) */
  controlling: boolean;
}

export interface Point {
  x: number;
  y: number;
}

/** 이만큼(px) 안에서 눌렀다 뗐으면 끌기(카메라 회전)가 아니라 클릭이다 */
export const TAP_SLOP = 6;

const focused = (s: FocusExitState) => s.focusedBuilding !== null || s.focusedMember !== null;

/** Esc로 건물 포커스·캐릭터 따라가기를 풀어야 하는가 */
export function shouldClearOnEscape(s: FocusExitState): boolean {
  return focused(s) && !s.modalOpen && !s.controlling;
}

/** 누른 곳과 뗀 곳이 가까우면 클릭(탭), 멀면 카메라를 돌린 끌기 */
export function isTap(down: Point | null, up: Point, slop = TAP_SLOP): boolean {
  return down !== null && Math.hypot(up.x - down.x, up.y - down.y) <= slop;
}

/** 건물·캐릭터가 아닌 빈 곳을 클릭했을 때 포커스를 풀어야 하는가 */
export function shouldClearOnMiss(s: FocusExitState, tap: boolean): boolean {
  return tap && focused(s) && !s.controlling;
}

function currentState(): FocusExitState {
  const w = useWorld.getState();
  return {
    focusedBuilding: w.focusedBuilding,
    focusedMember: w.focusedMember,
    modalOpen: useUi.getState().screen !== null,
    controlling: useRealtime.getState().controlling,
  };
}

/** 건물 포커스와 캐릭터 따라가기를 모두 풀고 처음 시야(캠퍼스 전체)로 돌아간다 */
function clearFocus() {
  useWorld.getState().goHome();
}

/**
 * 포커스에서 빠져나오는 두 가지 방법: Esc 키, 빈 곳 클릭.
 * 돌려준 핸들러를 <Canvas>의 onPointerDown·onPointerMissed에 단다.
 */
export function useFocusExit() {
  const down = useRef<Point | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (shouldClearOnEscape(currentState())) clearFocus();
    };
    // 캡처 단계에서 먼저 본다: 모달이 Esc로 닫히기 전 상태로 판단해야 모달과 포커스가 한 번에 같이 닫히지 않는다
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  return {
    onPointerDown: (e: { clientX: number; clientY: number }) => {
      down.current = { x: e.clientX, y: e.clientY };
    },
    onPointerMissed: (e: MouseEvent) => {
      if (e.type !== 'click') return;
      const tap = isTap(down.current, { x: e.clientX, y: e.clientY });
      if (shouldClearOnMiss(currentState(), tap)) clearFocus();
    },
  };
}
