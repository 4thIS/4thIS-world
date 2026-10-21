/** FNV-1a 32비트 해시. 같은 문자열이면 어느 브라우저·서버에서든 같은 값이 나온다. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * murmur3 fmix32. FNV-1a는 끝 글자만 다른 입력('…|41', '…|42')의 해시가 규칙적으로 늘어서서
 * 그대로 쓰면 난수가 한쪽으로 몰린다. 이 함수로 한 번 섞으면 고르게 흩어진다.
 */
export function mix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** 0 이상 1 미만의 결정적 난수. 인자를 '|'로 이어 해시하고 섞는다. */
export function rand01(...parts: (string | number)[]): number {
  return mix32(hashString(parts.join('|'))) / 0x100000000;
}
