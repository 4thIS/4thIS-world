import { CanvasTexture, SRGBColorSpace } from 'three';

export interface LabelOptions {
  bg?: string;
  fg?: string;
  /** 캔버스 픽셀 크기 */
  width?: number;
  height?: number;
  fontSize?: number;
}

/**
 * 둥근 배경 + 가운데 글자가 그려진 CanvasTexture (간판·건물 이름표).
 * 한글 폰트 파일 없이 브라우저 기본 글꼴로 그린다.
 */
export function labelTexture(text: string, opts: LabelOptions = {}): CanvasTexture {
  const { bg = '#ffffff', fg = '#7a5b8c', width = 512, height = 128, fontSize = 64 } = opts;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const pad = 8;
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(pad, pad, width - pad * 2, height - pad * 2, (height - pad * 2) / 2);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.font = `bold ${fontSize}px "Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2 + 2);
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
