import { z } from 'zod';

/**
 * 말풍선 채팅. DB에는 남기지 않는다: 서버는 확인·가리기 뒤 모두에게 전하고, 최근 CHAT_HISTORY_MAX개만 메모리에 둔다.
 * 한 말풍선은 CHAT_MAX자(이모지는 한 글자)까지, 멤버당 1초에 1번 (SOCKET_LIMITS.chatPerSec).
 */
export const CHAT_MAX = 30;

/** 서버가 메모리에 들고 있다가 새로 들어온 사람에게 주는 최근 채팅 수 (DB에는 남기지 않는다) */
export const CHAT_HISTORY_MAX = 100;

/** 보낼 때. 넉넉히 받고 길이는 서버가 cleanChat으로 다시 본다 */
export const ChatRequestSchema = z.object({ text: z.string().max(200) });
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/** 받을 때 */
export interface ChatEvent {
  memberId: string;
  text: string;
  /** 서버 시각 epoch ms */
  at: number;
}

/** 줄바꿈·연속 공백을 한 칸으로, 앞뒤 공백을 지운다. 비었거나 CHAT_MAX자를 넘으면 null */
export function cleanChat(raw: string): string | null {
  const text = raw.replace(/\s+/g, ' ').trim();
  const length = Array.from(text).length;
  return length === 0 || length > CHAT_MAX ? null : text;
}

/** 흔한 욕설 (글자 사이에 공백·기호를 넣어도 잡는다) */
const BAD_WORDS = [
  '씨발',
  '시발',
  '씨빨',
  '씨바',
  'ㅆㅂ',
  'ㅅㅂ',
  '병신',
  'ㅂㅅ',
  '개새끼',
  '개새',
  '좆',
  '존나',
  '지랄',
  'ㅈㄹ',
  '미친놈',
  '미친년',
  '썅',
  '느금',
  '니애미',
  '엿먹어',
  'fuck',
  'shit',
  'bitch',
];

/** 욕설과 겹치지만 평범한 말 */
const ALLOWED = ['시발점', '시발역', '시발택시'];

/** 글자 사이의 공백·기호 */
const GAP = '[\\s\\p{P}\\p{S}]*';
const escape = (c: string) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BAD_RE = new RegExp(
  BAD_WORDS.map((w) => Array.from(w).map(escape).join(GAP)).join('|'),
  'giu',
);

/** 욕설을 같은 길이의 *로 가린다 */
export function maskProfanity(text: string): string {
  // 평범한 말은 잠깐 자리표시(사용자 영역 문자)로 바꿔 두었다가 되돌린다
  const kept: string[] = [];
  let safe = text;
  for (const word of ALLOWED) {
    safe = safe.split(word).join(String.fromCodePoint(0xe000 + kept.length));
    kept.push(word);
  }
  const masked = safe.replace(BAD_RE, (m) => '*'.repeat(Array.from(m).length));
  return kept.reduce((s, word, i) => s.split(String.fromCodePoint(0xe000 + i)).join(word), masked);
}
