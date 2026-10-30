import { describe, expect, it } from 'vitest';
import { CHAT_DURATION_MS, chatFrame } from './chatTiming';

describe('chatFrame', () => {
  it('튀어나와 떠 있다가 마지막에 흐려지고, 3초가 지나면 null', () => {
    expect(chatFrame(0)!.scale).toBeLessThan(0.2);
    expect(chatFrame(1000)).toEqual({ scale: 1, opacity: 1 });
    expect(chatFrame(CHAT_DURATION_MS - 100)!.opacity).toBeLessThan(1);
    expect(chatFrame(CHAT_DURATION_MS)).toBeNull();
  });
});
