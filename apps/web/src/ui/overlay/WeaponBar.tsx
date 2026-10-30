import { useEffect } from 'react';
import { WEAPONS, type Weapon } from '@4this/shared';
import type { WeaponBarProps } from '../contracts';
import { useUi } from '../store';

export const WEAPON_LABELS: Record<Weapon, { icon: string; name: string }> = {
  water: { icon: '💦', name: '물총' },
  snow: { icon: '❄️', name: '눈덩이' },
  ray: { icon: '✨', name: '광선총' },
};

/** 입력칸에 쓰는 중인가 */
function typing(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

/**
 * 장난감 쏘기 (조종 중·관리자가 켰을 때만 보인다). 그림을 누르면 그걸로 골라 바로 쏜다.
 * F 키는 마지막으로 고른 장난감으로 쏜다.
 */
export function WeaponBar({ weapon, onPick, onFire }: WeaponBarProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyF' || e.repeat || typing(e.target)) return;
      if (useUi.getState().screen !== null) return;
      e.preventDefault();
      onFire();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFire]);

  return (
    <div className="ov-weapons ui-card" role="group" aria-label="장난감 쏘기 (F)">
      {WEAPONS.map((w) => (
        <button
          key={w}
          type="button"
          className="ov-weapon"
          aria-pressed={weapon === w}
          aria-label={`${WEAPON_LABELS[w].name} 쏘기`}
          title={`${WEAPON_LABELS[w].name} 쏘기 (F)`}
          onClick={() => {
            onPick(w);
            onFire();
          }}
        >
          {WEAPON_LABELS[w].icon}
        </button>
      ))}
    </div>
  );
}
