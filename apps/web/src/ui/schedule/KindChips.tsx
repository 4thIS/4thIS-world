import type { CSSProperties } from 'react';
import { KIND_INFO, KINDS, type Kind } from '@4this/shared';

/** 일정 종류 색 칩. 색과 이름은 shared의 KIND_INFO를 그대로 쓴다 */
export function KindChips({ value, onChange }: { value: Kind; onChange: (kind: Kind) => void }) {
  return (
    <fieldset className="ui-chips">
      <legend>종류</legend>
      {KINDS.map((k) => (
        <button
          key={k}
          type="button"
          className="ui-chip sch-kind"
          aria-pressed={value === k}
          style={{ '--kind': KIND_INFO[k].color } as CSSProperties}
          onClick={() => onChange(k)}
        >
          {KIND_INFO[k].label}
        </button>
      ))}
    </fieldset>
  );
}
