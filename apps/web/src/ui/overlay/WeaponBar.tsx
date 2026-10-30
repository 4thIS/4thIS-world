import { useEffect } from 'react';
import type { Weapon } from '@4this/shared';
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

/** 장난감 쏘기 (조종 중·관리자가 켰을 때만 보인다). 관리자가 고른 장난감 하나를 버튼이나 F 키로 쏜다 */
export function WeaponBar({ weapon, onFire }: WeaponBarProps) {
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

  const { icon, name } = WEAPON_LABELS[weapon];
  return (
    <button
      type="button"
      className="ov-weapon ui-card"
      aria-label={`${name} 쏘기`}
      title={`${name} 쏘기 (F)`}
      onClick={onFire}
    >
      {icon}
    </button>
  );
}
