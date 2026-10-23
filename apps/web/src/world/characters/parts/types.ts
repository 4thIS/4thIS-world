import type { JSX } from 'react';
import type { CharacterColors } from '../colors';

export interface PartProps {
  colors: CharacterColors;
}

/** 동물 한 종의 부품. 좌표는 몸 단위 */
export interface AnimalParts {
  /** 귀·주둥이·코·부리·수염·갈기. 머리 중심 기준 */
  Face: (props: PartProps) => JSX.Element;
  /** 꼬리 피벗(엉덩이 뒤) 기준. Character가 이 피벗을 좌우로 흔든다 */
  Tail: (props: PartProps) => JSX.Element;
  /** 어깨 피벗 기준, 아래로 늘어진 팔 하나 */
  Arm: (props: PartProps) => JSX.Element;
  footColor: (colors: CharacterColors) => string;
}
