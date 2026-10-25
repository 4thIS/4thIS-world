/**
 * 원색 에셋을 파스텔로 바꾸는 순수 함수 (설계 문서 §5.4).
 * 채도를 35% 낮추고(밝기 쪽으로 당기기) 크림빛 (255, 238, 245)과 50% 섞는다.
 */

export const PASTEL_DESATURATE = 0.35;
export const PASTEL_MIX = 0.5;
export const PASTEL_CREAM = [255, 238, 245] as const;

export type Rgb = [r: number, g: number, b: number];

/** 0~255 RGB → 파스텔 RGB (소수 포함, 0~255) */
export function pastelRgb(r: number, g: number, b: number): Rgb {
  const l = 0.299 * r + 0.587 * g + 0.114 * b;
  const dr = r + (l - r) * PASTEL_DESATURATE;
  const dg = g + (l - g) * PASTEL_DESATURATE;
  const db = b + (l - b) * PASTEL_DESATURATE;
  return [
    dr + (PASTEL_CREAM[0] - dr) * PASTEL_MIX,
    dg + (PASTEL_CREAM[1] - dg) * PASTEL_MIX,
    db + (PASTEL_CREAM[2] - db) * PASTEL_MIX,
  ];
}

/** RGBA 픽셀 배열(캔버스 ImageData.data)을 그 자리에서 파스텔로 바꾼다. 알파는 그대로 둔다 */
export function pastelizePixels(data: Uint8ClampedArray): void {
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = pastelRgb(data[i]!, data[i + 1]!, data[i + 2]!);
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }
}

const toHex2 = (v: number) =>
  Math.round(Math.min(255, Math.max(0, v)))
    .toString(16)
    .padStart(2, '0');

/** '#rrggbb' → 파스텔 '#rrggbb'. Kenney 모델처럼 재질 색만 있는 경우에 쓴다 */
export function pastelHex(hex: string): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  const [r, g, b] = pastelRgb((n >> 16) & 255, (n >> 8) & 255, n & 255);
  return `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
}

/** 두 '#rrggbb' 색을 t(0~1)로 섞는다 */
export function mixHex(a: string, b: string, t: number): string {
  const na = Number.parseInt(a.replace('#', ''), 16);
  const nb = Number.parseInt(b.replace('#', ''), 16);
  const ch = (shift: number) => {
    const va = (na >> shift) & 255;
    const vb = (nb >> shift) & 255;
    return toHex2(va + (vb - va) * t);
  };
  return `#${ch(16)}${ch(8)}${ch(0)}`;
}
