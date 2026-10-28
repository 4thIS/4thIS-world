import type { ControlButtonProps } from '../contracts';

/** 내 캐릭터 직접 조종 시작 / 자동으로 돌아가기 */
export function ControlButton({ controlling, disabled, onStart, onStop }: ControlButtonProps) {
  return controlling ? (
    <button type="button" className="ui-btn ov-control" disabled={disabled} onClick={onStop}>
      🤖 자동으로
    </button>
  ) : (
    <button
      type="button"
      className="ui-btn ui-btn--primary ov-control"
      disabled={disabled}
      onClick={onStart}
    >
      🎮 조종하기
    </button>
  );
}
