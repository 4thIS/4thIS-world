import { useEffect, useRef, useState } from 'react';
import { MOTIONS, type Motion } from '@4this/shared';
import type { MotionBarProps } from '../contracts';

/** 모션 버튼 판에 보이는 그림과 이름 */
export const MOTION_LABELS: Record<Motion, { icon: string; name: string }> = {
  cheer: { icon: '🙌', name: '만세' },
  wave: { icon: '👋', name: '손 흔들기' },
  lie: { icon: '😴', name: '눕기' },
  firework: { icon: '🎆', name: '폭죽' },
  dance: { icon: '💃', name: '춤' },
  bow: { icon: '🙇', name: '인사' },
  jump: { icon: '🤸', name: '점프' },
  clap: { icon: '👏', name: '박수' },
};

/**
 * 이모지 버튼 오른쪽 모션 버튼. 누르면 위로 모션 8개가 펼쳐지고, 고르면 모두에게 보이게 하고 닫힌다.
 * 눕기는 다른 행동을 할 때까지 계속한다. 바깥을 누르거나 Esc면 닫힌다.
 */
export function MotionBar({ disabled, onMotion }: MotionBarProps) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', outside);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', outside);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={root} className="ov-emoji">
      {open && !disabled && (
        <div className="ov-emoji__pop ov-motion__pop ui-card" role="group" aria-label="모션">
          {MOTIONS.map((kind) => (
            <button
              key={kind}
              type="button"
              className="ov-motion"
              aria-label={MOTION_LABELS[kind].name}
              title={MOTION_LABELS[kind].name}
              onClick={() => {
                onMotion(kind);
                setOpen(false);
              }}
            >
              <span aria-hidden="true">{MOTION_LABELS[kind].icon}</span>
              <small>{MOTION_LABELS[kind].name}</small>
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="ov-emoji__toggle ui-card"
        aria-label="모션"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        🕺
      </button>
    </div>
  );
}
