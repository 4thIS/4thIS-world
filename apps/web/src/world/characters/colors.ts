import { Color } from 'three';
import { resolveColor } from '@4this/shared';
import type { CharacterLook } from '../contracts';

/** 캐릭터 한 마리에 쓰는 색. 모두 '#rrggbb' */
export interface CharacterColors {
  /** 털 (몸·머리) */
  fur: string;
  /** 귀·발·꼬리처럼 조금 진한 부분 */
  dark: string;
  /** 주둥이 */
  muzzle: string;
  belly: string;
  /** 눈·코 */
  ink: string;
  nose: string;
  cheek: string;
  /** 귀 안쪽 */
  innerEar: string;
  /** 오리 부리·발 */
  beak: string;
  /** 사자 갈기 */
  mane: string;
}

const hex = (c: Color) => `#${c.getHexString()}`;

/** 생김새 → 부위별 색 (프로토타입 makeCharacter의 색 규칙) */
export function characterColors(look: CharacterLook): CharacterColors {
  const fur = resolveColor(look.animal, look.color);
  return {
    fur,
    dark: hex(new Color(fur).multiplyScalar(0.82)),
    muzzle: look.animal === 'cat' ? '#fffaf4' : hex(new Color(fur).lerp(new Color('#ffffff'), 0.5)),
    belly: '#fffaf4',
    ink: '#4a3a45',
    nose: look.animal === 'cat' ? '#ff9fb6' : '#4a3a45',
    cheek: '#ffb3c7',
    innerEar: look.animal === 'cat' ? '#ffc4d3' : '#f7d9c4',
    beak: '#ffb37a',
    mane: '#e8a35f',
  };
}
