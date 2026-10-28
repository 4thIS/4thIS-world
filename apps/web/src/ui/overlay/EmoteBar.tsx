import { EMOJIS } from '@4this/shared';
import type { EmoteBarProps } from '../contracts';

/** 이모지 반응 8개 (설계 문서 §6.3) */
export function EmoteBar({ disabled, onEmote }: EmoteBarProps) {
  return (
    <div className="ov-emotes ui-card" role="group" aria-label="이모지 반응">
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="ov-emote"
          disabled={disabled}
          onClick={() => onEmote(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
