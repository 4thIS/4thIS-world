import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CHAT_MAX } from '@4this/shared';
import type { ChatInputProps } from '../contracts';
import { useUi } from '../store';

/** 다른 입력칸에 쓰는 중인가 (버튼에 포커스가 있어도 Enter는 채팅으로 간다: 방금 누른 이모지가 또 가지 않게) */
function typingElsewhere(target: EventTarget | null, mine: HTMLInputElement | null): boolean {
  return (
    target instanceof HTMLElement &&
    target !== mine &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/**
 * 말풍선 채팅 입력칸 (이모지 바 옆). 아무 데서나 Enter를 누르면 여기로 오고,
 * Enter로 보내고 Esc로 비우고 빠져나간다. 한글 조합 중 Enter는 무시한다.
 * children은 입력칸 오른쪽 끝(채팅 기록 ▲)에 붙는다.
 */
export function ChatInput({
  disabled,
  onSend,
  children,
}: ChatInputProps & { children?: ReactNode }) {
  const [text, setText] = useState('');
  const [shake, setShake] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing || disabled) return;
      if (useUi.getState().screen !== null || typingElsewhere(e.target, ref.current)) return;
      if (document.activeElement === ref.current) return;
      e.preventDefault();
      ref.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [disabled]);

  const send = () => {
    const result = onSend(text);
    if (result === 'sent') setText('');
    else if (result === 'tooFast') {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  };

  const left = CHAT_MAX - Array.from(text).length;
  return (
    <div className="ov-chat ui-card">
      <input
        ref={ref}
        className={shake ? 'ov-chat__input ov-chat__input--shake' : 'ov-chat__input'}
        aria-label="말풍선 채팅"
        placeholder="한마디… Enter"
        maxLength={CHAT_MAX}
        disabled={disabled}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (e.key === 'Enter') {
            e.preventDefault();
            send();
          } else if (e.key === 'Escape') {
            setText('');
            ref.current?.blur();
          }
        }}
      />
      {text && <small className="ov-chat__left">{left}</small>}
      {children}
    </div>
  );
}
