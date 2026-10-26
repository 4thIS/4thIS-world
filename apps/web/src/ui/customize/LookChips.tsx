import { ANIMALS, COLOR_KEYS, EYES, HEADS, NECKS, resolveColor, type Look } from '@4this/shared';
import {
  ANIMAL_EMOJI,
  ANIMAL_LABELS,
  COLOR_LABELS,
  EYES_LABELS,
  HEAD_LABELS,
  NECK_LABELS,
} from '../../world/characters/labels';

interface ChipGroupProps<K extends string> {
  legend: string;
  keys: readonly K[];
  value: K;
  label: (k: K) => string;
  onChange: (k: K) => void;
}

function ChipGroup<K extends string>({ legend, keys, value, label, onChange }: ChipGroupProps<K>) {
  return (
    <fieldset className="ui-chips">
      <legend>{legend}</legend>
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          className="ui-chip"
          aria-pressed={value === k}
          onClick={() => onChange(k)}
        >
          {label(k)}
        </button>
      ))}
    </fieldset>
  );
}

/** 동물·색·머리·눈·목 칩. 값은 shared 상수에서 만든다 */
export function LookChips({ look, onChange }: { look: Look; onChange: (look: Look) => void }) {
  return (
    <div className="ui-form">
      <ChipGroup
        legend="동물"
        keys={ANIMALS}
        value={look.animal}
        label={(a) => `${ANIMAL_EMOJI[a]} ${ANIMAL_LABELS[a]}`}
        onChange={(animal) => onChange({ ...look, animal })}
      />
      <fieldset className="ui-chips">
        <legend>색</legend>
        {COLOR_KEYS.map((c) => (
          <button
            key={c}
            type="button"
            className="ui-swatch"
            aria-label={COLOR_LABELS[c]}
            title={COLOR_LABELS[c]}
            aria-pressed={look.color === c}
            style={{ background: resolveColor(look.animal, c) }}
            onClick={() => onChange({ ...look, color: c })}
          />
        ))}
      </fieldset>
      <ChipGroup
        legend="머리"
        keys={HEADS}
        value={look.head}
        label={(k) => HEAD_LABELS[k]}
        onChange={(head) => onChange({ ...look, head })}
      />
      <ChipGroup
        legend="눈"
        keys={EYES}
        value={look.eyes}
        label={(k) => EYES_LABELS[k]}
        onChange={(eyes) => onChange({ ...look, eyes })}
      />
      <ChipGroup
        legend="목"
        keys={NECKS}
        value={look.neck}
        label={(k) => NECK_LABELS[k]}
        onChange={(neck) => onChange({ ...look, neck })}
      />
    </div>
  );
}
