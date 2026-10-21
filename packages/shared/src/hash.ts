/** FNV-1a 32비트 해시. 같은 문자열이면 어느 브라우저·서버에서든 같은 값이 나온다. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** 0 이상 1 미만의 결정적 난수. 인자를 '|'로 이어 해시한다. */
export function rand01(...parts: (string | number)[]): number {
  return hashString(parts.join('|')) / 0x100000000;
}
