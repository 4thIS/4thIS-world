import { resolveColor } from '@4this/shared';
import type { CharacterProps } from '../contracts';

/**
 * 임시 캐릭터 (cw#1). th#1에서 동물 조립 캐릭터로 바꾼다. props 계약은 contracts.ts를 따른다.
 */
export function Character({ look, opacity = 1, onClick, ref }: CharacterProps) {
  return (
    <group ref={ref} onClick={onClick}>
      <mesh position={[0, 0.6, 0]} castShadow>
        <capsuleGeometry args={[0.35, 0.5, 4, 12]} />
        <meshStandardMaterial
          color={resolveColor(look.animal, look.color)}
          transparent={opacity < 1}
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}
