import { useEffect, useRef, useState } from 'react';
import { EMOJIS } from '@4this/shared';
import type { EmoteBarProps } from '../contracts';

/**
 * 채팅 바 오른쪽 이모지 버튼 (설계 문서 §6.3). 누르면 위로 이모지 8개가 펼쳐지고,
 * 고르면 보내고 닫힌다. 바깥을 누르거나 Esc면 닫힌다.
 */
export function EmoteBar({ disabled, onEmote }: EmoteBarProps) {
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
        <div className="ov-emoji__pop ui-card" role="group" aria-label="이모지 반응">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="ov-emote"
              onClick={() => {
                onEmote(emoji);
                setOpen(false);
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        className="ov-emoji__toggle ui-card"
        aria-label="이모지"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        😊
      </button>
    </div>
  );
}
