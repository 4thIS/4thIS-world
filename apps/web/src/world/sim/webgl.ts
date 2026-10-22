/** 브라우저가 WebGL을 쓸 수 있는지. 안 되면 텍스트 목록으로 대신한다 (§10) */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
