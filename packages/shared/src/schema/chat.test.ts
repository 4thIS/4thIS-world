import { describe, expect, it } from 'vitest';
import { CHAT_MAX, ChatRequestSchema, cleanChat, maskProfanity } from './chat';

describe('cleanChat', () => {
  it('앞뒤 공백·줄바꿈을 정리하고 연속 공백을 하나로', () => {
    expect(cleanChat('  안녕\n  하세요  ')).toBe('안녕 하세요');
  });

  it('비었거나 30자를 넘으면 null', () => {
    expect(cleanChat('   ')).toBeNull();
    expect(cleanChat('가'.repeat(CHAT_MAX))).toBe('가'.repeat(CHAT_MAX));
    expect(cleanChat('가'.repeat(CHAT_MAX + 1))).toBeNull();
  });

  it('이모지는 한 글자로 센다', () => {
    expect(cleanChat('👋'.repeat(CHAT_MAX))).not.toBeNull();
  });
});

describe('maskProfanity', () => {
  it('흔한 욕설을 같은 길이의 *로 가린다', () => {
    expect(maskProfanity('아 씨발 진짜')).toBe('아 ** 진짜');
    expect(maskProfanity('병신같네')).toBe('**같네');
    expect(maskProfanity('fuck you')).toBe('**** you');
  });

  it('사이에 기호·공백을 넣어도 가린다', () => {
    expect(maskProfanity('씨.발')).toBe('***');
    expect(maskProfanity('시 발')).toBe('***');
  });

  it('평범한 말은 그대로', () => {
    expect(maskProfanity('시발점에서 출발')).toBe('시발점에서 출발');
    expect(maskProfanity('오늘 점심 뭐 먹지?')).toBe('오늘 점심 뭐 먹지?');
  });
});

describe('ChatRequestSchema', () => {
  it('문자열 text만 받는다 (길이 검사는 서버의 cleanChat)', () => {
    expect(ChatRequestSchema.safeParse({ text: '안녕' }).success).toBe(true);
    expect(ChatRequestSchema.safeParse({ text: 3 }).success).toBe(false);
    expect(ChatRequestSchema.safeParse({ text: 'x'.repeat(500) }).success).toBe(false);
  });
});
