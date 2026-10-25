import { createContext, useContext } from 'react';
import { MeshStandardMaterial } from 'three';

/**
 * 재질 캐시. 같은 색·종류·투명도 단계면 30마리가 재질 하나를 같이 쓴다.
 * 투명도는 0.1 단위 11단계로 묶는다(출입 페이드 0.3초 동안만 잠깐 쓰인다).
 */
export type MatKind = 'matte' | 'glossy' | 'glow' | 'blush';

const cache = new Map<string, MeshStandardMaterial>();

/** 0~1 → 0~10 */
export function opacityStep(opacity: number): number {
  return Math.round(Math.min(1, Math.max(0, opacity)) * 10);
}

export function getMaterial(color: string, step: number, kind: MatKind = 'matte') {
  const key = `${kind}|${color}|${step}`;
  let m = cache.get(key);
  if (!m) {
    const base = kind === 'blush' ? 0.75 : 1;
    const opacity = (step / 10) * base;
    m = new MeshStandardMaterial({
      color,
      roughness: kind === 'glossy' ? 0.35 : 0.8,
      emissive: kind === 'glow' ? '#ffffff' : '#000000',
      emissiveIntensity: kind === 'glow' ? 0.6 : 0,
      transparent: opacity < 1,
      opacity,
      // 반투명일 때 뒤쪽 면이 비쳐 지저분해지지 않게 깊이는 쓰지 않는다
      depthWrite: opacity >= 1,
    });
    cache.set(key, m);
  }
  return m;
}

/** Character가 자기 투명도 단계를 부품들에 내려 준다 */
export const OpacityStepContext = createContext(10);

/** 부품 컴포넌트용: 지금 캐릭터의 투명도 단계에 맞는 재질 */
export function useMat(color: string, kind: MatKind = 'matte') {
  return getMaterial(color, useContext(OpacityStepContext), kind);
}
