import { resolveColor } from '@4this/shared';
import type { CharacterLook } from '../../world/contracts';
import { ANIMAL_LABELS } from '../../world/characters/labels';

const INK = '#4a3a45';

/** 동물별 귀·부리·갈기 (얼굴 뒤에 깔리는 것과 앞에 붙는 것) */
function Back({ look, fur }: { look: CharacterLook; fur: string }) {
  switch (look.animal) {
    case 'dog':
      return (
        <>
          <ellipse cx="7" cy="17" rx="5" ry="9" fill={fur} style={{ filter: 'brightness(0.85)' }} />
          <ellipse
            cx="33"
            cy="17"
            rx="5"
            ry="9"
            fill={fur}
            style={{ filter: 'brightness(0.85)' }}
          />
        </>
      );
    case 'cat':
      return (
        <>
          <path d="M8 14 L10 2 L18 9 Z" fill={fur} />
          <path d="M32 14 L30 2 L22 9 Z" fill={fur} />
        </>
      );
    case 'bear':
      return (
        <>
          <circle cx="9" cy="9" r="5" fill={fur} />
          <circle cx="31" cy="9" r="5" fill={fur} />
        </>
      );
    case 'lion':
      return (
        <circle cx="20" cy="21" r="19" fill="#e8a35f" stroke="#e8a35f" strokeDasharray="3 2" />
      );
    case 'duck':
      return null;
  }
}

/** 접속자 목록·관리자 표에 쓰는 작은 동물 얼굴 (SVG, 3D 아님) */
export function AnimalFace({ look, size = 28 }: { look: CharacterLook; size?: number }) {
  const fur = resolveColor(look.animal, look.color);
  return (
    <svg
      className="ui-face"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label={ANIMAL_LABELS[look.animal]}
    >
      <Back look={look} fur={fur} />
      <circle cx="20" cy="22" r="14" fill={fur} />
      <circle cx="15" cy="21" r="1.8" fill={INK} />
      <circle cx="25" cy="21" r="1.8" fill={INK} />
      <circle cx="12" cy="26" r="2.2" fill="#ffb3c7" opacity="0.8" />
      <circle cx="28" cy="26" r="2.2" fill="#ffb3c7" opacity="0.8" />
      {look.animal === 'duck' ? (
        <ellipse cx="20" cy="27" rx="5" ry="2.5" fill="#ffb37a" />
      ) : (
        <ellipse cx="20" cy="26" rx="1.8" ry="1.3" fill={look.animal === 'cat' ? '#ff9fb6' : INK} />
      )}
      {look.eyes !== 'none' && (
        <g
          fill={look.eyes === 'sunglasses' ? '#4f4766' : 'none'}
          stroke={look.eyes === 'sunglasses' ? '#4f4766' : '#9b86c9'}
          strokeWidth="1.2"
        >
          <circle cx="15" cy="21" r="3.6" />
          <circle cx="25" cy="21" r="3.6" />
        </g>
      )}
    </svg>
  );
}
