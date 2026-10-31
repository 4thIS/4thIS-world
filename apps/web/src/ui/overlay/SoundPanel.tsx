import { useEffect, useRef } from 'react';
import type { SoundChannel } from '../contracts';

const ROWS: { ch: SoundChannel; icon: string; label: string }[] = [
  { ch: 'music', icon: '🎵', label: '배경음악' },
  { ch: 'sfx', icon: '💥', label: '효과음' },
  { ch: 'voice', icon: '🗣️', label: '목소리' },
];

interface Props {
  soundOn: boolean;
  onToggleSound: () => void;
  volumes: Record<SoundChannel, number>;
  onVolume: (ch: SoundChannel, v: number) => void;
  onClose: () => void;
}

/** 🔈을 누르면 열리는 소리 창: 전체 켜기/끄기 + 갈래별 크기. 바깥을 누르거나 Esc면 닫힌다 */
export function SoundPanel({ soundOn, onToggleSound, volumes, onVolume, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = ref.current;
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        // 🔈 버튼은 스스로 열고 닫는다
        if (e.target instanceof Element && e.target.closest('.ov-topbar__sound')) return;
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div ref={ref} className="ov-sound ui-card" role="dialog" aria-label="소리">
      <label className="ov-sound__row ov-sound__all">
        <span>🔈 전체</span>
        <input type="checkbox" role="switch" checked={soundOn} onChange={onToggleSound} />
      </label>
      {ROWS.map(({ ch, icon, label }) => {
        // 배경음악은 음원을 정하기 전까지 준비 중
        const ready = ch !== 'music';
        return (
          <label key={ch} className="ov-sound__row" aria-disabled={!ready || !soundOn}>
            <span>
              {icon} {label}
              {!ready && <small> 준비 중</small>}
            </span>
            <input
              type="range"
              aria-label={`${label} 크기`}
              min={0}
              max={100}
              disabled={!ready || !soundOn}
              value={Math.round(volumes[ch] * 100)}
              onChange={(e) => onVolume(ch, Number(e.target.value) / 100)}
            />
          </label>
        );
      })}
    </div>
  );
}
